import * as DCommon from "@duplojs/lang/common";
import { type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { duploJSTypeTransformers } from "../duplojs";
import { sharedTypeTransformers } from "../shared";
import { float64TypeTransformer } from "./float";
import { numberLiteralTypeTransformer } from "./numberLiteral";
import { parenthesizedTypeTransformer } from "./parenthesized";

export const typeTransformers = DCommon.memo(
	(): readonly Transformer<GoAST.Type | GoAST.TypeReference>[] => [
		...duploJSTypeTransformers.value,
		...sharedTypeTransformers.value,
		parenthesizedTypeTransformer,
		float64TypeTransformer,
		numberLiteralTypeTransformer,
	],
);
