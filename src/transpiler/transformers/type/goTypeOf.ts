import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type GoAST } from "@go";
import { type NotfoundTransformer, type TransformationError, type TransformationSuccess } from "@transformer";
import { TsAST } from "@typescript";
import { SymbolFlags, type Type } from "typescript/async";
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

/**
 * Contrat Sprint 3 (D16) : type Go d'une EXPRESSION telle que traduite.
 * Pour un identifiant de variable ou de paramètre : le type DÉCLARÉ (le type Go de
 * la variable), pas le type rétréci par un `if` (après `isLeft(x)`, TypeScript voit
 * `Fail`, mais la variable Go reste `Either[float64]`). Sinon : le type de l'expression.
 */
export async function goTypeOfExpression(
	node: TsAST.Expression,
	context: BuildContext,
): Promise<TransformationSuccess<GoType> | TransformationError | NotfoundTransformer> {
	const { typeChecker } = context.transpilation;
	const symbol = TsAST.isIdentifier(node)
		? await typeChecker.getSymbolAtLocation(node)
		: undefined;

	const type = symbol && (symbol.flags & SymbolFlags.Variable) !== 0
		? await typeChecker.getTypeOfSymbol(symbol)
		: await typeChecker.getTypeAtLocation(node);

	return goTypeOf(type, node, context);
}
