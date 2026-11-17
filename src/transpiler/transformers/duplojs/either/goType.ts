import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST } from "@go";
import { type GoType } from "../../type/goTypeOf";
import { eitherNoValueIdentifier, eitherTypeIdentifier } from "./sharedDependency";

/**
 * Si `goType` est `shard_dependencies.Either[V]`, renvoie `some(V)`.
 * Reconnaît notre propre nœud Go (identité de l'identifiant), pas un texte.
 */
export function getEitherValueGoType(goType: GoType): DEither.Maybe<GoType> {
	if (
		!DModeling.hasTagValue(goType, "[node]type-reference-generic")
		|| !DModeling.hasTagValue(goType.typeReference, "[node]type-reference-package")
		|| goType.typeReference.identifier !== eitherTypeIdentifier
	) {
		return DEither.none();
	}

	const valueType = DArray.first(goType.typeArguments);

	return valueType ? DEither.some(valueType) : DEither.none();
}

/** V = JSUndefined : la variante (Fail) ne porte aucune valeur. */
export function isEitherNoValueGoType(valueType: GoType) {
	return DModeling.hasTagValue(valueType, "[node]type-reference-package")
		&& valueType.identifier === eitherNoValueIdentifier;
}

export function createEitherGoType(packageName: GoAST.Identifier, valueType: GoType) {
	return GoAST.createGenericTypeReference({
		typeReference: GoAST.createPackageTypeReference({
			packageName,
			identifier: eitherTypeIdentifier,
		}),
		typeArguments: DCommon.cast([valueType]),
	});
}

export function createEitherNoValueGoType(packageName: GoAST.Identifier) {
	return GoAST.createPackageTypeReference({
		packageName,
		identifier: eitherNoValueIdentifier,
	});
}
