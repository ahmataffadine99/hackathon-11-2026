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

## Structure

| Emplacement | Contenu |
|---|---|
| `bin/index.ts` | CLI : `--tsconfig`, `--input`, `--output` |
| `src/transpiler/` | Transformers TypeScript → AST Go, contextes, dépendances partagées |
| `src/go/` | AST Go et printer |
| `projects/00` à `projects/10` | Exercices (00 = exemple résolu) |
| `scripts/` | Boucle de validation (`check.sh`, `check-all.sh`) |
| `docs/` | Installation, décisions, fiches par exercice |

## Reproduire

1. Installer l'environnement (Node, **pnpm 12.18.0**, Go ≥ 1.24) : voir [docs/setup.md](docs/setup.md).
2. Vérifier un exercice : transpilation, compilation Go, exécution, puis comparaison avec la sortie TypeScript.

```bash
pnpm install
./scripts/check.sh 01      # un exercice
./scripts/check-all.sh     # tous les exercices, tableau récapitulatif
```

3. Transpiler un exercice seul : `pnpm build:XX`. Le Go généré est écrit dans `projects/XX/dist`.

Le détail des étapes, des fichiers produits dans `out/` et l'état initial des exercices sont décrits dans [docs/setup.md](docs/setup.md).
