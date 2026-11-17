# Variantes des exercices

Les exercices officiels (`projects/`) ne couvrent qu'un exemple par problème. Chaque dossier `variations/<XX>-<nom>/` teste une **variation** de l'exercice `XX`, pour vérifier que la stratégie de transformation est générique et pas taillée sur l'exemple.

- Format : `index.ts` (point d'entrée), éventuellement d'autres `.ts`, et `tsconfig.json` identique à celui de `projects/XX`.
- Chaque variante est du TypeScript **valide** (`pnpm exec tsc -p variations/<dossier>/tsconfig.json --noEmit`). Sa sortie avec `tsx` sert de référence.
- Vérifier une variante : `./scripts/check.sh variations/01-alias`.
- Vérifier toutes les variantes d'un exercice : `./scripts/check-all.sh --variations 01` (ou `--variations` seul pour tout vérifier).

## Exercice 01

| Variante | Ce qu'elle vérifie | Responsable |
|---|---|---|
| `01-alias` | Reconnaissance **par symbole** : `import { isRight as ok }`, `import { print as show }`, namespaces `E` et `C` | P3 (handlers), P4 (routeur) |
| `01-else` | `if` / `else` : branche then sur un Either, branche else sur une condition numérique fausse | P2 |
| `01-else-if` | `else if` dont la condition contient un appel avec **effet observable** (`print("évalué")`) : l'appel n'a lieu que si la condition précédente est fausse | P2 |
| `01-union-order` | `DEither.Fail \| DEither.Success<number>` : même type Go que dans l'ordre inverse | P4 |
| `01-is-left` | `DEither.isLeft` sur un succès (faux) et sur un échec (vrai) | P3 |
| `01-local-const` | `const` dans une fonction : déclaration locale `:=` | P2 |
| `01-const-used-by-function` | `const` de premier niveau lue par une fonction du même fichier : variable de package | P2 |
| `01-print-values` | `print` d'un nombre, d'une chaîne, de tableaux, et des nombres limites (`1e21`, `1e-7`, `-0`, `NaN`, `±Infinity`) | P3 |
| `01-fail` | Fonction annotée qui renvoie `DEither.fail()` : affichage d'un `Fail` (`value: undefined`) | P4 (constructeur), P3 (affichage) |

> À noter : `print(-0)` affiche **`-0`** (format `util.inspect`), alors que `DString.to(-0)` renvoie `"0"`. Ce sont deux formatages différents.

## Exercices 02 à 04

| Variante | Ce qu'elle vérifie | Sortie de référence | Responsable |
|---|---|---|---|
| `02-callback-user` | `whenIsRight` avec une fonction utilisateur non générique : résultat nu, non ré-enveloppé | `6` | P3 (whenIsRight), P4 (forme `Plain`) |
| `02-coalescing-array` | `coalescing` sur une valeur déjà tableau : identité | `[ 1, 2 ]` | P2 (coalescing) |
| `02-left-input` | `whenIsRight` sur un `Fail` : entrée renvoyée telle quelle, callback **jamais** appelé (son `print` ne doit pas apparaître) | l'objet `Fail` seul | P3 |
| `02-callback-either` | Callback qui renvoie un Either : pas de ré-enveloppe | `Success(1.5)` | P3, P4 (coercition) |
| `03-pipe-one-step` | `pipe(3, double)` : une étape, fonction utilisateur, valeur nue | `6` | P3 (pipe) |
| `03-pipe-two-steps` | `pipe(3, double, coalescing)`, puis `pipe(add(1, 2), whenIsRight(double), whenIsRight(coalescing))` : le 2e `whenIsRight` reçoit une valeur **nue** (6), qui **n'est pas un Right**, et la renvoie inchangée | `[ 6 ]` puis `6` | P3, P4 (`IsRight()` faux pour `Plain`) |
| `03-curried-stored` | `const step = whenIsRight(coalescing)` stocké puis appelé deux fois : la forme curryfiée doit exister comme valeur Go | `[ 3 ]` puis `[ 7 ]` | P3 (ADR-3, limite attendue) |
| `04-both-branches` | `return` dans le `if` **et** dans le `else`, sans `return` final | l'objet `Fail` | P2 |
| `04-nested-if` | `return` dans un `if` imbriqué, retour inféré | `Fail` puis `Success(3)` | P2 |
| `04-unary` | `-x` sur une variable, `!` sur un booléen, `!==` | `Success(-3)`, `Fail`, `Fail` | P2 |

> `pipe(x)` **sans étape** est accepté à l'exécution, mais **refusé par TypeScript** (`Expected 2-16 arguments, but got 1`). Le cas est hors du TypeScript valide et donc hors périmètre : il est remplacé par `03-pipe-one-step`.

> `03-curried-stored` est une **limite documentée** (Sprint 3) : sans contexte, TypeScript type lui-même `const step = whenIsRight(coalescing)` en `(input: unknown) => unknown`, et l'appel `step(add(1, 2))` en `unknown`. Aucun type Go n'est déductible du checker. Le transpileur échoue avec `function-value-without-instantiated-signature`, sans rien approximer.

## Exercices 05 et 06

| Variante | Ce qu'elle vérifie | Sortie de référence |
|---|---|---|
| `05-otherwise-left-input` | `whenIsRightOtherwise` (forme directe) sur un `Fail` : seule la branche « otherwise » est évaluée, et elle reçoit l'Either **complet** ; le callback Right n'est jamais appelé | `[ -1 ]` |
| `05-map-direct` | `DArray.map` en forme **directe**, avec une fonction fléchée puis avec `DString.to` passé en valeur ; tableau vide typé (`const empty: number[] = []`) | `[ 2, 5, -6 ]`, `[ '1', '2.5', '-3' ]`, `[]` |
| `05-to-values` | `DString.to` (format de `String(n)`) : `-0` donne `0`, `1e21` donne `1e+21`, `1e-7` ; chaîne et booléen | `0`, `1.5`, `1e+21`, `1e-7`, … |
| `05-map-closure` | Fonctions fléchées qui **capturent** une variable extérieure, dont une à corps-bloc avec deux `return`, dans un `pipe` avec `map` curryfié | `[ 0, 12, 13 ]` |
| `06-left-print` | `DEither.left(info, valeur)` : affichage d'un `Left` (sans clé de tag), puis `isLeft` | l'objet `Left`, puis `gauche` |
| `06-match-curried` | `matchInformation` **curryfié** dans un `pipe`, sur un succès puis sur un `Left` porteur d'une valeur ; gabarit de chaîne | `5`, `trop grand : 500` |
| `06-ternary-lazy` | Ternaire : seule la branche choisie est évaluée (effet observable dans les deux branches) | `évalué : oui`, `oui`, `évalué : non`, `non`, `30` |
| `06-short-circuit` | `&&` et `\|\|` court-circuitent (D2) : l'opérande de droite, avec effet observable, n'est évalué que si nécessaire | `a`, `c`, `e`, `f` évalués ; `b` et `d` jamais |
