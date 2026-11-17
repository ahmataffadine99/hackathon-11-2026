import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import { expressionTransformers } from "../expression";
import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";
import * as DGenerator from "@duplojs/lang/generator";
import type { BuildContext } from "../../context/build";

export async function transformCallExpression(
	rawNode: TsAST.Node,
	context: BuildContext,
	directCallee?: GoAST.Expression,
) {
	const node = TsAST.isExpressionStatement(rawNode)
		? rawNode.expression
		: rawNode;
	if (!TsAST.isCallExpression(node)) {
		return context.notSupport();
	}

	const callee = directCallee
		? {
			result: directCallee,
			before: [],
		}
		: await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

	if (DEither.isLeft(callee)) {
		return callee;
	}

	const functionVariableStatement = directCallee
		? undefined
		: GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: callee.result,
		});

	const argumentsResult = await DCommon.asyncPipe(
		node.arguments,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<{
				before: readonly GoAST.Statement[];
				arguments: readonly GoAST.Expression[];
			}>({
				before: [],
				arguments: [],
			}),
			async({ item, lastValue, next, exit }) => {
				const argument = await DCommon.asyncPipe(
					context.transform(item, expressionTransformers.value),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(argument)) {
					return exit(argument);
				}

				const argumentVariableStatement = GoAST.createShortVariableDeclarationStatement({
					identifier: context.generateIdentifier(),
					initializer: argument.result,
				});

				return next({
					before: DArray.concat(
						lastValue.before,
						argument.before,
						[argumentVariableStatement],
					),
					arguments: DArray.push(
						lastValue.arguments,
						argumentVariableStatement.identifier,
					),
				});
			},
		),
	);

	if (DEither.isLeft(argumentsResult)) {
		return argumentsResult;
	}

	return context.success({
		before: DArray.concat(
			callee.before,
			functionVariableStatement ? [functionVariableStatement] : [],
			argumentsResult.before,
		),
		result: GoAST.createCallExpression({
			callee: functionVariableStatement
				? functionVariableStatement.identifier
				: callee.result,
			arguments: argumentsResult.arguments,
		}),
	});
}

export const callExpressionTransformer: Transformer<GoAST.CallExpression> = createTransformer(
	(rawNode, context) => transformCallExpression(rawNode, context),
);
