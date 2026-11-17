import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { createTransformer, type Transformer } from "@transformer";
import { expressionTransformers } from ".";
import { goTypeOf } from "../type/goTypeOf";

export const arrayLiteralTransformer: Transformer<GoAST.SliceLiteral> = createTransformer(
	async(node, context) => {
		if (!TsAST.isArrayLiteralExpression(node)) {
			return context.notSupport();
		}

		for (const element of node.elements) {
			if (TsAST.isSpreadElement(element) || TsAST.isOmittedExpression(element)) {
				return context.error(element, "Spread elements and omitted array elements are not supported");
			}
		}

		// Type ATTENDU d'abord (`const empty: number[] = []` : le littéral seul est
		// `never[]`), sinon le type propre du littéral.
		const { typeChecker } = context.transpilation;
		const contextualType = await typeChecker.getContextualType(node);
		const contextualGoType = contextualType && DEither.unwrapRight(await goTypeOf(contextualType, node, context));
		const type = contextualGoType && !DEither.isLeft(contextualGoType)
			&& DModeling.hasTagValue(contextualGoType.result, "[node][type]slice")
			? contextualGoType
			: await DCommon.asyncPipe(
				goTypeOf(await typeChecker.getTypeAtLocation(node), node, context),
				DEither.unwrapRight,
			);

		if (DEither.isLeft(type)) {
			return type;
		}

		if (!DModeling.hasTagValue(type.result, "[node][type]slice")) {
			return context.error(node, {
				expected: "slice type",
			});
		}

		const elements = await DCommon.asyncPipe(
			node.elements,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<{
					before: readonly GoAST.Statement[];
					elements: readonly GoAST.Expression[];
				}>({
					before: [],
					elements: [],
				}),
				async({ item, lastValue, next, exit }) => {
					const element = await DCommon.asyncPipe(
						context.transform(item, expressionTransformers.value),
						DEither.unwrapRight,
					);

					if (DEither.isLeft(element)) {
						return exit(element);
					}

					const assignment = GoAST.createShortVariableDeclarationStatement({
						identifier: context.generateIdentifier(),
						initializer: element.result,
					});

					return next({
						before: DArray.concat(
							lastValue.before,
							element.before,
							[assignment],
						),
						elements: DArray.push(lastValue.elements, assignment.identifier),
					});
				},
			),
		);

		if (DEither.isLeft(elements)) {
			return elements;
		}

		return context.success({
			before: elements.before,
			result: GoAST.createSliceLiteral({
				typeReference: type.result,
				elements: elements.elements,
			}),
		});
	},
);
