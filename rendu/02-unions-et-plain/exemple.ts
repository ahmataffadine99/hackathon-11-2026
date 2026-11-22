import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";

export function wrapIfRight(result: DEither.Either<number, string>) {
	return DEither.whenIsRight(result, DArray.coalescing);
}
