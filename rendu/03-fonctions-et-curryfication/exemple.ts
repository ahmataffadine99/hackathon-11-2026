import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const result = DEither.success(42);

const piped = DCommon.pipe(
	result,
	DEither.whenIsRight(DArray.coalescing),
);
