import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DGenerator from "@duplojs/lang/generator";
import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DPattern from "@duplojs/lang/pattern";
import { type BuildContext } from "../../../context/build";
import { successExpressionHandler } from "./success";
import { failExpressionHandler } from "./fail";
import { isRightExpressionHandler, isLeftExpressionHandler } from "./isRight";
import { eitherTypeHandler, eitherTypeNames, type EitherTypeMember } from "./types";

export const duploJSEitherDeclarationTransformer: Transformer<GoAST.Declaration> = createTransformer(
	(_node, context) => context.notSupport(),
);

export const duploJSEitherExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		const reference = TsAST.isCallExpression(node)
			? node.expression
			: node;

		if (
			!TsAST.isIdentifier(reference)
			&& !TsAST.isPropertyAccessExpression(reference)
		) {
			return context.notSupport();
		}

		const moduleReference = await DCommon.asyncPipe(
			context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/either\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			moduleReference.symbol.name,
			DPattern.match(
				DCommon.equal("success"),
				() => successExpressionHandler(
					node,
					context,
				),
			),
			DPattern.match(
				DCommon.equal("fail"),
				() => failExpressionHandler(
					node,
					context,
				),
			),
			DPattern.match(DCommon.equal("isRight"), () => isRightExpressionHandler(node, context)),
			DPattern.match(DCommon.equal("isLeft"), () => isLeftExpressionHandler(node, context)),
			DPattern.otherwise(
				() => context.error(node),
			),
		);
	},
);

// Un membre de type est reconnu par son symbole résolu (module @duplojs/lang,
// entrée dist/either/), y compris sur les nœuds synthétiques produits par
// typeToTypeNode (types inférés), sur lesquels getTypeFromTypeNode échoue.
async function resolveEitherTypeMember(
	node: TsAST.TypeNode,
	context: BuildContext,
): Promise<DEither.Maybe<EitherTypeMember>> {
	if (!TsAST.isTypeReferenceNode(node) && !TsAST.isImportTypeNode(node)) {
		return DEither.none();
	}

	const moduleReference = await DCommon.asyncPipe(
		context.resolveReferenceModule(
			TsAST.isTypeReferenceNode(node) ? node.typeName : node,
			"@duplojs/lang",
			/^dist\/either\//,
		),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(moduleReference)) {
		return DEither.none();
	}

	const name = DArray.find(
		eitherTypeNames,
		(eitherTypeName) => eitherTypeName === moduleReference.symbol.name,
	);

	return name
		? DEither.some({
			name,
			node,
		})
		: DEither.none();
}

export const duploJSEitherTypeTransformer: Transformer<GoAST.GenericTypeReference> = createTransformer(
	async(node, context) => {
		if (!TsAST.isTypeNode(node)) {
			return context.notSupport();
		}

		const memberNodes = TsAST.isUnionTypeNode(node)
			? node.types
			: [node];

		// Tous les membres doivent appartenir au domaine either ; sinon l'union
		// relève d'une autre représentation (ADR-2) et on laisse la main.
		const members = await DCommon.asyncPipe(
			memberNodes,
			DGenerator.asyncReduce(
				DGenerator.reduceFrom<readonly EitherTypeMember[]>([]),
				async({ item, lastValue, next, exit }) => {
					const member = DEither.unwrapRight(await resolveEitherTypeMember(item, context));

					return DEither.isLeft(member)
						? exit(undefined)
						: next(DArray.push(lastValue, member));
				},
			),
		);

		if (!members) {
			return context.notSupport();
		}

		return eitherTypeHandler(node, members, context);
	},
);
