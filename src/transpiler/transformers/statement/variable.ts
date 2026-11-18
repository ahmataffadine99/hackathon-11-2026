import { GoAST } from "@go";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from "../type";
import { expressionTransformers } from "../expression";
import { bindArrayPattern } from "../expression/bindArrayPattern";
import { goTypeOf, goTypeOfExpression, type GoType } from "../type/goTypeOf";
import { coerceGoExpression } from "../duplojs/either/coerce";
import { isExpectedTypeEitherConstructor } from "../duplojs/either/constructor";
import { type BuildContext } from "../../context/build";
import * as DModeling from "@duplojs/lang/modeling";

/**
 * ADR-13 : initialiseur converti vers le type Go de la variable (membre vers
 * union étiquetée…). Sans conversion possible : inchangé (comportement antérieur).
 */
async function coerceInitializer(
	initializerNode: TsAST.Expression,
	expression: GoAST.Expression,
	targetGoType: GoType,
	context: BuildContext,
) {
	if (await isExpectedTypeEitherConstructor(initializerNode, context)) {
		return expression;
	}

	const initializerGoType = DEither.unwrapRight(await goTypeOfExpression(initializerNode, context));

	if (DEither.isLeft(initializerGoType)) {
		return expression;
	}

	const coerced = await coerceGoExpression({
		expression,
		fromGoType: initializerGoType.result,
		toGoType: targetGoType,
		from: await context.transpilation.typeChecker.getTypeAtLocation(initializerNode),
	}, context);

	return DEither.isLeft(coerced) ? expression : DEither.unwrapRight(coerced).result;
}

export const variableStatementTransformer: Transformer<GoAST.Statement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isVariableStatement(node)) {
			return context.notSupport();
		}

		if (
			node.declarationList.flags !== TsAST.NodeFlags.Const
			&& node.declarationList.flags !== TsAST.NodeFlags.Let
		) {
			return context.error(node, "unsupported-variable-declaration-kind");
		}

		if (!DArray.lengthEqual(node.declarationList.declarations, 1)) {
			return context.error(node, "multiple-variable-declarations-not-supported");
		}

		const declaration = DArray.first(node.declarationList.declarations);

		if (!declaration) {
			return context.error(node, "empty-variable-statement");
		}

		if (!declaration.initializer) {
			return context.error(declaration, "missing-variable-initializer");
		}

		const initializer = await DCommon.asyncPipe(
			context.transform(declaration.initializer, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(initializer)) {
			return initializer;
		}

		if (TsAST.isArrayBindingPattern(declaration.name)) {
			const sourceGoType = await DCommon.asyncPipe(
				goTypeOfExpression(declaration.initializer, context),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(sourceGoType)) {
				return sourceGoType;
			}

			const sourceIdentifier = context.generateIdentifier();
			const bindings = await DCommon.asyncPipe(
				bindArrayPattern({
					pattern: declaration.name,
					source: sourceIdentifier,
					sourceGoType: sourceGoType.result,
					context,
				}),
				DEither.unwrapRight,
			);

			if (DEither.isLeft(bindings)) {
				return bindings;
			}

			if (bindings.length === 0) {
				return context.success({
					before: [
						...initializer.before,
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([GoAST.createIdentifier("_")]),
							values: DCommon.cast([initializer.result]),
						}),
					],
					result: GoAST.createBlockStatement({
						statements: [],
					}),
				});
			}

			if (!DModeling.hasTagValue(sourceGoType.result, "[node][type]slice")) {
				return context.error(declaration.name, "array-destructuring-source-is-not-a-slice");
			}

			const sourceBinding = GoAST.createShortVariableDeclarationStatement({
				identifier: sourceIdentifier,
				initializer: initializer.result,
			});

			if (node.parent?.kind !== TsAST.SyntaxKind.SourceFile) {
				const statements = DArray.concat(
					initializer.before,
					[sourceBinding],
					bindings,
				);
				const result = statements[statements.length - 1];

				if (!result) {
					return context.error(declaration.name, "empty-array-destructuring-result");
				}

				return context.success({
					before: statements.slice(0, -1),
					result,
				});
			}

			const assignments: GoAST.Statement[] = [];

			for (const binding of bindings) {
				if (!DModeling.hasTagValue(binding, "[node][statement]variable-short")) {
					return context.error(declaration.name, "unexpected-array-destructuring-binding");
				}

				context.file.declarations.add(
					GoAST.createVariableDeclarationZeroValue({
						identifier: binding.identifier,
						typeReference: sourceGoType.result.elementType,
					}),
				);

				assignments.push(
					GoAST.createAssignmentStatement({
						targets: DCommon.cast([binding.identifier]),
						values: DCommon.cast([binding.initializer]),
					}),
				);
			}

			const result = assignments[assignments.length - 1];

			if (!result) {
				return context.error(declaration.name, "empty-array-destructuring-result");
			}

			return context.success({
				before: DArray.concat(
					initializer.before,
					[sourceBinding],
					assignments.slice(0, -1),
				),
				result,
			});
		}

		if (!TsAST.isIdentifier(declaration.name)) {
			return context.error(declaration.name, "object-destructuring-variable-is-not-supported");
		}

		if (node.parent?.kind !== TsAST.SyntaxKind.SourceFile) {
			const identifier = context.createSourceIdentifier(declaration.name.text);
			const annotatedGoType = declaration.type
				? DEither.unwrapRight(await context.transform(declaration.type, typeTransformers.value))
				: undefined;

			// ADR-13 : `const x: string | number = 3` : variable du type annoncé.
			if (
				annotatedGoType
				&& !DEither.isLeft(annotatedGoType)
				&& DArray.lengthEqual(annotatedGoType.before, 0)
			) {
				const coerced = await coerceInitializer(
					declaration.initializer,
					initializer.result,
					annotatedGoType.result,
					context,
				);

				if (coerced !== initializer.result) {
					return context.success({
						before: initializer.before,
						result: GoAST.createVariableDeclarationInitialized({
							identifier,
							typeReference: DCommon.cast(annotatedGoType.result),
							initializer: coerced,
						}),
					});
				}
			}

			return context.success({
				before: initializer.before,
				result: GoAST.createShortVariableDeclarationStatement({
					identifier,
					initializer: initializer.result,
				}),
			});
		}

		const identifier = context.createTopLevelIdentifier(context.file.currentFilePath, declaration.name.text);
		const type = await context.transpilation.typeChecker.getTypeAtLocation(declaration.name);
		const baseType = await context.transpilation.typeChecker.getBaseTypeOfLiteralType(type);
		const typeResult = await DCommon.asyncPipe(
			goTypeOf(baseType, declaration, context),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(typeResult)) {
			return typeResult;
		}

		context.file.declarations.add(
			GoAST.createVariableDeclarationZeroValue({
				identifier,
				typeReference: typeResult.result,
			}),
		);

		const value = await coerceInitializer(
			declaration.initializer,
			initializer.result,
			typeResult.result,
			context,
		);

		return context.success({
			before: initializer.before,
			result: GoAST.createAssignmentStatement({
				targets: DCommon.cast([identifier]),
				values: DCommon.cast([value]),
			}),
		});
	},
);
