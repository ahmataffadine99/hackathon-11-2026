import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSExpressionTransformers } from "../duplojs";
import { identifierTransformer } from "../common";
import { numericLiteralTransformer } from "./numericLiteral";
import { stringLiteralTransformer } from "./stringLiteral";
import { booleanLiteralTransformer } from "./booleanLiteral";
import { arrayLiteralTransformer } from "./arrayLiteral";
import { prefixUnaryExpressionTransformer } from "./prefixUnary";
import { sharedExpressionTransformers } from "../shared";
import { binaryExpressionTransformer } from "./binary";

export const expressionTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Expression>[] => [
		...duploJSExpressionTransformers.value,
		...sharedExpressionTransformers.value,
		identifierTransformer,
		numericLiteralTransformer,
		stringLiteralTransformer,
		booleanLiteralTransformer,
		arrayLiteralTransformer,
		prefixUnaryExpressionTransformer,
		binaryExpressionTransformer,
	],
);
