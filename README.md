# Hackathon DuploJS vers Go : étude de transpilation

ESGI · 17–20 novembre 2026

Peut-on transpiler du DuploJS vers Go pour obtenir un programme performant tout en conservant le comportement d'origine ? Ce dépôt contient notre transpileur TypeScript (DuploJS) → Go, nos stratégies de transformation pour les exercices `projects/01` à `projects/10`, ainsi que leur documentation.

## Équipe

| Nom | Prénom | Classe |
|---|---|---|
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |

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
| 10 | ⏳ Sprint 5 : asynchronisme | – |

**10/11 cibles (00 à 09) identiques à TypeScript** après le Sprint 4 ; variantes **37/38**. Les variantes des exercices 01 à 09 sont suivies dans [variations/README.md](variations/README.md) ; l'écart connu `03-curried-stored` est une limite documentée (voir [ADR-7 §5](docs/decisions/ADR-7-arrow-generic-values.md)). Le benchmark `[3]float64` / `[][]float64` est dans [`research/tuples/`](research/tuples/).

## Documents clés

| Document | Contenu |
|---|---|
| [Synthèse](docs/synthese.md) | La réponse à la question du sujet, la démarche, les décisions clés, les résultats et les limites |
| [Décisions (ADR)](docs/decisions/) | ADR-1 (`Either` par valeur), ADR-2 (unions, `Plain`), ADR-3 (fonctions en valeur), ADR-7 (fonctions fléchées et génériques en valeur), ADR-8 (ternaire, court-circuit), ADR-9 (`matchInformation`), ADR-10 (`rightPipe`), ADR-11 (tuples), ADR-12 (`group`, `Either2`) |
| [Fiches d'exercice](docs/exercises/) | Problèmes, stratégie, Go produit, résultats observés et limites, de 00 à 09 |
| [Mesures](docs/measures.md) | Node contre Go de bout en bout, échappements, micro-benchmarks ([`research/`](research/)) |
| [Sémantique DuploJS](docs/duplojs-semantics.md) | Comportement de référence vérifié à l'exécution |
| [Soutenance](docs/soutenance.md) | Trame minutée, démo, questions probables |

Avant chaque merge, `./scripts/compare-main.sh <branche>` vérifie l'absence de régression (voir [docs/setup.md §8](docs/setup.md#8-contrôler-une-pr-avant-de-la-merger-règle-de-merge)).

## Structure

| Emplacement | Contenu |
|---|---|
| `bin/index.ts` | CLI : `--tsconfig`, `--input`, `--output` |
| `src/transpiler/` | Transformers TypeScript → AST Go, contextes, dépendances partagées |
| `src/go/` | AST Go et printer |
| `projects/00` à `projects/10` | Exercices (00 = exemple résolu) |
| `variations/` | Variantes des exercices pour tester la généricité des stratégies ([README](variations/README.md)) |
| `scripts/` | Boucle de validation (`check.sh`, `check-all.sh`), contrôle de merge (`compare-main.sh`), exécution Docker (`docker-check.sh`, `docker-check.ps1`), archive de remise (`make-zip.sh`) |
| `research/` | Mesures et prototypes : représentations d'`Either`, tuples, asynchronisme, mesures de bout en bout |
| `docs/` | Installation, sémantique DuploJS, décisions (ADR), fiches par exercice, synthèse, mesures, soutenance |

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
