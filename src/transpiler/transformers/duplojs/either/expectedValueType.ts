import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { TsAST } from "@typescript";
import { type Type } from "typescript/async";
import { type BuildContext } from "../../../context/build";
import { goTypeOf, type GoType } from "../../type/goTypeOf";
import { getEitherValueGoType } from "./goType";

function findEnclosingFunction(node: TsAST.Node): TsAST.FunctionLikeDeclaration | undefined {
	if (TsAST.isFunctionLikeDeclaration(node)) {
		return node;
	}

	return node.parent && findEnclosingFunction(node.parent);
}

// Une valeur retournée (return x ou corps d'arrow) prend le type de retour
// de sa fonction, même quand ce type est inféré (pas de type contextuel).
async function getEnclosingReturnType(node: TsAST.CallExpression, context: BuildContext) {
	const isReturned = TsAST.isReturnStatement(node.parent)
		|| (TsAST.isArrowFunction(node.parent) && node.parent.body === node);

	const enclosingFunction = isReturned ? findEnclosingFunction(node.parent) : undefined;

	if (!enclosingFunction) {
		return undefined;
	}

	const { typeChecker } = context.transpilation;
	const signature = await typeChecker.getSignatureFromDeclaration(enclosingFunction);

	return signature && typeChecker.getReturnTypeOfSignature(signature);
}

/**
 * Détermine V pour un constructeur Either (success, fail) à partir du type
 * ATTENDU au site d'appel, pas seulement de l'argument : fail() n'a pas
 * d'argument, et success(3) doit produire le V de l'union englobante.
 * Replis (C11), dans l'ordre : type contextuel, type de retour de la fonction
 * englobante, type propre de l'appel. Le premier qui se traduit en Either[V] gagne.
 */
export async function resolveExpectedEitherValueType(
	node: TsAST.CallExpression,
	context: BuildContext,
) {
	const { typeChecker } = context.transpilation;

	const candidates: readonly (() => Promise<Type | undefined>)[] = [
		() => typeChecker.getContextualType(node),
		() => getEnclosingReturnType(node, context),
		() => typeChecker.getTypeAtLocation(node),
	];

	const valueType = await DCommon.asyncPipe(
		candidates,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<GoType | undefined>(undefined),
			async({ item: getCandidate, next, exit }) => {
				const candidate = await getCandidate();

				if (!candidate) {
					return next(undefined);
				}

				const goType = await DCommon.asyncPipe(
					goTypeOf(candidate, node, context),
					DEither.unwrapRight,
				);

				const eitherValueType = DEither.isLeft(goType)
					? goType
					: DEither.unwrapRight(getEitherValueGoType(goType.result));

				return DEither.isLeft(eitherValueType)
					? next(undefined)
					: exit(eitherValueType);
			},
		),
	);

	if (!valueType) {
		return context.error(node, "unable-to-resolve-either-value-type");
	}

	return DEither.right("either-value-type", valueType);
}
