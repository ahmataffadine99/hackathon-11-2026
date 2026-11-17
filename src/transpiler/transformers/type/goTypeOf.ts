import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type GoAST } from "@go";
import { type NotfoundTransformer, type TransformationError, type TransformationSuccess } from "@transformer";
import { type TsAST } from "@typescript";
import { type Type } from "typescript/async";
import { type BuildContext } from "../../context/build";
import { typeTransformers } from ".";

export type GoType = GoAST.Type | GoAST.TypeReference;

/**
 * Contrat Sprint 2 (P4) : traduit un Type du checker en type Go.
 *
 * - `type` : le Type TS (getTypeAtLocation, getContextualType, type de retour…).
 * - `site` : le nœud TS où le type est utilisé ; il sert d'enclosingDeclaration à
 *   typeToTypeNode (noms qualifiés résolus depuis ce fichier) et de nœud d'erreur.
 *
 * Passe par typeToTypeNode puis typeTransformers : fonctionne donc pour les types
 * inférés, dont les nœuds sont synthétiques (getTypeFromTypeNode échoue sur eux).
 * Un type ne produit jamais de `before` : sinon, erreur.
 *
 * Usage : `DCommon.asyncPipe(goTypeOf(type, site, context), DEither.unwrapRight)`
 * donne `{ before: [], result: GoType }` ou un Left à propager.
 */
export async function goTypeOf(
	type: Type,
	site: TsAST.Node,
	context: BuildContext,
): Promise<TransformationSuccess<GoType> | TransformationError | NotfoundTransformer> {
	const typeNode = await context.transpilation.typeChecker.typeToTypeNode(type, site);

	if (!typeNode) {
		return context.error(site, "unable-to-create-type-node");
	}

	const goType = await context.transform(typeNode, typeTransformers.value);
	const unwrapped = DEither.unwrapRight(goType);

	if (DEither.isLeft(unwrapped)) {
		return unwrapped;
	}

	if (!DArray.lengthEqual(unwrapped.before, 0)) {
		return context.error(site, "un-support-before-on-type");
	}

	return DCommon.cast(goType);
}
