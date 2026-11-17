import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { GoAST, GoPrinter } from "@go";
import { TsAST } from "@typescript";
import { type Transformer } from "@transformer";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { goTypeOf, goTypeOfExpression } from "../../../type/goTypeOf";
import {
	either2FromLeftFunctionIdentifier,
	either2SuccessFunctionIdentifier,
	eitherDependency,
} from "../sharedDependency";
import { getEither2GoTypes, getEitherValueAccess } from "../goType";

const makeIdentifier = GoAST.createIdentifier("make");
const lenIdentifier = GoAST.createIdentifier("len");
const appendIdentifier = GoAST.createIdentifier("append");
const isLeftIdentifier = GoAST.createIdentifier("IsLeft");

export async function groupExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	if (!TsAST.isCallExpression(node) || node.arguments.length !== 1) {
		return context.error(node, "duplojs-either-group-requires-exactly-one-array");
	}

	const [arrayNode] = node.arguments;

	if (!arrayNode || TsAST.isSpreadElement(arrayNode)) {
		return context.error(node, "duplojs-either-group-spread-is-not-supported");
	}

	const array = DEither.unwrapRight(
		await context.transform(arrayNode, expressionTransformers.value),
	);

	if (DEither.isLeft(array)) {
		return array;
	}

	const arrayGoType = DEither.unwrapRight(await goTypeOfExpression(arrayNode, context));

	if (DEither.isLeft(arrayGoType)) {
		return arrayGoType;
	}

	if (!DModeling.hasTagValue(arrayGoType.result, "[node][type]slice")) {
		return context.error(arrayNode, "duplojs-either-group-input-is-not-a-slice");
	}

	const resultGoType = DEither.unwrapRight(
		await goTypeOf(await context.transpilation.typeChecker.getTypeAtLocation(node), node, context),
	);

	if (DEither.isLeft(resultGoType)) {
		return resultGoType;
	}

	const resultTypes = DEither.unwrapRight(getEither2GoTypes(resultGoType.result));

	if (DEither.isLeft(resultTypes)) {
		return context.error(node, "duplojs-either-group-result-is-not-either2");
	}

	const elementType = arrayGoType.result.elementType;
	const valueAccess = DEither.unwrapRight(getEitherValueAccess(elementType));

	if (DEither.isLeft(valueAccess)) {
		return context.error(arrayNode, "duplojs-either-group-elements-are-not-eithers");
	}

	if (GoPrinter.renderNode(valueAccess.valueType) !== GoPrinter.renderNode(resultTypes.leftType)) {
		return context.error(node, "duplojs-either-group-left-type-mismatch");
	}

	if (!DModeling.hasTagValue(resultTypes.rightType, "[node][type]slice")) {
		return context.error(node, "duplojs-either-group-right-type-is-not-a-slice");
	}

	const packageName = context.registerSharedDependency(eitherDependency.value);
	const arrayIdentifier = context.generateIdentifier();
	const outputIdentifier = context.generateIdentifier();
	const resultIdentifier = context.generateIdentifier();
	const elementIdentifier = context.generateIdentifier();
	const hasLeftIdentifier = context.generateIdentifier();
	const outputType = GoAST.createSliceType({
		elementType: resultTypes.rightType.elementType,
	});

	const leftConstructor = GoAST.createCallExpression({
		callee: GoAST.createInstantiationExpression({
			target: GoAST.createSelectorExpression({
				target: packageName,
				identifier: either2FromLeftFunctionIdentifier,
			}),
			typeArguments: DCommon.cast([resultTypes.leftType, resultTypes.rightType]),
		}),
		arguments: [elementIdentifier],
	});
	const successConstructor = GoAST.createCallExpression({
		callee: GoAST.createInstantiationExpression({
			target: GoAST.createSelectorExpression({
				target: packageName,
				identifier: either2SuccessFunctionIdentifier,
			}),
			typeArguments: DCommon.cast([resultTypes.leftType, resultTypes.rightType]),
		}),
		arguments: [outputIdentifier],
	});

	return context.success({
		before: [
			...array.before,
			GoAST.createShortVariableDeclarationStatement({
				identifier: arrayIdentifier,
				initializer: array.result,
			}),
			GoAST.createShortVariableDeclarationStatement({
				identifier: outputIdentifier,
				initializer: GoAST.createCallExpression({
					callee: makeIdentifier,
					arguments: DCommon.cast([
						outputType as unknown as GoAST.Expression,
						GoAST.createIntegerLiteral({ value: 0n }),
						GoAST.createCallExpression({
							callee: lenIdentifier,
							arguments: [arrayIdentifier],
						}),
					]),
				}),
			}),
			GoAST.createShortVariableDeclarationStatement({
				identifier: hasLeftIdentifier,
				initializer: GoAST.createBooleanLiteral({ value: false }),
			}),
			GoAST.createVariableDeclarationZeroValue({
				identifier: resultIdentifier,
				typeReference: resultGoType.result,
			}),
			GoAST.createRangeStatement({
				binding: GoAST.createRangeDeclaration({
					key: GoAST.createIdentifier("_"),
					value: elementIdentifier,
				}),
				expression: arrayIdentifier,
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createIfStatement({
							condition: GoAST.createCallExpression({
								callee: GoAST.createSelectorExpression({
									target: elementIdentifier,
									identifier: isLeftIdentifier,
								}),
								arguments: [],
							}),
							body: GoAST.createBlockStatement({
								statements: [
									GoAST.createAssignmentStatement({
										targets: DCommon.cast([resultIdentifier]),
										values: DCommon.cast([leftConstructor]),
									}),
									GoAST.createAssignmentStatement({
										targets: DCommon.cast([hasLeftIdentifier]),
										values: DCommon.cast([GoAST.createBooleanLiteral({ value: true })]),
									}),
									GoAST.createBreakStatement({}),
								],
							}),
						}),
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([outputIdentifier]),
							values: DCommon.cast([
								GoAST.createCallExpression({
									callee: appendIdentifier,
									arguments: DCommon.cast([
										outputIdentifier,
										GoAST.createSelectorExpression({
											target: elementIdentifier,
											identifier: valueAccess.field,
										}),
									]),
								}),
							]),
						}),
					],
				}),
			}),
			GoAST.createIfStatement({
				condition: GoAST.createUnaryExpression({
					operator: "!",
					operand: hasLeftIdentifier,
				}),
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([resultIdentifier]),
							values: DCommon.cast([successConstructor]),
						}),
					],
				}),
			}),
		],
		result: resultIdentifier,
	});
}
