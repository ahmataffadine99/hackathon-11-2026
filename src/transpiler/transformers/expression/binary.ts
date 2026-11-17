import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { expressionTransformers } from ".";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";
import { TypeFlags } from "typescript/async";

const binaryOperators: Partial<
	Record<TsAST.SyntaxKind, GoAST.BinaryOperator>
> = {
	[TsAST.SyntaxKind.PlusToken]: "+",
	[TsAST.SyntaxKind.MinusToken]: "-",
	[TsAST.SyntaxKind.AsteriskToken]: "*",
	[TsAST.SyntaxKind.SlashToken]: "/",
	[TsAST.SyntaxKind.PercentToken]: "%",

	[TsAST.SyntaxKind.AmpersandToken]: "&",
	[TsAST.SyntaxKind.BarToken]: "|",
	[TsAST.SyntaxKind.CaretToken]: "^",
	[TsAST.SyntaxKind.LessThanLessThanToken]: "<<",
	[TsAST.SyntaxKind.GreaterThanGreaterThanToken]: ">>",

	[TsAST.SyntaxKind.AmpersandAmpersandToken]: "&&",
	[TsAST.SyntaxKind.BarBarToken]: "||",

	[TsAST.SyntaxKind.EqualsEqualsEqualsToken]: "==",
	[TsAST.SyntaxKind.ExclamationEqualsEqualsToken]: "!=",
	[TsAST.SyntaxKind.LessThanToken]: "<",
	[TsAST.SyntaxKind.LessThanEqualsToken]: "<=",
	[TsAST.SyntaxKind.GreaterThanToken]: ">",
	[TsAST.SyntaxKind.GreaterThanEqualsToken]: ">=",
};

export const binaryExpressionTransformer: Transformer<GoAST.BinaryExpression | GoAST.Identifier> = createTransformer(
	async(node, context) => {
		if (!TsAST.isBinaryExpression(node)) {
			return context.notSupport();
		}

		const operator = binaryOperators[node.operatorToken.kind];

		if (!operator) {
			return context.notSupport();
		}

		const left = await DCommon.asyncPipe(
			context.transform(node.left, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(left)) {
			return left;
		}

		const leftAssignment = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: left.result,
		});

		const right = await DCommon.asyncPipe(
			context.transform(node.right, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(right)) {
			return right;
		}

		if (operator === "&&" || operator === "||") {
			// ADR-8 (D2) : en JS, `a || b` renvoie la VALEUR d'un opérande ; seul le
			// cas booléen a un équivalent Go direct.
			const resultType = await context.transpilation.typeChecker.getTypeAtLocation(node);

			if ((resultType.flags & TypeFlags.BooleanLike) === 0) {
				return context.error(node, "logical-operator-on-non-boolean-values-not-supported");
			}

			// Droite sans préparation : opérateur Go natif, qui court-circuite comme JS.
			// (D2 venait de la sortie de la droite dans une variable, évaluée d'avance.)
			if (DArray.lengthEqual(right.before, 0)) {
				return context.success({
					before: DArray.concat(left.before, [leftAssignment]),
					result: GoAST.createBinaryExpression({
						operator,
						left: leftAssignment.identifier,
						right: right.result,
					}),
				});
			}

			// Droite avec préparations (appel…) : évaluée seulement si nécessaire.
			// t := a ; if t { before(b) ; t = b }   (&&)   ou   if !t { … }   (||)
			return context.success({
				before: DArray.concat(
					left.before,
					[
						leftAssignment,
						GoAST.createIfStatement({
							condition: operator === "&&"
								? leftAssignment.identifier
								: GoAST.createUnaryExpression({
									operator: "!",
									operand: leftAssignment.identifier,
								}),
							body: GoAST.createBlockStatement({
								statements: DArray.concat(
									right.before,
									[
										GoAST.createAssignmentStatement({
											targets: DCommon.cast([leftAssignment.identifier]),
											values: DCommon.cast([right.result]),
										}),
									],
								),
							}),
						}),
					],
				),
				result: leftAssignment.identifier,
			});
		}

		const rightAssignment = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: right.result,
		});

		return context.success({
			before: DArray.concat(
				left.before,
				[leftAssignment],
				right.before,
				[rightAssignment],
			),
			result: GoAST.createBinaryExpression({
				operator,
				right: rightAssignment.identifier,
				left: leftAssignment.identifier,
			}),
		});
	},
);
