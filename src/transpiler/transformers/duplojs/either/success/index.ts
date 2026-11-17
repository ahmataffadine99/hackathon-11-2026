import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { transformCallExpression } from "../../../shared";
import { eitherDependency, eitherSuccessFunctionIdentifier } from "../sharedDependency";
import { resolveExpectedEitherValueType } from "../expectedValueType";

export async function successExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (TsAST.isCallExpression(node)) {
		// D1 : la fonction générique est toujours instanciée, ici avec le V
		// du type attendu (union englobante) pour rester cohérent avec Either[V].
		const valueType = await DCommon.asyncPipe(
			resolveExpectedEitherValueType(node, context),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(valueType)) {
			return valueType;
		}

		const packageName = context.registerSharedDependency(eitherDependency.value);

		return transformCallExpression(
			node,
			context,
			GoAST.createInstantiationExpression({
				target: GoAST.createSelectorExpression({
					target: packageName,
					identifier: eitherSuccessFunctionIdentifier,
				}),
				typeArguments: DCommon.cast([valueType]),
			}),
		);
	}

	const packageName = context.registerSharedDependency(eitherDependency.value);

	return context.success({
		result: GoAST.createSelectorExpression({
			target: packageName,
			identifier: eitherSuccessFunctionIdentifier,
		}),
	});
}
