import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import type { BuildContext } from "../../context/build";
import { typeTransformers } from "../type";

// Temporary P4 contract adapter; replace with type/goTypeOf before merging.
export async function goTypeOf(
	type: Type,
	site: TsAST.Node,
	context: BuildContext,
) {
	const typeNode = await context.transpilation.typeChecker.typeToTypeNode(type, site);

	if (!typeNode) {
		return context.error(site, "Could not create a Go type for this expression");
	}

	return context.transform(typeNode, typeTransformers.value);
}
