import { GoAST } from "@go";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from "../type";
import { expressionTransformers } from "../expression";

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

		if (!TsAST.isIdentifier(declaration.name)) {
			return context.error(declaration.name, "variable-name-is-not-identifier");
		}

		if (!declaration.initializer) {
			return context.error(declaration, "missing-variable-initializer");
		}

		const identifier = context.createSourceIdentifier(declaration.name.text);
		const initializer = await DCommon.asyncPipe(
			context.transform(declaration.initializer, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(initializer)) {
			return initializer;
		}

		if (node.parent?.kind !== TsAST.SyntaxKind.SourceFile) {
			return context.success({
				before: initializer.before,
				result: GoAST.createShortVariableDeclarationStatement({
					identifier,
					initializer: initializer.result,
				}),
			});
		}

		const type = await context.transpilation.typeChecker.getTypeAtLocation(declaration.name);
		const baseType = await context.transpilation.typeChecker.getBaseTypeOfLiteralType(type);
		const typeNode = await context.transpilation.typeChecker.typeToTypeNode(baseType, declaration);

		if (!typeNode) {
			return context.error(declaration.name, "unable-to-create-variable-type-node");
		}

		const typeResult = await DCommon.asyncPipe(
			context.transform(typeNode, typeTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(typeResult)) {
			return typeResult;
		}

		if (!DArray.lengthEqual(typeResult.before, 0)) {
			return context.error(typeNode, "unsupported-before-on-variable-type");
		}

		context.file.declarations.add(
			GoAST.createVariableDeclarationZeroValue({
				identifier,
				typeReference: typeResult.result,
			}),
		);

		return context.success({
			before: initializer.before,
			result: GoAST.createAssignmentStatement({
				targets: DCommon.cast([identifier]),
				values: DCommon.cast([initializer.result]),
			}),
		});
	},
);
