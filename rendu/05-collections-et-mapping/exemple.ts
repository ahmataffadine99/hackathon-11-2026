import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

const numbers = [10, 20, 30];
const strings = DArray.map(numbers, DString.to);
