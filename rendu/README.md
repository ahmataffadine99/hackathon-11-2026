# Dossier de rendu — Étude des problématiques de transpilation

Conformément aux consignes du hackathon, ce dossier présente le découpage clair de toutes les problématiques identifiées et étudiées durant l'étude.

Chaque sous-dossier contient :
- Un **court `README.md`** expliquant la problématique, la démarche, la solution retenue et ses limites.
- Un exemple minimal **`exemple.ts`** en TypeScript.
- Un exemple minimal **`exemple.go`** en Go, **retravaillé manuellement pour la démonstration (pas de code brut issu du transpileur)**.

---

## Index des problématiques

| Dossier | Problématique traitée | Décision clé & Justifications | Exemples manuels |
|---|---|---|---|
| [`01-representation-either/`](01-representation-either/) | Représentation de retours variants (`Success \| Fail`, `isRight`) | [ADR-1](../../docs/decisions/ADR-1-either.md) : `struct` par valeur (0 allocation, inlining) | [`exemple.go`](01-representation-either/exemple.go) |
| [`02-unions-et-plain/`](02-unions-et-plain/) | Unions de types et formes primitives nues | [ADR-2](../../docs/decisions/ADR-2-unions.md) : Encapsulation `Plain` et ordre canonique | [`exemple.go`](02-unions-et-plain/exemple.go) |
| [`03-fonctions-et-curryfication/`](03-fonctions-et-curryfication/) | Composition (`pipe`) et curryfication en Go | [ADR-3](../../docs/decisions/ADR-3-functions.md), [ADR-7](../../docs/decisions/ADR-7-arrow-generic-values.md) : Inlining séquentiel | [`exemple.go`](03-fonctions-et-curryfication/exemple.go) |
| [`04-retours-multiples-et-fail/`](04-retours-multiples-et-fail/) | Retours multiples conditionnels et inférence de `fail()` | [ADR-1](../../docs/decisions/ADR-1-either.md) : Inférence contextuelle du type attendu | [`exemple.go`](04-retours-multiples-et-fail/exemple.go) |
| [`05-collections-et-mapping/`](05-collections-et-mapping/) | Transformation de collections (`map`, conversions de types) | [ADR-7](../../docs/decisions/ADR-7-arrow-generic-values.md) : Pré-allocation des tranches | [`exemple.go`](05-collections-et-mapping/exemple.go) |
| [`06-court-circuit-et-ternaire/`](06-court-circuit-et-ternaire/) | Émulation du ternaire (`? :`) et erreurs discriminées | [ADR-8](../../docs/decisions/ADR-8-ternary-short-circuit.md), [ADR-9](../../docs/decisions/ADR-9-match-information.md) : Évaluation paresseuse | [`exemple.go`](06-court-circuit-et-ternaire/exemple.go) |
| [`07-chainage-right-pipe/`](07-chainage-right-pipe/) | Enchaînement dépendant avec court-circuit au premier échec | [ADR-10](../../docs/decisions/ADR-10-right-pipe.md) : Inlining en `if` imbriqués | [`exemple.go`](07-chainage-right-pipe/exemple.go) |
| [`08-tuples-et-destructuration/`](08-tuples-et-destructuration/) | Tuples de taille fixe et déstructuration positionnelle | [ADR-11](../../docs/decisions/ADR-11-tuples-destructuring.md) : Tranches et accès indexés | [`exemple.go`](08-tuples-et-destructuration/exemple.go) |
| [`09-groupement-transactions-either2/`](09-groupement-transactions-either2/) | Groupement de transactions (`group`) avec types asymétriques | [ADR-12](../../docs/decisions/ADR-12-group-either2.md) : Structure bivariée `Either2[L, R]` | [`exemple.go`](09-groupement-transactions-either2/exemple.go) |
| [`10-asynchronisme-et-sequences/`](10-asynchronisme-et-sequences/) | Asynchronisme séquentiel (`asyncGroup`, `rightAsyncPipe`) | [ADR-5](../../docs/decisions/ADR-5-async.md) : Séquentiel synchrone (55x plus rapide) | [`exemple.go`](10-asynchronisme-et-sequences/exemple.go) |
