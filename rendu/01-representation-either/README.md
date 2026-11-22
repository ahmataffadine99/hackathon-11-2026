# Problématique 01 : Représentation d'Either et variantes

## Problématique
Comment représenter en Go un retour qui peut prendre plusieurs formes (`Success<number>` ou `Fail`), tout en conservant le type et la valeur associés à chacune sans perte de typage statique ni surcoût à l'exécution ?

## Démarche et réflexions
Nous avons exploré trois pistes architecturales (détaillées dans [ADR-1](../../docs/decisions/ADR-1-either.md)) :
1. **Option A (retenue)** : `struct` par valeur générique `Either[V]` avec discriminant `Kind uint8`.
2. **Option B** : Représentation par `interface Go`.
3. **Option C** : Structure avec `Value any`.

Les micro-benchmarks (`research/either`) ont démontré que les options B et C provoquent des allocations sur le tas à chaque retour non inliné (5 à 8 fois plus lentes sur 1000 valeurs, 57 à 80 Ko alloués contre 32 Ko). L'option A permet au compilateur Go d'inliner complètement les appels (`-gcflags=-m`), assurant 0 allocation sur le tas pour les calculs.

## Solution
Une structure unique par valeur `Either[V]` portant un champ `Kind` (Right, Left, Success, Fail), `Information string` et `Value V`. La garde `isRight` devient une simple méthode inlinée `e.IsRight()`.

## Limites
Un seul type `V` est porté par cette forme. Les retours où les variantes portent des types distincts (ex: `Left<number>` et `Success<string>`) nécessitent une forme bivariée `Either2[L, R]` (voir problématique 09).
