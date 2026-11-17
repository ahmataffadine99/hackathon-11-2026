import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { transformCallExpression } from "../../../shared";
import { eitherDependency, eitherFailFunctionIdentifier } from "../sharedDependency";
import { resolveExpectedEitherValueType } from "../expectedValueType";

export async function failExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	// fail utilisé comme valeur (passé à une fonction) : relève de l'ADR-3.
	if (!TsAST.isCallExpression(node)) {
		return context.notSupport();
	}

	// fail() n'a pas d'argument : V ne peut venir que du type attendu
	// (ex. Either[float64] pour un retour Success<number> | Fail).
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
				identifier: eitherFailFunctionIdentifier,
			}),
			typeArguments: DCommon.cast([valueType]),
		}),
	);
}
