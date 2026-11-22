# Problématique 03 : Composition (pipe) et curryfication

## Problématique
Comment traduire la composition de fonctions avec `pipe` et des fonctions curryfiées comme `whenIsRight(coalescing)`, sachant que Go ne supporte pas les fonctions génériques non instanciées comme valeurs de première classe ?

## Démarche et réflexions
Dans [ADR-3](../../docs/decisions/ADR-3-functions.md) et [ADR-7](../../docs/decisions/ADR-7-arrow-generic-values.md) :
- En TypeScript, `whenIsRight(coalescing)` renvoie une fonction fléchée générique.
- En Go, un type de fonction ne peut pas déclarer de paramètres de type propres (`type F func[T](T) T` est invalide en Go).
- Piste explorée : Générer des wrappers d'interfaces génériques. Rejetée car elle impose des allocations systématiques.
- Piste retenue : Résoudre les types à la transpilation via l'appel englobant et inliner la composition en une séquence d'instructions directes.

## Solution
`pipe(result, whenIsRight(coalescing))` est traduit par un `func` literal immédiatement appliqué ou inliné séquentiellement. Les types génériques sont totalement résolus et instanciés à la transpilation. Le compilateur Go inline l'ensemble à 100 %.

## Limites
Une fonction curryfiée stockée dans une variable sans contexte de type résoluble (`const step = whenIsRight(coalescing)`) est typée en `unknown` par TypeScript lui-même : Go ne peut pas la typer sans tricher, et le transpileur lève une erreur explicite (limite assumée `03-curried-stored`).
