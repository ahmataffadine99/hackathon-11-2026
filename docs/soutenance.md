# Trame de soutenance (10 minutes, 20/11)

Minutage du PLAN §12. Une personne parle par bloc, et chaque bloc tient dans son créneau, transitions comprises.

| Temps | Bloc | Contenu | Support | Qui |
|---|---|---|---|---|
| 0:00–1:00 | La question et notre réponse | « Peut-on transpiler DuploJS vers Go en gardant le comportement ? » Réponse : oui pour le sous-ensemble étudié, à trois conditions (types résolus, API connue, unions regroupables). Avancement : 10/10 exercices (11/11 avec l'exemple 00), 41/43 variantes (`check-all` sur `main` `f0a10cf`). | `docs/synthese.md` (phrase d'ouverture) | à attribuer |
| 1:00–3:00 | Démarche | AST et checker TS 7 ; transformers ; `before` (ordre d'évaluation) ; coercition explicite ; callbacks (inlinés ou appelés) ; validation par `diff` contre `tsx` ; `compare-main` sur chaque PR. | Schéma de la chaîne + `scripts/check.sh` | à attribuer |
| 3:00–6:00 | Trois décisions clés avec le Go produit | (1) `Either` par valeur : 1 allocation contre 2 001 (ADR-1). (2) `pipe` et combinateurs inlinés : extrait de l'ex. 03, `func` literal inliné d'après `-gcflags=-m` (ADR-3, ADR-7). (3) Ternaire et court-circuit : extrait de l'`add` de l'ex. 06 (ADR-8). | Extraits de Go **après la correction de D8** (noms de package relatifs, P2) | à attribuer |
| 6:00–8:00 | Résultats | **Démo en direct** : `./scripts/check-all.sh` (tableau ✅), puis `./scripts/check.sh 09` avec un diff vide. Chiffres : Go environ 2 ms contre environ 20 ms pour Node sur JS compilé, 3 Mo contre 37 Mo (`docs/measures.md`) ; tuples `[3]T` environ 5,3 fois plus rapides (piste chiffrée, ADR-11). | Terminal + `docs/measures.md` | à attribuer |
| 8:00–9:30 | Limites argumentées | Async : option A fidèle pour 10, mais réordonnancement possible ailleurs (sonde `tsx`, `10-sync-between`) ; futures 55 fois plus coûteuses (`research/async`). `03-curried-stored` : TS lui-même type `unknown`. Unions à plusieurs gauches, tuples hétérogènes. | `docs/synthese.md`, tableau « Limites » | à attribuer |
| 9:30–10:00 | Conclusion | Faisable et rentable sur un code fortement typé et au style fonctionnel ; les conditions ; ce qui demanderait une étude propre. | – | à attribuer |

## Démo : préparation et plan B

- **Avant la soutenance** : `pnpm install`, puis `./scripts/check-all.sh` une première fois (caches Go et pnpm chauds). Terminal en grande police, dossier du dépôt déjà ouvert.
- **Plan B hors ligne** (réseau, Docker ou Go indisponible) : sorties enregistrées sur le commit livré par `./scripts/record-demo.sh`, dans [`docs/demo/`](demo/README.md) (`check-all.txt`, `variations.txt`, `check-09.txt`, `check-10.txt`), avec le hash en tête de chaque fichier.
- Commandes exactes de la démo :

```bash
./scripts/check-all.sh          # tableau 00 à 10
./scripts/check.sh 09           # détail d'un exercice : TS, transpilation, go vet, go run, diff vide
```

## Répétitions chronométrées

Deux passages complets, chronomètre en main, avant le gel du J4. Noter le temps de chaque bloc. Si un bloc dépasse de plus de 15 s, on le coupe (on ne parle pas plus vite).

| Passage | Date | 0:00–1:00 | 1:00–3:00 | 3:00–6:00 | 6:00–8:00 | 8:00–9:30 | 9:30–10:00 | Total | Remarques |
|---|---|---|---|---|---|---|---|---|---|
| 1 | à faire | | | | | | | | |
| 2 | à faire | | | | | | | | |

## Questions probables du jury (réponses courtes)

| Question | Réponse | Preuve |
|---|---|---|
| Pourquoi pas `interface{}` ou `any` pour `Either` ? | Une allocation à chaque retour dès que la fonction n'est pas inlinée : 8 à 14 fois plus lent. | ADR-1 §4 |
| Pourquoi ne pas utiliser des goroutines pour l'asynchrone ? | `asyncGroup` est **séquentiel** en DuploJS (Q1) : le paralléliser changerait le comportement (fabriques appelées après un échec). Des futures séquentielles coûtent environ 55 fois plus, sans rien apporter. | `docs/duplojs-semantics.md` Q1, `research/async` |
| Comment garantissez-vous le même comportement ? | Une sortie `tsx` de référence, un `diff` caractère par caractère, et des variantes qui ciblent les cas limites (ordre d'évaluation, effets, `-0`, `NaN`). | `scripts/check-all.sh`, `variations/` |
| Que se passe-t-il pour du code non pris en charge ? | Une erreur explicite (`notSupport` ou `transformation-error`), jamais du Go approximatif. | ADR-7 §5, fiches |
| Pourquoi `[]T` alors que `[N]T` est 5,3 fois plus rapide ? | Les unions tuple/tableau de 02 à 06 exigent un même type Go ; `[N]T` imposerait des conversions et un `Print` par réflexion. Le gain est chiffré, et c'est la prochaine optimisation. | ADR-11 |
