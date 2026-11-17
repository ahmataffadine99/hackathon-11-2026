import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST, GoPrinter } from "@go";
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

/**
 * Union de deux types Go selon la règle de l'ADR-2 (regroupement par type Go) :
 * identiques : ce type ; Either[V] et Either[JSUndefined] (sans valeur) : Either[V] ;
 * Either[V] et V nu : Either[V] ; Either sans valeur et T nu : Either[T] ;
 * sinon `undefined` (non représentable sans union fermée).
 */
export function unionGoTypes(left: GoType, right: GoType, packageName: GoAST.Identifier): GoType | undefined {
	const render = (goType: GoType) => GoPrinter.renderNode(goType);

	if (render(left) === render(right)) {
		return left;
	}

	const leftValue = DEither.unwrapRight(getEitherValueGoType(left));
	const rightValue = DEither.unwrapRight(getEitherValueGoType(right));

	if (!DEither.isLeft(leftValue) && !DEither.isLeft(rightValue)) {
		if (isEitherNoValueGoType(leftValue)) {
			return right;
		}

		return isEitherNoValueGoType(rightValue) ? left : undefined;
	}

	const [eitherValue, plain] = DEither.isLeft(leftValue)
		? [rightValue, left]
		: [leftValue, right];

	if (DEither.isLeft(eitherValue)) {
		return undefined;
	}

	if (isEitherNoValueGoType(eitherValue)) {
		return createEitherGoType(packageName, plain);
	}

	return render(eitherValue) === render(plain)
		? createEitherGoType(packageName, plain)
		: undefined;
}
