import * as DCommon from "@duplojs/lang/common";
import { duploJSEitherDeclarationTransformer, duploJSEitherExpressionTransformer, duploJSEitherTypeTransformer } from "./either";
import { duploJSCommonDeclarationTransformer, duploJSCommonExpressionTransformer, duploJSCommonTypeTransformer } from "./common";
import type { GoAST } from "@go";
import { type Transformer } from "@transformer";

export const duploJSDeclarationTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Declaration>[] => [
		duploJSEitherDeclarationTransformer,
		duploJSCommonDeclarationTransformer,
	],
);
export const duploJSExpressionTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Expression>[] => [
		duploJSEitherExpressionTransformer,
		duploJSCommonExpressionTransformer,
	],
);
export const duploJSStatementTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Statement>[] => [],
);
export const duploJSTypeTransformers = DCommon.memo(
	() => [duploJSEitherTypeTransformer, duploJSCommonTypeTransformer],
);
