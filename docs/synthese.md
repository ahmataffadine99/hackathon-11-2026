# Synthèse : transpiler DuploJS vers Go

> Légende : **[observé]** = exécuté ou mesuré, la preuve est citée ; **[à vérifier]** = non encore confirmé par une exécution.
> État au 17/11 au soir : **exercices 00 à 09 identiques à TypeScript (10/11)** ; variantes **37/38** ; exercice 10 au Sprint 5 **[observé, `./scripts/check-all.sh` et `--variations` sur `main` `0f71e59`]**.

## La réponse en une phrase

**Oui, pour le sous-ensemble étudié** : guidé par le vérificateur de types de TypeScript, le transpileur produit du Go typé statiquement, **sans `any`, sans closure sur le tas et sans fonction générique non instanciée**, dont la sortie est **caractère pour caractère** celle du programme TypeScript. C'est possible **à condition** que les types soient résolus à la transpilation et que l'API DuploJS utilisée soit connue du transpileur.

## Démarche

1. **AST et checker.** Le code TypeScript est lu avec le compilateur TypeScript 7 (API asynchrone de `tsgo`). Toutes les décisions de traduction s'appuient sur les **types résolus** et les **symboles**, jamais sur le texte : `DEither.isRight`, `import { isRight as ok }` et `E.isRight` sont reconnus de la même façon (variante `01-alias`).
2. **Transformers.** Chaque nœud TS est traduit par une chaîne de transformers (déclarations, instructions, expressions, types, puis routeurs DuploJS par domaine : `either`, `array`, `string`, `common`). Un transformer réussit, refuse (`notSupport`) ou échoue avec une erreur explicite.
3. **`before` : l'ordre d'évaluation.** Une expression TS devient une expression Go **plus** une liste d'instructions préparatoires (`before`). On conserve ainsi l'ordre d'évaluation de JS, y compris dans les branches (ternaire, court-circuit, ADR-8), sans évaluer ce que JS n'évalue pas.
4. **Coercition.** TypeScript accepte implicitement qu'un `Success<number>` soit rangé dans un `Success<number> | Fail` ; Go non. Chaque conversion est **explicite** et instanciée (`EitherPlainOf[T]`, `EitherRetype[B, A]`, `Either2FromLeft[L, R]`), et refusée si elle perdrait de l'information.
5. **Callbacks.** Une fonction passée à une fonction d'ordre supérieur (`whenIsRight`, `map`, `pipe`…) est soit **inlinée** (fonction DuploJS générique connue : `coalescing`, `to`), soit traduite en **valeur Go appelée**. Ses types viennent de la **signature résolue de l'appel englobant**, où TypeScript a instancié les génériques (ADR-7).
6. **Validation.** Pour chaque exercice et chaque variante : sortie `tsx` (référence), transpilation, `go vet`, `go run`, puis `diff`. `./scripts/compare-main.sh` contrôle chaque PR (régressions, code provisoire).

## Décisions clés, avec le Go produit

### `Either` par valeur (ADR-1, ADR-2, ADR-12)

`Success<T>`, `Fail`, `Left<I, T>` et leurs unions deviennent **une même struct par valeur**, `Either[V]` (discriminant `Kind`, `Information`, `Value`). Une valeur nue mêlée à des Either (`Fail | readonly [number]`) est portée par une 5e forme, `Plain` (ADR-2). Quand les deux côtés ont des types différents (résultat de `group` : `Left<…, number> | Success<number[]>`), on bascule sur `Either2[L, R]` (A'), **uniquement** dans ce cas.

**[observé, ADR-1 §4]** Dès qu'une fonction n'est pas inlinée, les représentations par interface (B, C) **allouent à chaque retour** et sont **8 à 14 fois plus lentes** que A. Sur 1000 calculs (`map` + `rightPipe`), A coûte **1 allocation** contre **2 001** pour B et C.

### Combinateurs inlinés, `pipe` en appels séquentiels (ADR-3, ADR-7, ADR-10)

`pipe(result, whenIsRight(coalescing))` (ex. 03) donne, sans fonction générique en valeur (préfixe `shard_dependencies.` retiré et littéral sur une ligne, pour la lecture ; extrait réel dans la [fiche 03](exercises/03.md)) :

```go
Generated_9 := func(Generated_7 Either[float64]) (Either[[]float64]) {
	var Generated_8 Either[[]float64]
	if Generated_7.IsRight() {
		Generated_8 = EitherPlainOf[[]float64]([]float64{Generated_7.Value})
	} else {
		Generated_8 = EitherRetype[[]float64, float64](Generated_7)
	}
	return Generated_8
}(Generated_6)
```

**[observé, `go build -gcflags=-m`]** Chaque `func` literal est **inliné** et aucune closure ne s'échappe (03, 05, 06). `rightPipe` (ex. 07) devient des `if` imbriqués, sans aucune closure (ADR-10).

### Ternaire et court-circuit (ADR-8)

Go n'a pas de ternaire : `c ? a : b` donne `var t T ; if c { t = a } else { t = b }`, et chaque branche garde ses préparations. `a || f()` reste un `||` natif quand la droite n'a pas de préparation, sinon `if !t { … }`. **[observé]** Les variantes `06-ternary-lazy` et `06-short-circuit` montrent que seule la branche choisie, et la droite seulement si nécessaire, sont évaluées.

### `matchInformation` (ADR-9)

`switch e.Information { case "negative-operand": … default: panic(…) }` : les clés sont lues à la transpilation, et le `default` reproduit le `TypeError` de JS.

## Résultats

- **Fonctionnels [observé]** : 00 à 09 donnent une sortie Go **identique** à celle de TypeScript (`diff` vide), ainsi que 37 variantes sur 38 (alias, ordre des unions, `else if` avec effets, `-0`, `NaN`, tableaux vides, closures, court-circuit…).
- **De bout en bout [observé, `docs/measures.md`, Apple M4]** : le binaire Go s'exécute en environ **2 ms** contre environ **20 ms** pour Node sur le JS compilé (environ **10 fois**), avec environ **12 fois moins** de mémoire résidente (3 Mo contre 37 Mo). Ces programmes sont minuscules : c'est surtout le **démarrage** qui est mesuré.
- **Allocations [observé]** : 0 échappement dans le code utilisateur de l'ex. 01 ; en 05 et 09, seuls les **slices** vont sur le tas.
- **Tuples [observé, ADR-11, `research/tuples`]** : `[3]float64` est environ **5,3 fois plus rapide** que `[]float64`, avec 0 allocation contre 1000. Nous avons gardé `[]T` (cohérence des unions tableau et tuple de 02 à 06) : c'est une **piste d'optimisation chiffrée**, non retenue avant le gel.
- **Asynchronisme [observé, `research/async`]** : des futures (goroutine et channel), même séquentielles, coûtent environ **55 fois** plus que l'exécution synchrone sur la logique de l'ex. 10 (759,9 contre 13,7 ns/op, 10 allocations contre 1).

## Limites argumentées

| Limite | Pourquoi | Preuve |
|---|---|---|
| Forme curryfiée **stockée sans contexte** (`const step = whenIsRight(coalescing)`) | TypeScript lui-même la type `(input: unknown) => unknown` : aucun type Go n'est déductible. Erreur explicite plutôt qu'un type inventé. | Variante `03-curried-stored`, ADR-7 §5 |
| **Réordonnancement asynchrone** | L'option A exécute les combinateurs async **au point d'appel**. En JS, leurs étapes ne démarrent qu'après le code synchrone qui suit. Un effet placé entre l'appel et le `await` serait réordonné. Fidèle pour l'ex. 10, où rien ne s'y trouve. | Sonde `tsx` (PLAN §0.7), variante `10-sync-between` (Sprint 5) |
| Unions à **plusieurs types de gauche** différents | Ni `Either[V]` ni `Either2[L, R]` ne les représentent ; il faudrait une union fermée générée. | ADR-12 |
| Tuples **hétérogènes** (`[string, number]`) | Il faudrait une struct par forme de tuple ; refusés explicitement. | ADR-11 |
| `x \|\| défaut` sur des valeurs **non booléennes** | La « truthiness » de JS n'a pas d'équivalent typé ; refusé. | ADR-8 |

## Conclusion

Transpiler DuploJS vers Go est **faisable et rentable** sur ce sous-ensemble, parce que DuploJS est **fortement typé** et que son style (résultats `Either`, combinateurs purs, asynchronisme séquentiel) se traduit en **structures par valeur et en code inliné**. Les conditions sont nettes :
1. les types doivent être **résolus à la transpilation** (le checker fait le travail difficile) ;
2. l'**API DuploJS** utilisée doit être connue du transpileur, une API générique inconnue n'ayant pas de traduction instanciée ;
3. les **formes d'union** doivent pouvoir être regroupées par type Go.

Au-delà, d'autres questions demanderaient une étude propre : unions arbitraires, vraies E/S asynchrones, code dynamique.
