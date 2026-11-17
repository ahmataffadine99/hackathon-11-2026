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
