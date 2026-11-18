import * as DArray from "@duplojs/lang/array";
import * as DEither from "@duplojs/lang/either";
import { type GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import { resolveProjectTypeAlias } from "../../resolvedReference";

/**
 * Référence à un ALIAS DE TYPE du projet (`type Order = [number, number]`) :
 * traduite par la définition de l'alias. Les alias génériques
 * (`type Box<T> = …`) demanderaient une substitution des paramètres : notSupport.
 */
export const typeAliasReferenceTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	async(node, context) => {
		if (!TsAST.isTypeReferenceNode(node) || (node.typeArguments && !DArray.lengthEqual(node.typeArguments, 0))) {
			return context.notSupport();
		}

		const declaration = DEither.unwrapRight(await resolveProjectTypeAlias(node.typeName, context));

		if (
			DEither.isLeft(declaration)
			|| (declaration.typeParameters && !DArray.lengthEqual(declaration.typeParameters, 0))
		) {
			return context.notSupport();
		}

		return context.transform(declaration.type, typeTransformers.value);
	},
);
