import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { GoPrinter } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";
import { type GoType } from "./goTypeOf";
import { eitherDependency } from "../duplojs/either/sharedDependency";
import {
	createEitherGoType,
	createEitherNoValueGoType,
	getEitherValueGoType,
	isEitherNoValueGoType,
} from "../duplojs/either/goType";

function distinctByRender(goTypes: readonly GoType[]) {
	return DArray.reduce(
		goTypes,
		DArray.reduceFrom<readonly GoType[]>([]),
		({ element, lastValue, next }) => next(
			DArray.some(
				lastValue,
				(known) => GoPrinter.renderNode(known) === GoPrinter.renderNode(element),
			)
				? lastValue
				: DArray.push(lastValue, element),
		),
	);
}

/**
 * Règle de regroupement des unions (ADR-2) : chaque membre est traduit en type
 * Go, puis comparé PAR RENDU GO.
 * - que des membres nus de même type T : T (ex. `"a" | "b"` : string) ;
 * - des variantes Either (de valeur V, ou sans valeur comme Fail) et des membres
 *   nus de type V : Either[V] (ex. `Fail | readonly [number]` : Either[[]float64]),
 *   les membres nus étant portés par la forme Plain ;
 * - sinon : notSupport (replis A' / union fermée de l'ADR-1 non implémentés).
 */
export const unionTypeTransformer: Transformer<GoType> = createTransformer(
	async(node, context) => {
		if (!TsAST.isUnionTypeNode(node)) {
			return context.notSupport();
		}

		const memberTypes = await DCommon.asyncPipe(
			node.types,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<readonly GoType[]>([]),
				async({ item, lastValue, next, exit }) => {
					const memberType = await DCommon.asyncPipe(
						context.transform(item, typeTransformers.value),
						DEither.unwrapRight,
					);

					if (DEither.isLeft(memberType)) {
						return exit(memberType);
					}

					if (!DArray.lengthEqual(memberType.before, 0)) {
						return exit(context.error(item, "un-support-before-on-union-member-type"));
					}

					return next(DArray.push(lastValue, memberType.result));
				},
			),
		);

		if (DEither.isLeft(memberTypes)) {
			return memberTypes;
		}

		const eitherValueTypes = DArray.reduce(
			memberTypes,
			DArray.reduceFrom<readonly GoType[]>([]),
			({ element, lastValue, next }) => {
				const valueType = DEither.unwrapRight(getEitherValueGoType(element));

				return next(
					DEither.isLeft(valueType)
						? lastValue
						: DArray.push(lastValue, valueType),
				);
			},
		);

		const plainTypes = DArray.filter(
			memberTypes,
			(memberType) => DEither.isLeft(getEitherValueGoType(memberType)),
		);

		// Union sans Either : tous les membres doivent avoir le même type Go.
		if (DArray.lengthEqual(eitherValueTypes, 0)) {
			const distinctPlainTypes = distinctByRender(plainTypes);
			const plainType = DArray.first(distinctPlainTypes);

			if (!plainType || DArray.length(distinctPlainTypes) > 1) {
				return context.notSupport();
			}

			return context.success({ result: plainType });
		}

		const valueTypes = distinctByRender(
			DArray.concat(
				DArray.filter(eitherValueTypes, (valueType) => !isEitherNoValueGoType(valueType)),
				plainTypes,
			),
		);

		if (DArray.length(valueTypes) > 1) {
			return context.notSupport();
		}

		const packageName = context.registerSharedDependency(eitherDependency.value);

		return context.success({
			result: createEitherGoType(
				packageName,
				DArray.first(valueTypes) ?? createEitherNoValueGoType(packageName),
			),
		});
	},
);
