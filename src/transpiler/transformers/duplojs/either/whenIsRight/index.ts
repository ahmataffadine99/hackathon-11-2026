import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { type Transformer, type TransformationSuccess, type TransformationError, type NotfoundTransformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind, type Type } from "typescript/async";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { typeTransformers } from "../../../type";
import { createFunctionValue, resolveExpectedFunctionSignature } from "../../application";
import { eitherTypeIdentifier } from "../sharedDependency";

// DEither.whenIsRight(e, f) / whenIsRight(f) : inlinée dans les deux formes
// (ADR-3, PLAN_HACKATHON.md §0.5). La forme directe évalue e puis f, dans
// l'ordre ; la forme curryfiée délègue la construction du func literal à
// createFunctionValue (./application.ts) et réutilise le même corps inliné.

const isRightMethodIdentifier = GoAST.createIdentifier("IsRight");
const valueFieldIdentifier = GoAST.createIdentifier("Value");

// Bouchon LOCAL en attendant goTypeOf (P4) : même recette que application.ts
// (typeToTypeNode puis typeTransformers.value), à retirer à son merge.
async function localGoTypeOf(
	type: Type,
	site: TsAST.Node,
	context: BuildContext,
) {
	const typeNode = await context.transpilation.typeChecker.typeToTypeNode(type, site);

	if (!typeNode) {
		return context.error(site, "unable-to-create-type-node-for-whenisright");
	}

	return context.transform(typeNode, typeTransformers.value);
}

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

function extractEitherValueGoType(type: GoAST.Type | GoAST.TypeReference) {
	if (
		DModeling.hasTagValue(type, "[node]type-reference-generic")
		&& DModeling.hasTagValue(type.typeReference, "[node]type-reference-package")
		&& type.typeReference.identifier === eitherTypeIdentifier
	) {
		return DArray.first(type.typeArguments);
	}

	return undefined;
}

// Bouchon LOCAL en attendant coerceExpression (P4, ADR-2) : ne couvre que
// l'identité (les deux côtés rendent le même Either[V]), seul cas qui ne
// dépend pas de EitherPlainOf/EitherRetype (pas encore implémentés). Toute
// union hétérogène (ex. 02, 03 : `Fail | readonly [number]`) reste donc
// documentée comme une limite de ce patch, pas silencieusement approximée.
async function coerceToResultType(params: {
	expression: GoAST.Expression;
	from: Type;
	to: GoAST.Type | GoAST.TypeReference;
	site: TsAST.Node;
	context: BuildContext;
}): Promise<TransformationSuccess<GoAST.Expression> | TransformationError | NotfoundTransformer> {
	const { expression, from, to, site, context } = params;

	const fromGoType = await DCommon.asyncPipe(
		localGoTypeOf(from, site, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(fromGoType)) {
		return fromGoType;
	}

	if (!DArray.lengthEqual(fromGoType.before, 0)) {
		return context.error(site, "unsupported-before-on-whenisright-coercion");
	}

	const fromValue = extractEitherValueGoType(fromGoType.result);
	const toValue = extractEitherValueGoType(to);

	if (fromValue && toValue && fromValue === toValue) {
		return context.success({ result: expression });
	}

	return context.error(site, "duplojs-either-whenisright-heterogeneous-union-not-supported");
}

async function buildBranches(params: {
	eitherIdentifier: GoAST.Expression;
	eitherType: Type;
	callbackExpression: GoAST.Expression;
	callbackReturnType: Type;
	resultGoType: GoAST.Type | GoAST.TypeReference;
	site: TsAST.Node;
	context: BuildContext;
}): Promise<TransformationSuccess<GoAST.Expression> | TransformationError | NotfoundTransformer> {
	const {
		eitherIdentifier, eitherType, callbackExpression, callbackReturnType, resultGoType, site, context,
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
			to: resultGoType,
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
			to: resultGoType,
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

	const resultGoType = await DCommon.asyncPipe(
		localGoTypeOf(await typeChecker.getTypeAtLocation(node), node, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(resultGoType)) {
		return resultGoType;
	}

	if (!DArray.lengthEqual(resultGoType.before, 0)) {
		return context.error(node, "unsupported-before-on-whenisright-result-type");
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
				localGoTypeOf(returnType, node, context),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(resultGoType)) {
				return resultGoType;
			}

			if (!DArray.lengthEqual(resultGoType.before, 0)) {
				return context.error(node, "unsupported-before-on-whenisright-result-type");
			}

			return buildBranches({
				eitherIdentifier,
				eitherType,
				callbackExpression: callbackResult.result,
				callbackReturnType,
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
