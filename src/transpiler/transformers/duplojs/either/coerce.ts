import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { GoAST, GoPrinter } from "@go";
import {
	type NotfoundTransformer,
	type TransformationError,
	type TransformationNotSupported,
	type TransformationSuccess,
} from "@transformer";
import { type TsAST } from "@typescript";
import { type Type } from "typescript/async";
import { type BuildContext } from "../../../context/build";
import { goTypeOf, type GoType } from "../../type/goTypeOf";
import {
	getEither2GoTypes,
	getEitherValueGoType,
	isEitherNoValueGoType,
} from "./goType";
import {
	either2FromLeftFunctionIdentifier,
	eitherDependency,
	eitherPlainFunctionIdentifier,
	eitherRetypeFunctionIdentifier,
} from "./sharedDependency";

// expression : expression Go déjà évaluée (identifiant ou temporaire de préférence) ;
// from : type TS de la valeur ; to : type TS attendu à l'emplacement (retour,
// variable, branche…) ; site : nœud TS du site, pour typeToTypeNode et les erreurs.
export interface CoerceExpressionParams {
	readonly expression: GoAST.Expression;
	readonly from: Type;
	readonly to: Type;
	readonly site: TsAST.Node;
}

/**
 * Nom DuploJS (Success, Fail, Left, Right…) de chaque membre de `type`, reconnu par
 * symbole résolu dans @duplojs/lang (dist/either/) ; `undefined` pour un membre
 * qui n'est pas un Either (valeur nue).
 */
export async function eitherVariantNames(
	type: Type,
	context: BuildContext,
): Promise<readonly (string | undefined)[]> {
	const members = type.isUnionType() ? await type.getTypes() : [type];

	return DCommon.asyncPipe(
		members,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<readonly (string | undefined)[]>([]),
			async({ item, lastValue, next }) => {
				const symbol = await item.getAliasSymbol() ?? await item.getSymbol();
				const moduleReference = symbol && DEither.unwrapRight(
					await context.resolveReferenceModule(symbol, "@duplojs/lang", /^dist\/either\//),
				);

				return next(
					DArray.push(
						lastValue,
						moduleReference && !DEither.isLeft(moduleReference)
							? moduleReference.symbol.name
							: undefined,
					),
				);
			},
		),
	);
}

// Une variante gauche porte-t-elle une valeur ? Seul Fail (Left<"fail", void>)
// n'en porte pas. Reconnaissance par symbole résolu, membre par membre.
export async function hasOnlyValuelessLeftVariants(type: Type, context: BuildContext) {
	const names = await eitherVariantNames(type, context);

	return DArray.every(names, (name) => name !== "Left");
}

export interface CoerceGoExpressionParams {
	readonly expression: GoAST.Expression;
	readonly fromGoType: GoType;
	readonly toGoType: GoType;
	// Type TS de la valeur, s'il est connu : seul moyen de savoir si ses variantes
	// gauches sont sans valeur (condition d'EitherRetype). Absent : pas de retypage.
	readonly from?: Type;
}

/**
 * Coercition d'après les TYPES GO (Sprint 3, ADR-7) : utilisée quand le type TS
 * n'est pas instanciable (résultat d'une fonction générique passée en valeur).
 * Mêmes règles que coerceExpression : identité, valeur nue vers Either[T]
 * (EitherPlainOf), Either[A] vers Either[B] si `from` n'a que des gauches sans
 * valeur (EitherRetype) ; sinon notSupport.
 */
export async function coerceGoExpression(
	params: CoerceGoExpressionParams,
	context: BuildContext,
): Promise<
	| TransformationSuccess<GoAST.Expression>
	| TransformationNotSupported
> {
	const { expression, fromGoType, toGoType, from } = params;

	if (GoPrinter.renderNode(fromGoType) === GoPrinter.renderNode(toGoType)) {
		return context.success({ result: expression });
	}

	const toEither2Types = DEither.unwrapRight(getEither2GoTypes(toGoType));

	if (!DEither.isLeft(toEither2Types)) {
		const fromEitherTypes = DEither.unwrapRight(getEitherValueGoType(fromGoType));

		if (
			!DEither.isLeft(fromEitherTypes)
			&& GoPrinter.renderNode(fromEitherTypes) === GoPrinter.renderNode(toEither2Types.leftType)
		) {
			const packageName = context.registerSharedDependency(eitherDependency.value);

			return context.success({
				result: GoAST.createCallExpression({
					callee: GoAST.createInstantiationExpression({
						target: GoAST.createSelectorExpression({
							target: packageName,
							identifier: either2FromLeftFunctionIdentifier,
						}),
						typeArguments: DCommon.cast([
							toEither2Types.leftType,
							toEither2Types.rightType,
						]),
					}),
					arguments: [expression],
				}),
			});
		}

		return context.notSupport();
	}

	const toValueType = DEither.unwrapRight(getEitherValueGoType(toGoType));

	if (DEither.isLeft(toValueType)) {
		return context.notSupport();
	}

	const fromValueType = DEither.unwrapRight(getEitherValueGoType(fromGoType));

	if (DEither.isLeft(fromValueType)) {
		if (GoPrinter.renderNode(fromGoType) !== GoPrinter.renderNode(toValueType)) {
			return context.notSupport();
		}

		const packageName = context.registerSharedDependency(eitherDependency.value);

		return context.success({
			result: GoAST.createCallExpression({
				callee: GoAST.createInstantiationExpression({
					target: GoAST.createSelectorExpression({
						target: packageName,
						identifier: eitherPlainFunctionIdentifier,
					}),
					typeArguments: DCommon.cast([toValueType]),
				}),
				arguments: [expression],
			}),
		});
	}

	const valueless = isEitherNoValueGoType(fromValueType)
		|| (from !== undefined && await hasOnlyValuelessLeftVariants(from, context));

	if (!valueless) {
		return context.notSupport();
	}

	const packageName = context.registerSharedDependency(eitherDependency.value);

	return context.success({
		result: GoAST.createCallExpression({
			callee: GoAST.createInstantiationExpression({
				target: GoAST.createSelectorExpression({
					target: packageName,
					identifier: eitherRetypeFunctionIdentifier,
				}),
				typeArguments: DCommon.cast([toValueType, fromValueType]),
			}),
			arguments: [expression],
		}),
	});
}

/**
 * Contrat Sprint 2 (P4) : coercition explicite d'une valeur de type TS `from`
 * vers le type TS `to` (TS l'autorise implicitement, Go non).
 * Traduit les deux types en Go puis applique coerceGoExpression.
 * Instanciation générique toujours explicite (D1). Aucun `before` produit.
 */
export async function coerceExpression(
	params: CoerceExpressionParams,
	context: BuildContext,
): Promise<
	| TransformationSuccess<GoAST.Expression>
	| TransformationError
	| NotfoundTransformer
	| TransformationNotSupported
> {
	const fromGoType = await DCommon.asyncPipe(
		goTypeOf(params.from, params.site, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(fromGoType)) {
		return fromGoType;
	}

	const toGoType = await DCommon.asyncPipe(
		goTypeOf(params.to, params.site, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(toGoType)) {
		return toGoType;
	}

	return coerceGoExpression(
		{
			expression: params.expression,
			fromGoType: fromGoType.result,
			toGoType: toGoType.result,
			from: params.from,
		},
		context,
	);
}
