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
| 01 | 🟠 ✅ avec le correctif d'intégration I1 (en attente de merge) ; 💥 sur `main` (`isRight` non branché) | [01.md](docs/exercises/01.md) |
| 02 | 🚧 Sprint 2 : `whenIsRight`, `coalescing` en valeur, union `Plain` (ADR-2) | [02.md](docs/exercises/02.md) |
| 03 | 🚧 Sprint 2 : `pipe`, forme curryfiée en `func` literal (ADR-3) | [03.md](docs/exercises/03.md) |
| 04 | 🚧 Sprint 2 : `-1` (retours inférés et `fail()` déjà fonctionnels) | [04.md](docs/exercises/04.md) |
| 05 à 10 | ⏳ à venir | – |

**0/10 exercices validés sur `main`** (1/10 avec I1). Variantes : 19 au total, dont 0 passent sur `main` (5 avec I1). État au 17/11, `./scripts/check-all.sh` et `--variations`.

Avant chaque merge, `./scripts/compare-main.sh <branche>` vérifie l'absence de régression (voir [docs/setup.md §8](docs/setup.md#8-contrôler-une-pr-avant-de-la-merger-règle-de-merge)).

## Structure

| Emplacement | Contenu |
|---|---|
| `bin/index.ts` | CLI : `--tsconfig`, `--input`, `--output` |
| `src/transpiler/` | Transformers TypeScript → AST Go, contextes, dépendances partagées |
| `src/go/` | AST Go et printer |
| `projects/00` à `projects/10` | Exercices (00 = exemple résolu) |
| `variations/` | Variantes des exercices pour tester la généricité des stratégies ([README](variations/README.md)) |
| `scripts/` | Boucle de validation (`check.sh`, `check-all.sh`), contrôle de merge (`compare-main.sh`), exécution Docker (`docker-check.sh`, `docker-check.ps1`) |
| `docs/` | Installation, sémantique DuploJS, décisions (ADR), fiches par exercice |

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
