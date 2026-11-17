import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

// Représentation A de l'ADR-1 (docs/decisions/ADR-1-either.md) :
// Success<T>, Fail, Left<I, T>, Right<I, T> et leurs unions partagent Either[V].

export const eitherKindIdentifier = GoAST.createIdentifier("EitherKind");
export const eitherTypeIdentifier = GoAST.createIdentifier("Either");
// V d'un Either sans valeur (Fail seul) : JSUndefined, dépendance par défaut.
export const eitherNoValueIdentifier = GoAST.createIdentifier("JSUndefined");
export const eitherSuccessFunctionIdentifier = GoAST.createIdentifier("EitherSuccessOf");
export const eitherFailFunctionIdentifier = GoAST.createIdentifier("EitherFailOf");
// ADR-2 : valeur nue (non Either) rangée dans une union Either[V].
export const eitherPlainFunctionIdentifier = GoAST.createIdentifier("EitherPlainOf");
// ADR-2 : Either[From] vers Either[To] quand les variantes en jeu n'ont pas de valeur.
export const eitherRetypeFunctionIdentifier = GoAST.createIdentifier("EitherRetype");

export const eitherKindIdentifiers = {
	right: GoAST.createIdentifier("EitherKindRight"),
	left: GoAST.createIdentifier("EitherKindLeft"),
	success: GoAST.createIdentifier("EitherKindSuccess"),
	fail: GoAST.createIdentifier("EitherKindFail"),
	plain: GoAST.createIdentifier("EitherKindPlain"),
} as const;

// TEMPORAIRE : InspectEntry appartient au contrat de la dépendance par défaut
// « inspect » de la Personne 3. À supprimer d'ici au rebase sur sa branche.
export const temporaryInspectEntryIdentifier = GoAST.createIdentifier("InspectEntry");

const eitherKeyPrefix = "@duplojs/lang/kind/@DuplojsLangEither/";

export const eitherDependency = DCommon.memo(() => {
	const generic = GoAST.createIdentifier("V");
	const receiver = GoAST.createIdentifier("e");
	const valueArgument = GoAST.createIdentifier("value");
	const fieldIdentifiers = {
		kind: GoAST.createIdentifier("Kind"),
		information: GoAST.createIdentifier("Information"),
		value: GoAST.createIdentifier("Value"),
	};
	const inspectFieldIdentifiers = {
		key: GoAST.createIdentifier("Key"),
		value: GoAST.createIdentifier("Value"),
	};

	const typeParameter = GoAST.createTypeParameter({
		identifier: generic,
		constraint: GoAST.builtinTypeReferences.any,
	});

	const eitherOfGeneric = GoAST.createGenericTypeReference({
		typeReference: eitherTypeIdentifier,
		typeArguments: DCommon.cast([generic]),
	});

	const retypeToParameter = GoAST.createTypeParameter({
		identifier: GoAST.createIdentifier("To"),
		constraint: GoAST.builtinTypeReferences.any,
	});

	const retypeFromParameter = GoAST.createTypeParameter({
		identifier: GoAST.createIdentifier("From"),
		constraint: GoAST.builtinTypeReferences.any,
	});

	const eitherOfRetypeTo = GoAST.createGenericTypeReference({
		typeReference: eitherTypeIdentifier,
		typeArguments: DCommon.cast([retypeToParameter.identifier]),
	});

	const receiverField = (field: GoAST.Identifier) => GoAST.createSelectorExpression({
		target: receiver,
		identifier: field,
	});

	const kindEquals = (kind: GoAST.Identifier) => GoAST.createBinaryExpression({
		operator: "==",
		left: receiverField(fieldIdentifiers.kind),
		right: kind,
	});

	const eitherLiteral = (
		kind: GoAST.Identifier,
		information: GoAST.Expression,
		value: GoAST.Expression | undefined,
	) => GoAST.createStructLiteral({
		typeReference: eitherOfGeneric,
		elements: [
			GoAST.createKeyedElement({
				key: fieldIdentifiers.kind,
				value: kind,
			}),
			GoAST.createKeyedElement({
				key: fieldIdentifiers.information,
				value: information,
			}),
			...(value
				? [
					GoAST.createKeyedElement({
						key: fieldIdentifiers.value,
						value,
					}),
				]
				: []),
		],
	});

	const inspectEntry = (key: string, value: GoAST.Expression) => GoAST.createStructLiteral({
		typeReference: temporaryInspectEntryIdentifier,
		elements: [
			GoAST.createKeyedElement({
				key: inspectFieldIdentifiers.key,
				value: GoAST.createStringLiteral({ value: `${eitherKeyPrefix}${key}` }),
			}),
			GoAST.createKeyedElement({
				key: inspectFieldIdentifiers.value,
				value,
			}),
		],
	});

	const nullLiteral = GoAST.createStructLiteral({
		typeReference: GoAST.createIdentifier("JSNull"),
		elements: [],
	});

	const undefinedLiteral = GoAST.createStructLiteral({
		typeReference: GoAST.createIdentifier("JSUndefined"),
		elements: [],
	});

	// Ordre des clés identique à celui affiché par DCommon.print
	// (docs/duplojs-semantics.md, Q2) : côté, information, value, puis tag éventuel.
	const returnInspectEntries = (
		side: "right" | "left",
		value: GoAST.Expression,
		tag: "success" | "fail" | undefined,
	) => GoAST.createReturnStatement({
		values: [
			GoAST.createSliceLiteral({
				typeReference: GoAST.createSliceType({
					elementType: temporaryInspectEntryIdentifier,
				}),
				elements: [
					inspectEntry(side, nullLiteral),
					inspectEntry("information", receiverField(fieldIdentifiers.information)),
					inspectEntry("value", value),
					...(tag ? [inspectEntry(tag, nullLiteral)] : []),
				],
			}),
		],
	});

	const isSideMethod = (
		identifier: GoAST.Identifier,
		kinds: readonly [GoAST.Identifier, GoAST.Identifier],
	) => GoAST.createMethodDeclaration({
		identifier,
		receiver: [receiver, eitherOfGeneric],
		generic: [],
		arguments: [],
		returnTypes: [GoAST.builtinTypeReferences.bool],
		body: GoAST.createBlockStatement({
			statements: [
				GoAST.createReturnStatement({
					values: [
						GoAST.createBinaryExpression({
							operator: "||",
							left: kindEquals(kinds[0]),
							right: kindEquals(kinds[1]),
						}),
					],
				}),
			],
		}),
	});

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeDefinition({
				identifier: eitherKindIdentifier,
				type: GoAST.builtinTypeReferences.uint8,
			}),
			...DArray.map(
				[
					eitherKindIdentifiers.right,
					eitherKindIdentifiers.left,
					eitherKindIdentifiers.success,
					eitherKindIdentifiers.fail,
					eitherKindIdentifiers.plain,
				],
				(identifier, { index }) => GoAST.createConstantDeclaration({
					identifier,
					typeReference: eitherKindIdentifier,
					initializer: GoAST.createIntegerLiteral({ value: BigInt(index) }),
				}),
			),
			GoAST.createTypeDefinition({
				identifier: eitherTypeIdentifier,
				generic: [typeParameter],
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: fieldIdentifiers.kind,
							typeReference: eitherKindIdentifier,
						}),
						GoAST.createStructField({
							identifier: fieldIdentifiers.information,
							typeReference: GoAST.builtinTypeReferences.string,
						}),
						GoAST.createStructField({
							identifier: fieldIdentifiers.value,
							typeReference: generic,
						}),
					],
				}),
			}),
			GoAST.createFunctionDeclaration({
				identifier: eitherSuccessFunctionIdentifier,
				generic: [typeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: valueArgument,
						type: generic,
					}),
				],
				returnTypes: [eitherOfGeneric],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								eitherLiteral(
									eitherKindIdentifiers.success,
									GoAST.createStringLiteral({ value: "success" }),
									valueArgument,
								),
							],
						}),
					],
				}),
			}),
			// fail() n'a pas de valeur (undefined en JS) : Value garde la valeur zéro de V.
			GoAST.createFunctionDeclaration({
				identifier: eitherFailFunctionIdentifier,
				generic: [typeParameter],
				arguments: [],
				returnTypes: [eitherOfGeneric],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								eitherLiteral(
									eitherKindIdentifiers.fail,
									GoAST.createStringLiteral({ value: "fail" }),
									undefined,
								),
							],
						}),
					],
				}),
			}),
			// ADR-2 : une valeur nue (ex. le tableau renvoyé par coalescing dans
			// whenIsRight) garde sa représentation par valeur dans Either[V].
			// Elle n'a ni côté ni information : IsRight et IsLeft sont faux,
			// comme DEither.isRight / isLeft à l'exécution sur une valeur non Either.
			GoAST.createFunctionDeclaration({
				identifier: eitherPlainFunctionIdentifier,
				generic: [typeParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: valueArgument,
						type: generic,
					}),
				],
				returnTypes: [eitherOfGeneric],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createStructLiteral({
									typeReference: eitherOfGeneric,
									elements: [
										GoAST.createKeyedElement({
											key: fieldIdentifiers.kind,
											value: eitherKindIdentifiers.plain,
										}),
										GoAST.createKeyedElement({
											key: fieldIdentifiers.value,
											value: valueArgument,
										}),
									],
								}),
							],
						}),
					],
				}),
			}),
			// Either[From] vers Either[To] : conserve Kind et Information, abandonne
			// Value. Correct uniquement pour des variantes sans valeur (Fail) :
			// coerceExpression ne l'émet que dans ce cas (ADR-2).
			GoAST.createFunctionDeclaration({
				identifier: eitherRetypeFunctionIdentifier,
				generic: [retypeToParameter, retypeFromParameter],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: receiver,
						type: GoAST.createGenericTypeReference({
							typeReference: eitherTypeIdentifier,
							typeArguments: DCommon.cast([retypeFromParameter.identifier]),
						}),
					}),
				],
				returnTypes: [eitherOfRetypeTo],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createStructLiteral({
									typeReference: eitherOfRetypeTo,
									elements: [
										GoAST.createKeyedElement({
											key: fieldIdentifiers.kind,
											value: receiverField(fieldIdentifiers.kind),
										}),
										GoAST.createKeyedElement({
											key: fieldIdentifiers.information,
											value: receiverField(fieldIdentifiers.information),
										}),
									],
								}),
							],
						}),
					],
				}),
			}),
			isSideMethod(
				GoAST.createIdentifier("IsRight"),
				[eitherKindIdentifiers.right, eitherKindIdentifiers.success],
			),
			isSideMethod(
				GoAST.createIdentifier("IsLeft"),
				[eitherKindIdentifiers.left, eitherKindIdentifiers.fail],
			),
			// Contrat ADR-2 avec Print (defaults/inspect) : Print teste InspectPlain
			// AVANT InspectEntries ; un Plain s'affiche donc comme sa valeur nue et
			// InspectEntries n'est jamais appelé pour lui.
			GoAST.createMethodDeclaration({
				identifier: GoAST.createIdentifier("InspectPlain"),
				receiver: [receiver, eitherOfGeneric],
				generic: [],
				arguments: [],
				returnTypes: [GoAST.builtinTypeReferences.any, GoAST.builtinTypeReferences.bool],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createIfStatement({
							condition: kindEquals(eitherKindIdentifiers.plain),
							body: GoAST.createBlockStatement({
								statements: [
									GoAST.createReturnStatement({
										values: [
											receiverField(fieldIdentifiers.value),
											GoAST.createBooleanLiteral({ value: true }),
										],
									}),
								],
							}),
						}),
						GoAST.createReturnStatement({
							values: [
								GoAST.createNilLiteral({}),
								GoAST.createBooleanLiteral({ value: false }),
							],
						}),
					],
				}),
			}),
			GoAST.createMethodDeclaration({
				identifier: GoAST.createIdentifier("InspectEntries"),
				receiver: [receiver, eitherOfGeneric],
				generic: [],
				arguments: [],
				returnTypes: [
					GoAST.createSliceType({
						elementType: temporaryInspectEntryIdentifier,
					}),
				],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createExpressionSwitchStatementWithDefault({
							expression: receiverField(fieldIdentifiers.kind),
							casesBeforeDefault: [
								GoAST.createExpressionSwitchCase({
									expressions: DCommon.cast([eitherKindIdentifiers.success]),
									statements: [
										returnInspectEntries(
											"right",
											receiverField(fieldIdentifiers.value),
											"success",
										),
									],
								}),
								GoAST.createExpressionSwitchCase({
									expressions: DCommon.cast([eitherKindIdentifiers.fail]),
									statements: [returnInspectEntries("left", undefinedLiteral, "fail")],
								}),
								GoAST.createExpressionSwitchCase({
									expressions: DCommon.cast([eitherKindIdentifiers.right]),
									statements: [
										returnInspectEntries(
											"right",
											receiverField(fieldIdentifiers.value),
											undefined,
										),
									],
								}),
							],
							defaultCase: GoAST.createDefaultCase({
								statements: [
									returnInspectEntries(
										"left",
										receiverField(fieldIdentifiers.value),
										undefined,
									),
								],
							}),
							casesAfterDefault: [],
						}),
					],
				}),
			}),
			// TEMPORAIRE (voir temporaryInspectEntryIdentifier).
			GoAST.createTypeDefinition({
				identifier: temporaryInspectEntryIdentifier,
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: inspectFieldIdentifiers.key,
							typeReference: GoAST.builtinTypeReferences.string,
						}),
						GoAST.createStructField({
							identifier: inspectFieldIdentifiers.value,
							typeReference: GoAST.builtinTypeReferences.any,
						}),
					],
				}),
			}),
		],
	});
});
