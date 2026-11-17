import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type Transformer, type TransformationSuccess, type TransformationError, type NotfoundTransformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind, type Type } from "typescript/async";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { goTypeOf, type GoType } from "../../../type/goTypeOf";
import { coerceExpression } from "../coerce";
import { createFunctionValue, resolveExpectedFunctionSignature } from "../../application";

// DEither.whenIsRight(e, f) / whenIsRight(f) : inlinée dans les deux formes
// (ADR-3, PLAN_HACKATHON.md §0.5). La forme directe évalue e puis f, dans
// l'ordre ; la forme curryfiée délègue la construction du func literal à
// createFunctionValue (./application.ts) et réutilise le même corps inliné.

const isRightMethodIdentifier = GoAST.createIdentifier("IsRight");
const valueFieldIdentifier = GoAST.createIdentifier("Value");

async function resolveCallbackReturnType(
	callbackNode: TsAST.Node,
	context: BuildContext,
): Promise<Type | undefined> {
	const { typeChecker } = context.transpilation;
	const callbackType = await typeChecker.getTypeAtLocation(callbackNode);
	const signatures = await typeChecker.getSignaturesOfType(callbackType, SignatureKind.Call);

	const signature = DArray.first(signatures);

	return signature && typeChecker.getReturnTypeOfSignature(signature);
}

async function coerceToResultType(params: {
	expression: GoAST.Expression;
	from: Type;
	to: Type;
	site: TsAST.Node;
	context: BuildContext;
}): Promise<TransformationSuccess<GoAST.Expression> | TransformationError | NotfoundTransformer> {
	const { context, ...coerceParams } = params;
	const coerced = await coerceExpression(coerceParams, context);

	return DEither.hasInformation(coerced, "transformation-not-supported")
		? context.error(params.site, "duplojs-either-whenisright-unsupported-coercion")
		: coerced;
}

async function buildBranches(params: {
	eitherIdentifier: GoAST.Expression;
	eitherType: Type;
	callbackExpression: GoAST.Expression;
	callbackReturnType: Type;
	resultType: Type;
	resultGoType: GoType;
	site: TsAST.Node;
	context: BuildContext;
}): Promise<TransformationSuccess<GoAST.Expression> | TransformationError | NotfoundTransformer> {
	const {
		eitherIdentifier, eitherType, callbackExpression, callbackReturnType, resultType, resultGoType, site, context,
	} = params;

	const rightValue = GoAST.createCallExpression({
		callee: callbackExpression,
		arguments: [
			GoAST.createSelectorExpression({
				target: eitherIdentifier,
				identifier: valueFieldIdentifier,
			}),
		],
	});

	const coercedRight = await DCommon.asyncPipe(
		coerceToResultType({
			expression: rightValue,
			from: callbackReturnType,
			to: resultType,
			site,
			context,
		}),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(coercedRight)) {
		return coercedRight;
	}

	const coercedLeft = await DCommon.asyncPipe(
		coerceToResultType({
			expression: eitherIdentifier,
			from: eitherType,
			to: resultType,
			site,
			context,
		}),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(coercedLeft)) {
		return coercedLeft;
	}

	const resultIdentifier = context.generateIdentifier();

	return context.success({
		before: [
			GoAST.createVariableDeclarationZeroValue({
				identifier: resultIdentifier,
				typeReference: resultGoType,
			}),
			GoAST.createIfStatement({
				condition: GoAST.createCallExpression({
					callee: GoAST.createSelectorExpression({
						target: eitherIdentifier,
						identifier: isRightMethodIdentifier,
					}),
					arguments: [],
				}),
				body: GoAST.createBlockStatement({
					statements: [
						...coercedRight.before,
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([resultIdentifier]),
							values: DCommon.cast([coercedRight.result]),
						}),
					],
				}),
				elseBranch: GoAST.createBlockStatement({
					statements: [
						...coercedLeft.before,
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([resultIdentifier]),
							values: DCommon.cast([coercedLeft.result]),
						}),
					],
				}),
			}),
		],
		result: resultIdentifier,
	});
}

async function directWhenIsRightHandler(
	node: TsAST.CallExpression,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const eitherArgumentNode = DArray.first(node.arguments);
	const callbackArgumentNode = DArray.first(DArray.shift(node.arguments));

	if (!eitherArgumentNode || !callbackArgumentNode) {
		return context.error(node, "missing-whenisright-arguments");
	}

	// Ordre d'évaluation JS : e puis f (avant le if, avant tout appel).
	const eitherResult = await DCommon.asyncPipe(
		context.transform(eitherArgumentNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(eitherResult)) {
		return eitherResult;
	}

	const callbackResult = await DCommon.asyncPipe(
		context.transform(callbackArgumentNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(callbackResult)) {
		return callbackResult;
	}

	const { typeChecker } = context.transpilation;

	const callbackReturnType = await resolveCallbackReturnType(callbackArgumentNode, context);

	if (!callbackReturnType) {
		return context.error(callbackArgumentNode, "unable-to-resolve-whenisright-callback-return-type");
	}

	const resultType = await typeChecker.getTypeAtLocation(node);
	const resultGoType = await DCommon.asyncPipe(
		goTypeOf(resultType, node, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(resultGoType)) {
		return resultGoType;
	}

	// e est lu 3 fois (IsRight, Value, branche gauche) : une seule évaluation,
	// comme pour isRight/isLeft (../isRight/index.ts).
	const eitherIdentifier = context.generateIdentifier();
	const eitherBinding = GoAST.createShortVariableDeclarationStatement({
		identifier: eitherIdentifier,
		initializer: eitherResult.result,
	});

	const branches = await DCommon.asyncPipe(
		buildBranches({
			eitherIdentifier,
			eitherType: await typeChecker.getTypeAtLocation(eitherArgumentNode),
			callbackExpression: callbackResult.result,
			callbackReturnType,
			resultType,
			resultGoType: resultGoType.result,
			site: node,
			context,
		}),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(branches)) {
		return branches;
	}

	return context.success({
		before: [
			...eitherResult.before,
			eitherBinding,
			...callbackResult.before,
			...branches.before,
		],
		result: branches.result,
	});
}

async function curriedWhenIsRightHandler(
	node: TsAST.CallExpression,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const callbackArgumentNode = DArray.first(node.arguments);

	if (!callbackArgumentNode) {
		return context.error(node, "missing-whenisright-callback");
	}

	const callbackResult = await DCommon.asyncPipe(
		context.transform(callbackArgumentNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(callbackResult)) {
		return callbackResult;
	}

	if (!DArray.lengthEqual(callbackResult.before, 0)) {
		return context.error(callbackArgumentNode, "unsupported-before-on-whenisright-callback");
	}

	const callbackReturnType = await resolveCallbackReturnType(callbackArgumentNode, context);

	if (!callbackReturnType) {
		return context.error(callbackArgumentNode, "unable-to-resolve-whenisright-callback-return-type");
	}

	const expectedSignature = await resolveExpectedFunctionSignature(node, context);

	if (!expectedSignature) {
		return context.notSupport();
	}

	const { typeChecker } = context.transpilation;
	const eitherType = await typeChecker.getParameterType(expectedSignature, 0);

	return createFunctionValue({
		site: node,
		context,
		body: async(parameters) => {
			const eitherIdentifier = DArray.first(parameters);

			if (!eitherIdentifier) {
				return context.error(node, "missing-whenisright-function-value-parameter");
			}

			const returnType = await typeChecker.getReturnTypeOfSignature(expectedSignature);
			const resultGoType = await DCommon.asyncPipe(
				goTypeOf(returnType, node, context),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(resultGoType)) {
				return resultGoType;
			}

			return buildBranches({
				eitherIdentifier,
				eitherType,
				callbackExpression: callbackResult.result,
				callbackReturnType,
				resultType: returnType,
				resultGoType: resultGoType.result,
				site: node,
				context,
			});
		},
	});
}

export async function whenIsRightExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.notSupport();
	}

	if (DArray.lengthEqual(node.arguments, 2)) {
		return directWhenIsRightHandler(node, context);
	}

	if (DArray.lengthEqual(node.arguments, 1)) {
		return curriedWhenIsRightHandler(node, context);
	}

	return context.error(node, "duplojs-either-whenisright-one-or-two-arguments-only");
}
