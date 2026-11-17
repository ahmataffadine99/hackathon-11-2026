import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { expressionTransformers } from ".";

const unaryOperators: Partial<
	Record<TsAST.SyntaxKind, GoAST.UnaryOperator>
> = {
	[TsAST.SyntaxKind.PlusToken]: "+",
	[TsAST.SyntaxKind.MinusToken]: "-",
	[TsAST.SyntaxKind.ExclamationToken]: "!",
};

export const prefixUnaryExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isPrefixUnaryExpression(node)) {
			return context.notSupport();
		}

		const operator = unaryOperators[node.operator];

		if (!operator) {
			return context.notSupport();
		}

		if (
			operator === "-"
			&& TsAST.isNumericLiteral(node.operand)
		) {
			return context.success({
				result: GoAST.createConversionExpression({
					typeReference: GoAST.builtinTypeReferences.float64,
					operand: GoAST.createFloatLiteral({
						value: `-${node.operand.text}`,
					}),
				}),
			});
		}

		const operand = await DCommon.asyncPipe(
			context.transform(node.operand, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(operand)) {
			return operand;
		}

		return context.success({
			before: operand.before,
			result: GoAST.createUnaryExpression({
				operator,
				operand: operand.result,
			}),
		});
	},
);
