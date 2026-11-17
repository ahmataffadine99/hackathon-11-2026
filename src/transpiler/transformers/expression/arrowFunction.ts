import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { goTypeOf } from "../type/goTypeOf";
import { blockStatementTransformer } from "../statement/block";
import { expressionTransformers } from ".";

/**
 * Fonction fléchée (ADR-7) : `func` literal Go.
 * - Paramètres : types de la signature de la fonction fléchée, déjà instanciés par
 *   le contexte en TypeScript (`(value) => …` passé à matchInformation : number).
 * - Retour : type de retour de cette signature, traduit en Go.
 * - Corps-expression : `return expr` (ses `before` en tête du corps) ;
 *   corps-bloc : ses instructions (le `return` final est obligatoire en Go).
 * Les closures JS et Go capturent toutes deux par référence : la sémantique des
 * variables capturées est conservée.
 */
export const arrowFunctionTransformer: Transformer<GoAST.FunctionLiteral> = createTransformer(
	async(node, context) => {
		if (!TsAST.isArrowFunction(node) && !TsAST.isFunctionExpression(node)) {
			return context.notSupport();
		}

		if (node.asteriskToken || node.modifiers?.some((modifier) => modifier.kind === TsAST.SyntaxKind.AsyncKeyword)) {
			return context.error(node, "async-or-generator-function-not-supported");
		}

		const { typeChecker } = context.transpilation;
		const signature = await typeChecker.getSignatureFromDeclaration(node);

		const functionArguments = await DCommon.asyncPipe(
			node.parameters,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<readonly GoAST.FunctionArgument[]>([]),
				async({ item, index, lastValue, next, exit }) => {
					if (!TsAST.isIdentifier(item.name) || item.dotDotDotToken || item.initializer) {
						return exit(context.error(item, "only-simple-identifier-parameters-are-supported"));
					}

					const goType = DEither.unwrapRight(
						await goTypeOf(await typeChecker.getParameterType(signature, index), item, context),
					);

					if (DEither.isLeft(goType)) {
						return exit(goType);
					}

					return next(
						DArray.push(
							lastValue,
							GoAST.createFunctionArgument({
								identifier: context.createSourceIdentifier(item.name.text),
								type: goType.result,
							}),
						),
					);
				},
			),
		);

		if (DEither.isLeft(functionArguments)) {
			return functionArguments;
		}

		const returnGoType = DEither.unwrapRight(
			await goTypeOf(await typeChecker.getReturnTypeOfSignature(signature), node, context),
		);

		if (DEither.isLeft(returnGoType)) {
			return returnGoType;
		}

		const { body } = node;

		if (TsAST.isBlock(body)) {
			const block = DEither.unwrapRight(await context.transform(body, [blockStatementTransformer]));

			if (DEither.isLeft(block)) {
				return block;
			}

			return context.success({
				result: GoAST.createFunctionLiteral({
					arguments: functionArguments,
					returnTypes: [returnGoType.result],
					body: GoAST.createBlockStatement({
						statements: [...block.before, ...block.result.statements],
					}),
				}),
			});
		}

		const expression = DEither.unwrapRight(await context.transform(body, expressionTransformers.value));

		if (DEither.isLeft(expression)) {
			return expression;
		}

		return context.success({
			result: GoAST.createFunctionLiteral({
				arguments: functionArguments,
				returnTypes: [returnGoType.result],
				body: GoAST.createBlockStatement({
					statements: [
						...expression.before,
						GoAST.createReturnStatement({ values: [expression.result] }),
					],
				}),
			}),
		});
	},
);
