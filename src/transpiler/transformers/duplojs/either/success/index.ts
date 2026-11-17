import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { transformCallExpression } from "../../../shared";
import { typeTransformers } from "../../../type";
import { eitherSuccessDependency, successFunctionIdentifier, successTypeIdentifier } from "./sharedDependency";

export async function successExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (TsAST.isCallExpression(node)) {
		const argumentNode = DArray.first(node.arguments);

		if (!argumentNode) {
			return context.error(node, "missing-success-value");
		}

		const argumentType = await context.transpilation.typeChecker.getTypeAtLocation(argumentNode);
		const argumentTypeNode = await context.transpilation.typeChecker.typeToTypeNode(
			argumentType,
			node,
		);

		if (!argumentTypeNode) {
			return context.error(argumentNode, "unable-to-create-success-type-node");
		}

		const genericArgument = await DCommon.asyncPipe(
			context.transform(argumentTypeNode, typeTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(genericArgument)) {
			return genericArgument;
		}

		if (!DArray.lengthEqual(genericArgument.before, 0)) {
			return context.error(argumentTypeNode, "un-support-before-on-success-type");
		}

		const packageName = context.registerSharedDependency(eitherSuccessDependency.value);

		return transformCallExpression(
			node,
			context,
			GoAST.createInstantiationExpression({
				target: GoAST.createSelectorExpression({
					target: packageName,
					identifier: successFunctionIdentifier,
				}),
				typeArguments: DCommon.cast([genericArgument.result]),
			}),
		);
	}

	const packageName = context.registerSharedDependency(eitherSuccessDependency.value);

	return context.success({
		result: GoAST.createSelectorExpression({
			target: packageName,
			identifier: successFunctionIdentifier,
		}),
	});
}

export async function successTypeHandler(
	node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode,
	context: BuildContext,
) {
	const argumentNode = node.typeArguments && DArray.first(node.typeArguments);

	if (!argumentNode) {
		return context.notSupport();
	}

	const argument = await DCommon.asyncPipe(
		context.transform(argumentNode, typeTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(argument)) {
		return argument;
	}

	return context.success({
		before: argument.before,
		result: GoAST.createGenericTypeReference({
			typeReference: GoAST.createPackageTypeReference({
				packageName: context.registerSharedDependency(eitherSuccessDependency.value),
				identifier: successTypeIdentifier,
			}),
			typeArguments: DCommon.cast([argument.result]),
		}),
	});
}
