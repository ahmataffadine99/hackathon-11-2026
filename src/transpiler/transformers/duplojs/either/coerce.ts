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
import { goTypeOf } from "../../type/goTypeOf";
import { getEitherValueGoType } from "./goType";
import { eitherDependency, eitherPlainFunctionIdentifier, eitherRetypeFunctionIdentifier } from "./sharedDependency";

// expression : expression Go déjà évaluée (identifiant ou temporaire de préférence) ;
// from : type TS de la valeur ; to : type TS attendu à l'emplacement (retour,
// variable, branche…) ; site : nœud TS du site, pour typeToTypeNode et les erreurs.
export interface CoerceExpressionParams {
	readonly expression: GoAST.Expression;
	readonly from: Type;
	readonly to: Type;
	readonly site: TsAST.Node;
}

// Une variante gauche porte-t-elle une valeur ? Seul Fail (Left<"fail", void>)
// n'en porte pas. Reconnaissance par symbole résolu, membre par membre.
async function hasOnlyValuelessLeftVariants(type: Type, context: BuildContext) {
	const members = type.isUnionType() ? await type.getTypes() : [type];

	return DCommon.asyncPipe(
		members,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<boolean>(true),
			async({ item, next, exit }) => {
				const symbol = await item.getSymbol();
				const moduleReference = symbol && DEither.unwrapRight(
					await context.resolveReferenceModule(symbol, "@duplojs/lang", /^dist\/either\//),
				);

				if (!moduleReference || DEither.isLeft(moduleReference)) {
					return next(true);
				}

				return moduleReference.symbol.name === "Left"
					? exit(false)
					: next(true);
			},
		),
	);
}

/**
 * Contrat Sprint 2 (P4) : coercition explicite d'une valeur de type TS `from`
 * vers le type TS `to` (TS l'autorise implicitement, Go non).
 *
 * - même type Go : identité ;
 * - valeur nue T vers Either[T] : `EitherPlainOf[T](x)` ;
 * - Either[A] vers Either[B] : `EitherRetype[B, A](e)` SEULEMENT si toutes les
 *   variantes gauches de `from` sont sans valeur (Fail). Kind et Information sont
 *   conservés, Value est abandonnée : l'appelant ne doit l'utiliser que sur une
 *   valeur déjà restreinte à son côté gauche (branche else de whenIsRight) ;
 * - sinon : notSupport.
 *
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

	if (GoPrinter.renderNode(fromGoType.result) === GoPrinter.renderNode(toGoType.result)) {
		return context.success({ result: params.expression });
	}

	const toValueType = DEither.unwrapRight(getEitherValueGoType(toGoType.result));

	if (DEither.isLeft(toValueType)) {
		return context.notSupport();
	}

	const fromValueType = DEither.unwrapRight(getEitherValueGoType(fromGoType.result));

	if (DEither.isLeft(fromValueType)) {
		if (GoPrinter.renderNode(fromGoType.result) !== GoPrinter.renderNode(toValueType)) {
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
				arguments: [params.expression],
			}),
		});
	}

	if (!await hasOnlyValuelessLeftVariants(params.from, context)) {
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
			arguments: [params.expression],
		}),
	});
}
