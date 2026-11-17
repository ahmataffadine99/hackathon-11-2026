import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import * as DPattern from "@duplojs/lang/pattern";
import { GoAST, GoPrinter } from "@go";
import { type TsAST } from "@typescript";
import { type Transformer } from "@transformer";
import { type BuildContext } from "../../../../context/build";
import { typeTransformers } from "../../../type";
import { eitherDependency, eitherTypeIdentifier } from "../sharedDependency";

export const eitherTypeNames = ["Success", "Fail", "Left", "Right"] as const;

export type EitherTypeName = typeof eitherTypeNames[number];

export interface EitherTypeMember {
	readonly name: EitherTypeName;
	readonly node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode;
}

// Position de l'argument de type qui porte la valeur : Success<V>, Left<I, V>, Right<I, V>.
// Fail (= Left<"fail", void>) ne porte pas de valeur.
function getValueTypeNode(member: EitherTypeMember) {
	return DCommon.pipe(
		member.name,
		DPattern.match(
			DCommon.equal("Fail"),
			() => DEither.left("no-value-type"),
		),
		DPattern.match(
			DCommon.equal("Success"),
			() => DEither.right(
				"value-type-node",
				member.node.typeArguments && DArray.at(member.node.typeArguments, 0),
			),
		),
		DPattern.otherwise(
			() => DEither.right(
				"value-type-node",
				member.node.typeArguments && DArray.at(member.node.typeArguments, 1),
			),
		),
	);
}

/**
 * Traduit un type Either (membre seul ou union de membres) vers Either[V].
 * Règle de l'ADR-1 §7 : les types de valeur des membres sont regroupés ; un seul
 * type Go donne Either[V]. Plusieurs types (A', unions hétérogènes) ne sont pas
 * encore pris en charge.
 */
export async function eitherTypeHandler(
	node: TsAST.TypeNode,
	members: readonly EitherTypeMember[],
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.GenericTypeReference>["transformer"]>> {
	// Parcours séquentiel (ordre déterministe, comme call.ts) des membres.
	const valueTypes = await DCommon.asyncPipe(
		members,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<readonly (GoAST.Type | GoAST.TypeReference)[]>([]),
			async({ item: member, lastValue, next, exit }) => {
				const valueTypeNode = DEither.unwrapRight(getValueTypeNode(member));

				if (DEither.isLeft(valueTypeNode)) {
					return next(lastValue);
				}

				if (!valueTypeNode) {
					return exit(context.error(member.node, "missing-either-value-type"));
				}

				const valueType = await DCommon.asyncPipe(
					context.transform(valueTypeNode, typeTransformers.value),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(valueType)) {
					return exit(valueType);
				}

				if (!DArray.lengthEqual(valueType.before, 0)) {
					return exit(context.error(valueTypeNode, "un-support-before-on-either-value-type"));
				}

				return next(DArray.push(lastValue, valueType.result));
			},
		),
	);

	if (DEither.isLeft(valueTypes)) {
		return valueTypes;
	}

	// Deux membres portant le même type Go (ex. Success<number> | Left<"x", number>)
	// donnent un seul V : on compare le rendu Go, pas l'identité des nœuds.
	const distinctValueTypes = DArray.reduce(
		valueTypes,
		DArray.reduceFrom<readonly (GoAST.Type | GoAST.TypeReference)[]>([]),
		({ element, lastValue, next }) => next(
			DArray.some(
				lastValue,
				(known) => GoPrinter.renderNode(known) === GoPrinter.renderNode(element),
			)
				? lastValue
				: DArray.push(lastValue, element),
		),
	);

	if (DArray.length(distinctValueTypes) > 1) {
		// Union hétérogène : représentation A' (ADR-1 §5), prévue avec l'exercice 09.
		return context.notSupport();
	}

	const packageName = context.registerSharedDependency(eitherDependency.value);

	// Seul Fail : aucune valeur, V devient JSUndefined (dépendance par défaut).
	const valueType = DArray.first(distinctValueTypes) ?? GoAST.createPackageTypeReference({
		packageName,
		identifier: GoAST.createIdentifier("JSUndefined"),
	});

	return context.success({
		result: GoAST.createGenericTypeReference({
			typeReference: GoAST.createPackageTypeReference({
				packageName,
				identifier: eitherTypeIdentifier,
			}),
			typeArguments: DCommon.cast([valueType]),
		}),
	});
}
