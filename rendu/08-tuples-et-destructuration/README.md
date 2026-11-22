# Problématique 08 : Tuples homogènes et déstructuration

## Problématique
Comment représenter en Go un tableau de tuples de taille fixe `[number, number, number]` et traduire la déconstruction positionnelle dans les paramètres de fonction `([one, two, divisor])` ?

## Démarche et réflexions
Dans [ADR-11](../../docs/decisions/ADR-11-tuples-destructuring.md) et notre benchmark [`research/tuples`](../../research/tuples/README.md) :
- `[][3]float64` (tableau fixe) est **5,3 fois plus rapide** et effectue **0 allocation** contre 1000 pour `[][]float64`.
- Cependant, pour préserver la cohérence avec les fonctions génériques manipulant des tableaux et les unions de types du langage, `[][]float64` a été retenu pour le transpileur.
- La déstructuration dans les paramètres est traduite en affectations séquentielles indexées (`one := tuple[0]`).

## Solution
Les tuples homogènes deviennent des slices Go. Le tuple déstructuré est assigné à une variable locale temporaire, puis chaque liaison utilisée est extraite par son indice numérique.

## Limites
Les tuples hétérogènes (`[string, number, boolean]`) ne peuvent pas être représentés par des slices `[]T` et exigeraient la génération de `struct` spécifiques.
