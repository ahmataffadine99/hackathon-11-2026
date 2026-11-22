import * as DEither from "@duplojs/lang/either";

const steps = [
	add(1, 2),
	add(3, 4),
];

const transaction = DEither.group(steps);
