# Hackathon DuploJS — Rendu d'équipe

## Membres de l'équipe

| | Nom | Prénom | Classe |
|---|---|---|---|
| 1 | EL WARDI | Abderrazzak | 5IWJ |
| 2 | MAARIFI | ZAKARIA | 5IWJ |
| 3 | BAKAYOKO | BAKAGNAN | 5IWJ |
| 4 | AHMAT | Abdoulaye Affadine | 5IWJ |

## Objectif

Étudier les stratégies permettant de transpiler du DuploJS vers Go afin d'obtenir de meilleures performances tout en préservant le comportement d'origine.

Le projet `projects/00` présente une première solution et sert de point de départ. Les projets `projects/01` à `projects/10` introduisent différentes problématiques liées à la transpilation.

**Ces projets ne sont pas des exercices à résoudre.**

Chaque projet constitue uniquement un point d'entrée vers une problématique beaucoup plus vaste et complexe. Les cas présentés ne sont ni exhaustifs ni représentatifs de toutes les situations possibles.

Il est indispensable d'imaginer et d'étudier des variantes, des cas limites et des situations plus complexes pour comprendre l'ensemble des enjeux.

**Réussir à transpiler un projet donné ne signifie pas avoir résolu la problématique qu'il introduit.**

## Démarche attendue

### Étudier avant d'implémenter

Le travail attendu est avant tout un travail d'étude et de réflexion.

Avant toute implémentation, il est nécessaire de comprendre précisément la problématique, d'identifier les différences de fonctionnement entre TypeScript/JavaScript et Go, puis d'explorer différentes variantes pour mesurer l'étendue réelle du problème.

Plusieurs stratégies doivent être envisagées et comparées en tenant compte de leurs avantages, de leurs limites et de leurs conséquences sur les performances, la mémoire et la généricité des solutions.

L'implémentation doit découler de cette réflexion, et non l'inverse.

### Privilégier le raisonnement à la production

**Ce qui nous intéresse en priorité n'est pas le code généré ni le nombre de projets correctement transpilés, mais les réflexions qui ont conduit aux solutions proposées.**

Ces réflexions doivent nous permettre de comprendre pourquoi une stratégie a été retenue, dans quelles situations elle fonctionne, quelles sont ses limites et surtout si elle peut être généralisée à d'autres cas.

Une implémentation qui fonctionne sur un exemple particulier n'apporte aucune garantie sur sa capacité à répondre à la problématique dans son ensemble.

Le code sert avant tout à illustrer, expérimenter et vérifier les hypothèses issues de l'étude.

L'objectif est d'identifier des stratégies de transpilation suffisamment générales et composables pour répondre à des problématiques réelles, au-delà des exemples fournis.

Les assistants et agents IA sont autorisés. Vous pouvez créer un skill pour encadrer vos exemples et guider votre implémentation.

## Découpage des problématiques traitées (`rendu/`)

Conformément aux consignes, le dossier [`rendu/`](rendu/) regroupe l'ensemble des problématiques identifiées et étudiées. Chaque sous-dossier contient un court `README.md` (problématique, démarche, solution et limites) ainsi que des exemples TypeScript et Go **retravaillés manuellement pour la démonstration (pas de code brut produit automatiquement par le transpileur)**.

| # | Problématique étudiée | Dossier officiel (`rendu/`) | Historique & Justifications (ADR) | Exemples manuels TS / Go |
|---|---|---|---|---|
| 01 | **Représentation d'Either & variantes** (`Success \| Fail`, `isRight`) | [`rendu/01-representation-either/`](rendu/01-representation-either/) | [ADR-1](docs/decisions/ADR-1-either.md) | [`exemple.go`](rendu/01-representation-either/exemple.go) |
| 02 | **Unions de types & formes nues** (`Plain`, dédoublonnage canonique) | [`rendu/02-unions-et-plain/`](rendu/02-unions-et-plain/) | [ADR-2](docs/decisions/ADR-2-unions.md) | [`exemple.go`](rendu/02-unions-et-plain/exemple.go) |
| 03 | **Composition (`pipe`) & curryfication** (inlining des combinateurs) | [`rendu/03-fonctions-et-curryfication/`](rendu/03-fonctions-et-curryfication/) | [ADR-3](docs/decisions/ADR-3-functions.md), [ADR-7](docs/decisions/ADR-7-arrow-generic-values.md) | [`exemple.go`](rendu/03-fonctions-et-curryfication/exemple.go) |
| 04 | **Retours multiples & inférence de `fail()`** (typage contextuel) | [`rendu/04-retours-multiples-et-fail/`](rendu/04-retours-multiples-et-fail/) | [ADR-1](docs/decisions/ADR-1-either.md) | [`exemple.go`](rendu/04-retours-multiples-et-fail/exemple.go) |
| 05 | **Collections, `map` & fonctions fléchées** (conversion de types) | [`rendu/05-collections-et-mapping/`](rendu/05-collections-et-mapping/) | [ADR-7](docs/decisions/ADR-7-arrow-generic-values.md) | [`exemple.go`](rendu/05-collections-et-mapping/exemple.go) |
| 06 | **Court-circuit, ternaire & erreurs identifiées** (`matchInformation`) | [`rendu/06-court-circuit-et-ternaire/`](rendu/06-court-circuit-et-ternaire/) | [ADR-8](docs/decisions/ADR-8-ternary-short-circuit.md), [ADR-9](docs/decisions/ADR-9-match-information.md) | [`exemple.go`](rendu/06-court-circuit-et-ternaire/exemple.go) |
| 07 | **Enchaînement dépendant & court-circuit** (`rightPipe`) | [`rendu/07-chainage-right-pipe/`](rendu/07-chainage-right-pipe/) | [ADR-10](docs/decisions/ADR-10-right-pipe.md) | [`exemple.go`](rendu/07-chainage-right-pipe/exemple.go) |
| 08 | **Tuples homogènes & déstructuration** (tableaux fixes vs slices) | [`rendu/08-tuples-et-destructuration/`](rendu/08-tuples-et-destructuration/) | [ADR-11](docs/decisions/ADR-11-tuples-destructuring.md) | [`exemple.go`](rendu/08-tuples-et-destructuration/exemple.go) |
| 09 | **Transactions atomiques & groupement** (`Either2` bivarié) | [`rendu/09-groupement-transactions-either2/`](rendu/09-groupement-transactions-either2/) | [ADR-12](docs/decisions/ADR-12-group-either2.md) | [`exemple.go`](rendu/09-groupement-transactions-either2/exemple.go) |
| 10 | **Asynchronisme séquentiel vs concurrence** (`asyncGroup`, `rightAsyncPipe`) | [`rendu/10-asynchronisme-et-sequences/`](rendu/10-asynchronisme-et-sequences/) | [ADR-5](docs/decisions/ADR-5-async.md) | [`exemple.go`](rendu/10-asynchronisme-et-sequences/exemple.go) |

## Documents clés de l'étude

En complément du dossier `rendu/`, l'ensemble des analyses détaillées, protocoles et benchmarks sont consultables dans [`docs/`](docs/) et [`research/`](research/) :

| Document | Contenu |
|---|---|
| [Synthèse](docs/synthese.md) | La réponse à la question du sujet, la démarche globale, les résultats observés et les limites argumentées |
| [Décisions d'architecture (ADR)](docs/decisions/) | ADR-1 (Either par valeur), ADR-2 (unions), ADR-3 (fonctions), ADR-5 (async), ADR-7 (fonctions fléchées), ADR-8 (ternaire), ADR-9 (erreurs), ADR-10 (rightPipe), ADR-11 (tuples), ADR-12 (Either2), ADR-13 (échelle), ADR-14 (objets et boucles) |
| [Fiches par projet](docs/exercises/) | Problèmes détaillés, stratégie de transformation, Go produit, variantes et limites (00 à 10) |
| [Mesures de performance](docs/measures.md) | Mesures complètes de bout en bout Node vs Go natif, analyse des allocations mémoire (`-gcflags=-m`) |
| [Prototypes & micro-benchmarks](research/) | Études isolées : représentations d'Either ([`research/either`](research/either/)), asynchronisme séquentiel vs goroutines ([`research/async`](research/async/)), tuples fixes vs slices ([`research/tuples`](research/tuples/)) |
| [43 variantes de test](variations/) | Cas limites et validation de la généricité des stratégies ([README](variations/README.md)) |

## Reproduction et rendu

### Commandes nécessaires à l'installation et à la reproduction

L'environnement peut être exécuté nativement (Node ≥ 22, **pnpm 12.18.0**, Go ≥ 1.24) ou intégralement via **Docker** (recommandé sous Windows). Voir [docs/setup.md](docs/setup.md) pour les détails.

```bash
# 1. Installation des dépendances
pnpm install

# 2. Vérification complète (transpilation, compilation Go, exécution et comparaison avec TypeScript)
./scripts/check-all.sh                # tous les projets de base
./scripts/check-all.sh --variations   # toutes les 43 variantes de cas limites

# 3. Vérification d'un projet ciblé
./scripts/check.sh 01

# 4. Exécution sans installation locale (Docker)
./scripts/docker-check.sh            # macOS, Linux, WSL, Git Bash
.\scripts\docker-check.ps1           # Windows (PowerShell)
```

Faites un fork du boilerplate et ouvrez une pull request vers le dépôt d'origine.
Remettez une archive ZIP correspondant au travail présenté dans la pull request au moment de la soutenance.
