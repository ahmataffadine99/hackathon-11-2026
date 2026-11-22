import * as DEither from "@duplojs/lang/either";

function calculate(one: number, two: number, divisor: number) {
	return DEither.rightPipe(
		add(one, two),
		(sum) => divide(sum, divisor),
	);
}
