import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { SignatureKind, type Signature, type Type } from "typescript/async";
import {
	type TransformationSuccess,
	type TransformationError,
	type NotfoundTransformer,
	type TransformationNotSupported,
} from "@transformer";
import { type BuildContext } from "../../context/build";
import { typeTransformers } from "../type";

// Bouchon LOCAL en attendant goTypeOf (P4, PLAN_HACKATHON.md §8, ADR-3) :
// reprend exactement la recette déjà utilisée par DCommon.print
// (typeToTypeNode puis typeTransformers.value). Ne couvre donc que ce que
// typeTransformers sait déjà traduire aujourd'hui (float64, unions Either) ;
// à retirer au profit de goTypeOf une fois ce fichier mergé.
async function localGoTypeOf(
	type: Type,
	site: TsAST.Node,
	context: BuildContext,
) {
	const typeNode = await context.transpilation.typeChecker.typeToTypeNode(type, site);

	if (!typeNode) {
		return context.error(site, "unable-to-create-type-node-for-function-value");
	}

	return context.transform(typeNode, typeTransformers.value);
}

// Signature de la fonction attendue en `site` : d'abord son propre type
// (site est déjà l'appel qui produit la fonction, par ex. le résultat de
// `DEither.whenIsRight(f)`), sinon le type contextuel (site assigné à une
// variable typée, passé en argument typé...). Le premier qui expose une
// signature d'appel gagne (1re signature, pas de surcharge dans ce sous-ensemble).
export async function resolveExpectedFunctionSignature(
	site: TsAST.Node,
	context: BuildContext,
): Promise<Signature | undefined> {
	const { typeChecker } = context.transpilation;

	const candidates: readonly (() => Promise<Type | undefined>)[] = [
		() => typeChecker.getTypeAtLocation(site),
		() => TsAST.isExpression(site)
			? typeChecker.getContextualType(site)
			: Promise.resolve(undefined),
	];

	return DCommon.asyncPipe(
		candidates,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<Signature | undefined>(undefined),
			async({ item: getCandidate, next, exit }) => {
				const candidate = await getCandidate();
				const signatures = candidate
					&& await typeChecker.getSignaturesOfType(candidate, SignatureKind.Call);
				const signature = signatures && DArray.first(signatures);

				return signature ? exit(signature) : next(undefined);
			},
		),
	);
}

/**
 * Construit un `func` literal Go à partir du type de fonction attendu en
 * `site` (ADR-3 §0.5, PLAN_HACKATHON.md §8) : les paramètres et le type de
 * retour viennent de la première signature d'appel de ce type, jamais du
 * texte d'une arrow TypeScript (createFunctionValue ne lit aucun corps de
 * fonction). `body` reçoit les identifiants Go des paramètres déjà déclarés
 * et renvoie l'expression finale à retourner, avec ses propres `before`
 * (avant de les placer dans le bloc, avant le `return`).
 */
export async function createFunctionValue(params: {
	site: TsAST.Node;
	context: BuildContext;
	body(
		parameters: readonly GoAST.Identifier[],
	): Promise<TransformationSuccess<GoAST.Expression> | TransformationError | NotfoundTransformer>;
}): Promise<
	| TransformationSuccess<GoAST.FunctionLiteral>
	| TransformationError
	| NotfoundTransformer
	| TransformationNotSupported
> {
	const { site, context, body } = params;
	const { typeChecker } = context.transpilation;

	const signature = await resolveExpectedFunctionSignature(site, context);

	if (!signature) {
		return context.notSupport();
	}

	const parametersResult = await DCommon.asyncPipe(
		signature.parameters,
		DGenerator.asyncReduce(
			DGenerator.reduceFrom<{
				identifiers: readonly GoAST.Identifier[];
				functionArguments: readonly GoAST.FunctionArgument[];
			}>({
				identifiers: [],
				functionArguments: [],
			}),
			async({ index, lastValue, next, exit }) => {
				const parameterType = await typeChecker.getParameterType(signature, index);
				const goType = await DCommon.asyncPipe(
					localGoTypeOf(parameterType, site, context),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(goType)) {
					return exit(goType);
				}

				if (!DArray.lengthEqual(goType.before, 0)) {
					return exit(context.error(site, "unsupported-before-on-function-value-parameter-type"));
				}

				const identifier = context.generateIdentifier();

				return next({
					identifiers: DArray.push(lastValue.identifiers, identifier),
					functionArguments: DArray.push(
						lastValue.functionArguments,
						GoAST.createFunctionArgument({
							identifier,
							type: goType.result,
						}),
					),
				});
			},
		),
	);

	if (DEither.isLeft(parametersResult)) {
		return parametersResult;
	}

	const returnType = await typeChecker.getReturnTypeOfSignature(signature);
	const returnGoType = await DCommon.asyncPipe(
		localGoTypeOf(returnType, site, context),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(returnGoType)) {
		return returnGoType;
	}

	if (!DArray.lengthEqual(returnGoType.before, 0)) {
		return context.error(site, "unsupported-before-on-function-value-return-type");
	}

	const bodyResult = await DCommon.asyncPipe(
		body(parametersResult.identifiers),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(bodyResult)) {
		return bodyResult;
	}

	return context.success({
		result: GoAST.createFunctionLiteral({
			arguments: parametersResult.functionArguments,
			returnTypes: [returnGoType.result],
			body: GoAST.createBlockStatement({
				statements: [
					...bodyResult.before,
					GoAST.createReturnStatement({ values: [bodyResult.result] }),
				],
			}),
		}),
	});
}
