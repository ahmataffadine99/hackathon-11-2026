# Problématique 05 : Collections, map et fonctions fléchées

## Problématique
Comment transformer chaque élément d'une collection (`DArray.map`) en appliquant une conversion de type (ex: nombre vers chaîne avec `DString.to`), tout en combinant cette logique avec la sélection d'issues (`whenIsRightOtherwise`) ?

## Démarche et réflexions
Dans [ADR-7](../../docs/decisions/ADR-7-arrow-generic-values.md) :
- Les méthodes de tableaux JS sont remplacées par des boucles natives Go `for ... range`.
- Pour minimiser les réallocations mémoire, la tranche de destination est pré-allouée avec `make([]T, len(source))`.
- La conversion de type numérique JavaScript vers chaîne doit reproduire fidèlement les formats JS (géré par un formateur dédié `JSNumberToString`).

## Solution
Les fonctions fléchées locales sont inlinées ou traduites en fonctions Go directes sans capture superflue. La transformation de la collection pré-alloue sa mémoire pour garantir des performances optimales.

## Limites
Les collections hétérogènes JavaScript (mélangeant différents types non corrélés) ne peuvent pas être portées par une tranche Go typée sans recourir à des `[]any`.
