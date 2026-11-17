import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import type { BuildContext } from "../../../context/build";
import { createTransformer, type Transformer } from "@transformer";
import { expressionTransformers } from "../../expression";
import { goTypeOf } from "../../type/goTypeOf";
import { createFunctionValue } from "../application";

async function coalesceValue(
	value: GoAST.Expression,
	valueType: Type,
	site: TsAST.Node,
	context: BuildContext,
) {
	const checker = context.transpilation.typeChecker;

	if (await checker.isArrayType(valueType) || await checker.isTupleType(valueType)) {
		return context.success({ result: value });
	}

	const goType = await DCommon.asyncPipe(
		goTypeOf(valueType, site, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(goType)) {
		return goType;
	}

	return context.success({
		result: GoAST.createSliceLiteral({
			typeReference: GoAST.createSliceType({
				elementType: goType.result,
			}),
			elements: [value],
		}),
	});
}

async function getCallbackParameterType(
	site: TsAST.Expression,
	context: BuildContext,
) {
	const checker = context.transpilation.typeChecker;
	const contextualType = await checker.getContextualType(site);
	const functionType = contextualType ?? await checker.getTypeAtLocation(site);
	const [signature] = await functionType.getCallSignatures();

	if (!signature) {
		return context.error(site, "Could not resolve the callback signature for DArray.coalescing");
	}

	const [parameter] = await signature.getParameters();

	if (!parameter) {
		return context.error(site, "DArray.coalescing requires one callback parameter");
	}

	return checker.getTypeOfSymbolAtLocation(parameter, site);
}

export const coalescingExpressionHandler: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isCallExpression(node)) {
			if (!TsAST.isIdentifier(node) && !TsAST.isPropertyAccessExpression(node)) {
				return context.notSupport();
			}

			return createFunctionValue({
				site: node,
				context,
				body: async(parameters) => {
					const [parameter] = parameters;

					if (!parameter) {
						return context.error(node, "DArray.coalescing requires one callback parameter");
					}

					const parameterType = await getCallbackParameterType(node, context);

					if (DEither.isLeft(parameterType)) {
						return parameterType;
					}

					return coalesceValue(parameter, parameterType, node, context);
				},
			});
		}

		if (node.arguments.length !== 1) {
			return context.error(node, "DArray.coalescing requires exactly one non-spread argument");
		}

		const [argument] = node.arguments;

		if (!argument || TsAST.isSpreadElement(argument)) {
			return context.error(node, "DArray.coalescing requires exactly one non-spread argument");
		}

		const expression = await DCommon.asyncPipe(
			context.transform(argument, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(expression)) {
			return expression;
		}

		const argumentType = await context.transpilation.typeChecker.getTypeAtLocation(argument);
		const coalesced = await DCommon.asyncPipe(
			coalesceValue(expression.result, argumentType, argument, context),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(coalesced)) {
			return coalesced;
		}

		return context.success({
			before: expression.before,
			result: coalesced.result,
		});
	},
);
