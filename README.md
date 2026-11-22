# Hackathon DuploJS vers Go : étude de transpilation

ESGI · 17–20 novembre 2026

Peut-on transpiler du DuploJS vers Go pour obtenir un programme performant tout en conservant le comportement d'origine ? Ce dépôt contient notre transpileur TypeScript (DuploJS) → Go, nos stratégies de transformation pour les exercices `projects/01` à `projects/10`, ainsi que leur documentation complète.

## Équipe

| Nom | Prénom | Classe |
|---|---|---|
| EL WARDI | Abderrazzak | 5IWJ |
| MAARIFI | ZAKARIA | 5IWJ |
| BAKAYOKO | BAKAGNAN | 5IWJ |
| AHMAT | Abdoulaye Affadine | 5IWJ |

## Découpage des problématiques étudiées (Format du rendu)

Conformément aux attentes du rendu, notre travail valorise la **réflexion technique et les choix d'architecture** plutôt que la seule quantité de code. Chaque problématique étudiée articule trois volets complémentaires :
1. **Court README / Fiche d'exercice** (`docs/exercises/`) : problème TypeScript ciblé, stratégie retenue et limites identifiées.
2. **Historique des réflexions** (`docs/decisions/` - ADR) : pistes explorées (Options A, B, C), justifications mathématiques, mémoire et performance (allocations tas, inlining).
3. **Exemples TypeScript / Go retravaillés manuellement** (`research/`) : prototypes et benchmarks Go réécrits à la main, **sans aucun code brut généré par le transpileur**, pour illustrer fidèlement chaque stratégie.

| # | Problématique étudiée | Fiche & Limites (Court README) | Historique & Justifications (ADR) | Exemples TS / Go manuels & Mesures |
|---|---|---|---|---|
| 01 | **Représentation d'Either & variantes** (`Success \| Fail`, `isRight`) | [Fiche 01](docs/exercises/01.md) | [ADR-1](docs/decisions/ADR-1-either.md) | [`research/either/`](research/either/) (`scenario.go` manuel vs `scenario.ts`) |
| 02 | **Unions de types & formes nues** (`Plain`, dédoublonnage canonique) | [Fiche 02](docs/exercises/02.md) | [ADR-2](docs/decisions/ADR-2-unions.md) | [`research/either/plain/`](research/either/plain/) |
| 03 | **Composition (`pipe`) & curryfication** (inlining des combinateurs) | [Fiche 03](docs/exercises/03.md) | [ADR-3](docs/decisions/ADR-3-functions.md), [ADR-7](docs/decisions/ADR-7-arrow-generic-values.md) | [`research/functions/`](research/functions/) & [Synthèse §2](docs/synthese.md) |
| 04 | **Retours multiples & inférence de `fail()`** (typage contextuel) | [Fiche 04](docs/exercises/04.md) | [ADR-1](docs/decisions/ADR-1-either.md) | [`research/either/a/scenario.go`](research/either/a/scenario.go) (`Add04`) |
| 05 | **Collections, `map` & fonctions fléchées** (conversion de types) | [Fiche 05](docs/exercises/05.md) | [ADR-7](docs/decisions/ADR-7-arrow-generic-values.md) | [Fiche 05 § Go produit](docs/exercises/05.md) & [`projects/05`](projects/05/) |
| 06 | **Court-circuit, ternaire & erreurs identifiées** (`matchInformation`) | [Fiche 06](docs/exercises/06.md) | [ADR-8](docs/decisions/ADR-8-ternary-short-circuit.md), [ADR-9](docs/decisions/ADR-9-match-information.md) | [`research/either/a/scenario.go`](research/either/a/scenario.go) (`Add`, `Message`) |
| 07 | **Enchaînement dépendant & court-circuit** (`rightPipe`) | [Fiche 07](docs/exercises/07.md) | [ADR-10](docs/decisions/ADR-10-right-pipe.md) | [`research/either/a/scenario.go`](research/either/a/scenario.go) (`Calculate`) |
| 08 | **Tuples homogènes & déstructuration** (tableaux fixes vs slices) | [Fiche 08](docs/exercises/08.md) | [ADR-11](docs/decisions/ADR-11-tuples-destructuring.md) | [`research/tuples/`](research/tuples/) (`tuples_test.go` manuel, 5.3x plus rapide) |
| 09 | **Transactions atomiques & groupement** (`Either2` bivarié) | [Fiche 09](docs/exercises/09.md) | [ADR-12](docs/decisions/ADR-12-group-either2.md) | [`research/either/aprime/`](research/either/aprime/) (`uniform.go`) |
| 10 | **Asynchronisme séquentiel vs concurrence** (`asyncGroup`, `rightAsyncPipe`) | [Fiche 10](docs/exercises/10.md) | [ADR-5](docs/decisions/ADR-5-async.md) | [`research/async/`](research/async/) (`async.go` manuel RunA vs RunB, 55x plus rapide) |

## Avancement

| Exercice | État | Fiche |
|---|---|---|
| 00 (exemple) | ✅ sortie Go identique à TypeScript | [00.md](docs/exercises/00.md) |
| 01 | ✅ union de retour, `isRight`, `print` | [01.md](docs/exercises/01.md) |
| 02 | ✅ `whenIsRight`, `coalescing` en valeur (ADR-7), union `Plain` (ADR-2) | [02.md](docs/exercises/02.md) |
| 03 | ✅ `pipe`, forme curryfiée en `func` literal inliné (ADR-3) | [03.md](docs/exercises/03.md) |
| 04 | ✅ retours multiples inférés, `fail()`, `-1` | [04.md](docs/exercises/04.md) |
| 05 | ✅ `whenIsRightOtherwise`, fonction fléchée, `map`, `DString.to` (ADR-7) | [05.md](docs/exercises/05.md) |
| 06 | ✅ `left`, ternaire et `\|\|` (ADR-8), `matchInformation` (ADR-9) | [06.md](docs/exercises/06.md) |
| 07 | ✅ `rightPipe` inliné et avec court-circuit (ADR-10) | [07.md](docs/exercises/07.md) |
| 08 | ✅ tuples homogènes et déstructuration (ADR-11) | [08.md](docs/exercises/08.md) |
| 09 | ✅ `group` et `Either2` lorsque les côtés diffèrent (ADR-12) | [09.md](docs/exercises/09.md) |
| 10 | ✅ `async`/`await`, `rightAsyncPipe`, `asyncGroup` en exécution séquentielle (ADR-5) | [10.md](docs/exercises/10.md) |

**11/11 cibles (00 à 10) identiques à TypeScript** ; variantes **41/43** (`./scripts/check-all.sh` et `--variations` sur `main`). Les variantes des exercices 01 à 10 sont suivies dans [variations/README.md](variations/README.md) ; les deux écarts sont des limites documentées : `03-curried-stored` (TypeScript type la constante en `unknown`, [ADR-7 §5](docs/decisions/ADR-7-arrow-generic-values.md)) et `10-sync-between` (échec au diff seulement, réordonnancement asynchrone, [ADR-5](docs/decisions/ADR-5-async.md)).

## Documents clés

| Document | Contenu |
|---|---|
| [Synthèse](docs/synthese.md) | La réponse à la question du sujet, la démarche, les décisions clés, les résultats et les limites |
| [Décisions (ADR)](docs/decisions/) | ADR-1 (`Either` par valeur), ADR-2 (unions, `Plain`), ADR-3 (fonctions en valeur), ADR-5 (asynchronisme), ADR-7 (fonctions fléchées et génériques en valeur), ADR-8 (ternaire, court-circuit), ADR-9 (`matchInformation`), ADR-10 (`rightPipe`), ADR-11 (tuples), ADR-12 (`group`, `Either2`), ADR-13 (échelle), ADR-14 (objets et boucles) |
| [Fiches d'exercice](docs/exercises/) | Problèmes, stratégie, Go produit, résultats observés et limites, de 00 à 10 |
| [Mesures](docs/measures.md) | Node contre Go de bout en bout, échappements, micro-benchmarks ([`research/`](research/)) |
| [Sémantique DuploJS](docs/duplojs-semantics.md) | Comportement de référence vérifié à l'exécution |
| [Soutenance](docs/soutenance.md) | Trame minutée, démo, questions probables ; plan B hors ligne dans [docs/demo/](docs/demo/README.md) |
| [Plan de l'équipe](docs/PLAN_HACKATHON.md) | Sprints, décisions, arbitrages et suivi des défauts (référencé « PLAN §… » dans les fiches et les ADR) |
| [Relecture croisée](docs/relecture.md) | Relecture de chaque fiche et ADR par un non-auteur, décisions de livraison |

Avant chaque merge, `./scripts/compare-main.sh <branche>` vérifie l'absence de régression (voir [docs/setup.md §8](docs/setup.md#8-contrôler-une-pr-avant-de-la-merger-règle-de-merge)).

## Structure du projet

| Emplacement | Contenu |
|---|---|
| `docs/` | Synthèse générale, décisions d'architecture (ADR-1 à 14), fiches par exercice (00 à 10), mesures, protocole d'installation |
| `research/` | Prototypes écrits à la main et micro-benchmarks : représentations d'`Either`, tuples, asynchronisme, échelle |
| `projects/00` à `projects/10` | Exercices du sujet (00 = exemple résolu) |
| `variations/` | 43 variantes des exercices pour tester les cas limites et la généricité des stratégies ([README](variations/README.md)) |
| `src/transpiler/` | Transformers TypeScript → AST Go, contextes, dépendances partagées |
| `src/go/` | AST Go et printer |
| `bin/index.ts` | CLI du transpileur : `--tsconfig`, `--input`, `--output` |
| `scripts/` | Boucle de validation (`check.sh`, `check-all.sh`), contrôle de merge (`compare-main.sh`), exécution Docker (`docker-check.sh`, `docker-check.ps1`), archive de remise (`make-zip.sh`) |

## Reproduire

1. Installer l'environnement : nativement (Node, **pnpm 12.18.0**, Go ≥ 1.24) ou **avec Docker seulement** (recommandé sous Windows). Voir [docs/setup.md](docs/setup.md).
2. Vérifier un exercice : transpilation, compilation Go, exécution, puis comparaison avec la sortie TypeScript.

```bash
pnpm install
./scripts/check.sh 01      # un exercice
./scripts/check-all.sh     # tous les exercices, tableau récapitulatif
./scripts/check-all.sh --variations   # toutes les variantes

# Sans installation, avec Docker :
./scripts/docker-check.sh            # macOS, Linux, WSL, Git Bash
.\scripts\docker-check.ps1           # Windows (PowerShell)
```

3. Transpiler un exercice seul : `pnpm build:XX`. Le Go généré est écrit dans `projects/XX/dist`.

Le détail des étapes, des fichiers produits dans `out/` et l'état initial des exercices sont décrits dans [docs/setup.md](docs/setup.md).
