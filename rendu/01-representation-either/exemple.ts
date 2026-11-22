import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

export function add(one: number, two: number): (
	| DEither.Success<number>
	| DEither.Fail
) {
	return DEither.success(one + two);
}

const result = add(1, 2);

if (DEither.isRight(result)) {
	DCommon.print(result);
}
