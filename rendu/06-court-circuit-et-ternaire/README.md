# Problématique 06 : Court-circuit, ternaire et erreurs discriminées

## Problématique
Go ne dispose pas d'opérateur ternaire (`cond ? a : b`). Comment traduire cette expression en garantissant que seule la branche sélectionnée est évaluée ? Comment représenter des erreurs nommées (`matchInformation`) avec leur contexte ?

## Démarche et réflexions
Dans [ADR-8](../../docs/decisions/ADR-8-ternary-short-circuit.md) et [ADR-9](../../docs/decisions/ADR-9-match-information.md) :
- Les expressions avec effets préparatoires (`before`) doivent être isolées dans leur branche respective pour préserver l'évaluation paresseuse.
- Le ternaire devient une déclaration de variable temporaire suivie d'un `if/else`.
- `matchInformation` est traduit par un `switch e.Information` exhaustif, avec un `panic` dans le bloc `default` pour émuler le `TypeError` de JavaScript en cas d'information inattendue.

## Solution
Le ternaire est décomposé en une structure conditionnelle classique préservant l'ordre d'évaluation strict. `Left` porte l'information de l'erreur dans le champ `Information string` de l'`Either[V]`.

## Limites
La « truthiness » arbitraire de JavaScript (ex: évaluer un objet ou un entier comme booléen dans un `||`) n'a pas d'équivalent en Go typé et est refusée pour éviter des comportements imprévus.
