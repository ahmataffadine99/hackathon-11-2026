import * as DEither from "@duplojs/lang/either";

async function run() {
	return await DEither.rightAsyncPipe(
		addAsync(1, 2),
		async (sum) => divideAsync(sum, 3),
	);
}
