# Problématique 09 : Groupement de transactions et Either2

## Problématique
Comment regrouper plusieurs calculs indépendants (`DEither.group`) en une transaction atomique où le succès exige que tous les calculs réussissent (`Success<[]number>`), mais où un échec interrompt la transaction en retournant un type distinct (`Left<number>`) ?

## Démarche et réflexions
Dans [ADR-12](../../docs/decisions/ADR-12-group-either2.md) :
- `Either[V]` ne possède qu'un seul type générique de valeur.
- Or, dans l'exercice 09, la variante `Left` porte un `float64` unique, tandis que `Success` porte une tranche `[]float64`.
- Piste rejetée : Utiliser `Value any` (entraînerait des allocations et une perte de sûreté).
- Piste retenue : Introduire une structure bivariée par valeur `Either2[L, R]` dédiée exclusivement aux fonctions d'agrégation.

## Solution
Une structure `Either2[L, R]` avec un champ `Left L` et `Right R`. `group` parcourt les entrées : au premier échec rencontré, il renvoie un `Either2` enveloppant l'erreur ; si tous réussissent, il renvoie la collection des valeurs.

## Limites
Ne supporte pas des collections contenant plusieurs types d'échecs hétérogènes (`Left<string>` et `Left<number>` dans la même opération).
