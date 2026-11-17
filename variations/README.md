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
