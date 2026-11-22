# Hackathon DuploJS vers Go : plan d'étude et sprints

> 17–20 novembre 2026 · ESGI · Équipe de 3 à 4 personnes
> Document de travail interne : stratégie, explications et découpage en sprints.
> **Aucune implémentation n'est faite à ce stade.**

---

## Sommaire

0. [Point d'étape (mis à jour après le Sprint 1)](#0-point-détape-mis-à-jour-après-le-sprint-1-1711)
1. [Objectif et enjeux](#1-objectif-et-enjeux)
2. [Rappel AST : comment le transpileur pense](#2-rappel-ast--comment-le-transpileur-pense)
3. [État du boilerplate (point de départ)](#3-état-du-boilerplate-point-de-départ)
4. [Principes de transformation (nos règles)](#4-principes-de-transformation-nos-règles)
5. [Décisions structurantes à prendre tôt](#5-décisions-structurantes-à-prendre-tôt)
6. [Analyse exercice par exercice (01 → 10)](#6-analyse-exercice-par-exercice-01--10)
7. [Graphe des capacités et dépendances](#7-graphe-des-capacités-et-dépendances)
8. [Sprints](#8-sprints)
9. [Organisation de l'équipe](#9-organisation-de-léquipe)
10. [Validation, mesures et preuves](#10-validation-mesures-et-preuves)
11. [Documentation à produire](#11-documentation-à-produire)
12. [Livrables et soutenance (10 min)](#12-livrables-et-soutenance-10-min)
13. [Risques et plans de repli](#13-risques-et-plans-de-repli)

---

## 0. Point d'étape (mis à jour après le Sprint 5, 18/11)

### 0.0000 Sprint 5 mergé (`main` `fdb938a`, PR #16 à #21) **[observé]**

> Vérifié dans une copie jetable d'`origin/main` (`check-all`, `--variations`, `test:types`, `test:lint`). Les sondes de diagnostic n'ont été faites que dans cette copie, qui a ensuite été supprimée.

| Mesure | Après le Sprint 4 (`0f71e59`) | Après le Sprint 5 (`fdb938a`) |
|---|---|---|
| Exercices identiques | 10/11 | **10/11 : l'exercice 10 ÉCHOUE encore** (transpilation) |
| Variantes identiques | 37/38 | **39/43** : 10-async-pipe-plain et 10-await-direct ✅ ; 10-group-lazy-stop, 10-right-async-pipe-left et 10-sync-between 💥 transpilation ; 03-curried-stored (limite) |
| `test:types` / `test:lint` | ✅ / ❌ (11) | ✅ / **❌ 1 erreur** (`expression/await.ts:2`, `consistent-type-imports`) |
| D8 (chemins absolus) | ouvert | ✅ corrigé (`Sourced_add.Sourced_add`) |
| D13 (`[V any,]`) | ouvert | ⏳ ouvert (10 occurrences dans `shard_dependencies.go`) |

**Pourquoi 10 échoue [observé, sonde dans la copie jetable] :**
- **D20 · troncature des types.** `typeToTypeNode` est appelé **sans** `NodeBuilderFlags.NoTruncation` (3 sites : `type/goTypeOf.ts`, `statement/variable.ts`, `declaration/function.ts`). Pour un type long (le résultat de `asyncGroup`), TypeScript rend `Left<...>`, avec un nom de type littéralement `...` : le transformer Either trouve un `Left` sans valeur et échoue (`missing-either-value-type`).
- **D21 · plantage au lieu d'une erreur.** `context.error` appelle `node.getText()` sur ce nœud **synthétique**, qui n'a pas de fichier source. On obtient un `TypeError` non rattrapé, qui masque l'erreur réelle (`check-all` n'affiche que « voir out/10.build.log »).
- **Correctif essayé** : ajouter `1 /* NoTruncation */` aux 3 appels (3 lignes). **10 passe ✅**, ainsi que 10-async-pipe-plain et 10-await-direct, et types au vert. Patch : `scratchpad/notruncation.patch` (I4).
- **D22 · défauts restants d'`asyncGroup`** (copie jetable + correctif D20) :
  - `10-group-lazy-stop` et `10-right-async-pipe-left` : `notfound-transformer` sur `NeverKeyword`. Un type contient `never` (par exemple un succès impossible), et aucun transformer ne le traite.
  - `10-sync-between` : `duplojs-either-group-result-is-not-either2`. Un groupe dont toutes les fabriques réussissent a un type sans `Left`, donc pas `Either2` : le handler le refuse. La limite documentée (réordonnancement : échec au **diff**) n'est donc **pas encore démontrée**. La variante échoue plus tôt, pour une autre raison.

**Écarts au contrat du Sprint 5 :**
- **E1** : la définition de « terminé » (10 ✅) n'est pas atteinte. La fiche 10 annonce encore l'intégration Go comme non faite (attendue de P2 et P4) ; le README affiche 10 « ⏳ » ; la synthèse et la soutenance parlent de 37/38 variantes.
- **E2** : l'ADR-5 n'a pas les chiffres de l'option B (`research/async`) et emploie l'étiquette « vérifié » au lieu de « observé ».
- **E3** : la mesure de bout en bout de 10 (`docs/measures.md`) reste à faire (elle dépend de 10 ✅).
- Livré conformément au contrat : `async` et `await` (fonction, fonction fléchée, premier niveau), D8, `rightAsyncPipe`, `asyncGroup` avec fabriques appelées dans la boucle, `DCommon.asyncPipe`, 5 variantes 10, ADR-5, fiche 10, et (P1, P4) I3, `Promise<T>`, option B mesurée, mesures de 01, 05 et 09, `make-zip.sh`, synthèse, trame de soutenance.

### 0.00000 Règle de merge au Sprint 5 **[observé, API GitHub]**

| PR | Branche | Mergée par | Rapport `compare-main` dans la PR | Lint vert au merge |
|---|---|---|---|---|
| #16 | `sprint5/hotfix-i3` | aelwardi (P1) ✅ | ❌ (description de 120 caractères, rapport non collé) | ✅ |
| #17 | `sprint5/promise-type` | aelwardi ✅ | ❌ | ✅ |
| #18 | `sprint5/delivery` (contient aussi `sprint5/measures`, empilée) | aelwardi ✅ | ❌ (description vide) | ✅ |
| #19 | `sprint5/async-api` | **fermée sans merge** | – | – |
| #20 | `sprint5/async-syntax` | **ahmataffadine99 (l'auteur)** ❌ | ❌ (vide) | ❌ (introduit l'erreur de `await.ts`) |
| #21 | `sprint5/async-api` | **ahmataffadine99 (l'auteur)** ❌ | ❌ (vide) | ❌ |

**Conclusion :** pour le troisième sprint de suite, **aucun rapport** n'est collé. Le Sprint 5 ajoute deux merges faits par leur auteur, contraires à « seul P1 merge », et un lint de nouveau en échec sur `main`. Les rapports existaient pourtant localement (`out/compare-*.md`) pour #16 à #18. Au Sprint 6, la règle devient **matérielle** : P1 merge seul, et il colle le rapport lui-même **avant** de cliquer.

### 0.8 Décisions pour le Sprint 6 (consolidation et livraison)

| Sujet | Décision |
|---|---|
| **I4 (étape 0, P1)** | D20 (NoTruncation, patch de 3 lignes déjà essayé), D21 (`context.error` sûr sur un nœud synthétique : texte de remplacement au lieu de `getText()`), lint de `await.ts`. Attendu : 11/11, 0 régression. |
| **Gel** | Code (`src/`) gelé le **J3 (19/11) à 20:00** ; documentation gelée le **J4 (20/11) à 10:00** ; gel final au **J4 à 12:00** (PR ouverte vers le boilerplate, ZIP produit et vérifié). |
| **Entre encore** (avant le gel du code) | I4 ; D22 (`never`, `asyncGroup` tout succès) ; D13 (printer, cosmétique) ; corrections de documentation et de chiffres ; mesure de 10 ; enregistrements du plan B. |
| **N'entre plus** | `[N]T` pour les tuples (ADR-11 : piste chiffrée) ; union fermée (plusieurs types de gauche) ; `03-curried-stored` ; modèle à microtâches (ADR-5) ; tuples hétérogènes ; `asyncGroup` d'objet ; refactorisations ; montées de version des dépendances ; toute variante nouvelle qui n'est pas la preuve d'un correctif. |
| **Relecture croisée** | Chaque fiche et chaque ADR est relu par **une autre personne que son auteur** : cohérence des chiffres (avec `docs/measures.md`, `research/*/results.txt` et la sortie réelle de `check-all`), étiquettes « [observé] » ou « [à vérifier] » uniquement (pas « vérifié »), extraits de Go à jour après D8, états des exercices. Résultat : une table de relecture dans `docs/relecture.md`. |
| **ZIP identique à la PR** | `make-zip.sh` sur le commit de tête de la PR, puis vérification indépendante : extraire le ZIP, extraire ce même commit dans une copie jetable (`git worktree`), et `diff -r` sans différence ; contrôler aussi que la tête de la PR sur GitHub correspond au hash. |
| **Répétitions** | Deux passages chronométrés (J3 au soir et J4 à 10:30), temps notés par bloc dans `docs/soutenance.md`. |
| **Plan B hors ligne** | `scripts/record-demo.sh` enregistre dans `docs/demo/` les sorties de `check-all.sh`, de `--variations` et de `check.sh 09` et `check.sh 10` (texte), avec le hash du commit. On les montre si le réseau, Docker ou Go font défaut le jour J. |


### 0.00 Sprint 4 mergé (`main` `0f71e59`, PR #15) **[observé]**

> Vérifié dans une copie jetable d'`origin/main`, puis sur le dossier de travail après le pull.

| Mesure | Après le Sprint 3 (`102311a`) | Après le Sprint 4 (`0f71e59`) |
|---|---|---|
| Exercices identiques | 7/11 (00 à 06) | **10/11 (00 à 09)** ; 10 : `notfound-transformer` sur le type synthétique `Promise<…>` |
| Variantes identiques | 26/27 | **37/38** (11 nouvelles ; seul écart : `03-curried-stored`, limite documentée) |
| Régressions | – | **0** (tous les ✅ du Sprint 3 le restent) |
| `test:types` / `test:lint` | ✅ / ✅ | ✅ / **❌ 11 erreurs** (`either/sharedDependency.ts` ×6, `rightPipe/index.ts` ×2, `bindArrayPattern.ts`, `either/goType.ts`, `type/union.ts`) |

**Contrat du Sprint 4 : respecté sur le fond.**
- `Either2[L, R]`, `Either2SuccessOf`, `Either2FromLeft`, `getEitherValueAccess` et `bindArrayPattern` sont conformes à la signature.
- Plus aucun handler ne lit `.Value` en dur.
- `rightPipe` : `if` imbriqués **sans closure**. La fonction fléchée de l'étape est même inlinée dans un bloc, ce qui va plus loin que l'ADR-10.
- `group` : `make(…, 0, len)`, `range`, `break` au premier gauche.
- A' n'est utilisé que pour 09 (`var Sourced_transaction Either2[float64, []float64]`).
- ADR-10, 11 et 12 et fiches 07 à 09 rédigés, avec preuves `-gcflags=-m`. Benchmark des tuples fait (`research/tuples`).

**Écarts :**
- **E1 · organisation.** Un seul commit (« Complete Sprint 4 support », 2 351 lignes) dans une seule PR (`sprint4/full`), au lieu de 4 PR dans l'ordre prévu. C'est le même schéma qu'au Sprint 3 (`sprint3/full`). La relecture est impossible commit par commit.
- **E2 · ADR-11.** Le benchmark montre `[][3]float64` **5,3 fois plus rapide** que `[][]float64` (médiane 4 372 contre 23 152 ns/op) avec **0 allocation contre 1 000**. La décision « garder `[]T` » est maintenue au nom de la cohérence avec l'ADR-2. C'est défendable pour le délai, mais la justification avancée (« si l'interopérabilité Go devient prioritaire ») est bancale : c'est le **coût mesuré** qui plaide pour `[N]T`. À reformuler, et à présenter en soutenance comme une piste chiffrée.

### 0.000 Règle de merge renforcée : audit des Sprints 3 et 4 **[observé, API GitHub]**

| Règle | PR #14 (`sprint3/full`) | PR #15 (`sprint4/full`) |
|---|---|---|
| Seul P1 merge | ✅ (aelwardi) | ✅ (aelwardi) |
| Rapport `compare-main` dans la PR | ❌ description vide (le rapport existait dans `out/`, mais n'a pas été collé) | ❌ description vide |
| `test:lint` au vert avant le merge | ✅ | ❌ **11 erreurs mergées** |
| Aucun bouchon | ✅ | ✅ |
| Aucune régression | ✅ (12 → 33/38) | ✅ (constaté après coup) |

**Conclusion :** le fond est sain (0 régression, 0 bouchon), mais deux règles sur cinq n'ont pas été appliquées, dont le lint bloquant. Pour le Sprint 5, comme pour I2, un **correctif d'intégration I3** (lint) passe avant tout le reste. Le collage du rapport devient une **case de la checklist de merge** de P1.

### 0.7 Décisions pour le Sprint 5 (ex. 10, mesures, livraison)

Les constats **[observé]** ont été faits dans une copie jetable, avec `tsx` et la lecture de `dist/either/right/asyncGroup.mjs`, `asyncPipe.mjs` et `common/asyncPipe.mjs`.

| Sujet | Constat | Décision |
|---|---|---|
| **ADR-5 · modèle d'exécution** | `asyncGroup`, `rightAsyncPipe` et `asyncPipe` sont **séquentiels** (Q1). Le corps d'une fonction `async` s'exécute **dès l'appel**, jusqu'à son premier `await` (`direct c` affiché avant la suite du code). En revanche, les fabriques d'`asyncGroup` et les étapes d'`asyncPipe` et de `rightAsyncPipe` ne démarrent **qu'après** le code synchrone qui suit l'appel, car ces fonctions commencent par `await input` (sonde : « après les appels » est affiché **avant** « début a »). | **Option A, exécution synchrone séquentielle au point d'appel.** `async function` devient une fonction ordinaire, `Promise<T>` devient `T`, `await e` devient `e`, `rightAsyncPipe` passe par le handler de `rightPipe`, `asyncGroup` par celui de `group` (avec appel des fabriques **dans** la boucle, donc arrêt réel au premier gauche), et `DCommon.asyncPipe` par celui de `pipe`. Fidèle pour l'ex. 10 : aucun effet observable entre l'appel et le `await`. **Limite documentée** : un effet synchrone placé entre l'appel d'un combinateur async et son `await` serait réordonné. La variante `10-sync-between` le montre et reste en échec assumé. Un modèle exact demanderait une file de microtâches à l'exécution : c'est hors périmètre. |
| **ADR-5 · option B** (futures : goroutine et channel) | Changerait la sémantique si elle était parallèle, et ne ferait qu'ajouter un coût si elle était séquentielle. | **Prototype Go écrit à la main**, mesuré contre A (ns/op, allocs/op, nombre de goroutines). C'est un argument de soutenance, pas une implémentation. |
| **Type `Promise<T>`** | Type synthétique : la référence n'est pas résolue (`DisplayError`). | Un transformer de type reconnaît `Promise` **par symbole** (déclaration dans la lib standard de TS) et le traduit par `goTypeOf(T)`. |
| **`await` de premier niveau** | `DCommon.print(await completedCalculations)` | `await e` est traduit comme `e`, `before` compris. |
| **Mesures (§10)** | Les micro-mesures existent déjà (ADR-1, ADR-2, ADR-11). Il manque une mesure **de bout en bout**. | Tableau du §10 sur 01, 05, 09 et 10 : `hyperfine` (Node via `tsx` **et** Node sur JS compilé, contre le binaire Go), `/usr/bin/time` (mémoire résidente maximale), et le compte des « escapes to heap » dans le code utilisateur. Chaque chiffre avec sa machine et sa commande. |
| **D8 · chemins absolus dans les noms de package** | Les noms de package du Go produit encodent le chemin absolu du fichier source, répertoire personnel compris : ils sont illisibles, dépend de la machine et expose un chemin local. | **À corriger avant le gel** : nom de package dérivé du chemin **relatif au projet** (lisibilité en soutenance, ZIP reproductible). |
| **Livraison** | La table « Équipe » du README est **vide** ; la PR vers `duplojs/hackathon-11-2026` et le ZIP ne sont pas préparés. | Une personne (P1) est dédiée à la livraison et à la soutenance pour tout le sprint. |


### 0.0 Sprint 3 réalisé (branche `sprint3/full`, 17/11) **[observé]**

> Le Sprint 3 a été réalisé d'un seul tenant sur la branche `sprint3/full` : I2, puis tout le périmètre de P2, P3 et P4, puis les variantes et la documentation. Commits signés, un par étape. Les sections 0.1 à 0.6 ci-dessous décrivent l'état **avant** ce sprint et restent valables comme historique.

| Mesure | Avant (`main` `78d4752`) | Après (`sprint3/full`) |
|---|---|---|
| Exercices identiques | 2/11 (00, 01) | **7/11 (00 à 06)** |
| Variantes identiques | 10/19 | **26/27** (8 nouvelles variantes 05 et 06) |
| `test:types` / `test:lint` | ✅ / ❌ | ✅ / ✅ |
| `compare-main.sh sprint3/full` | – | **12 → 33/38, 0 régression, aucun marqueur de bouchon : mergeable** (`out/compare-sprint3-full.md`) |

Étapes (un commit chacune) : I2 · D15/ADR-7 (callbacks inlinés ou appelés, signature résolue de l'appel englobant, `whenIsRightOtherwise`, `DString.to`, `goTypeOfExpression`) · fonctions fléchées, `DArray.map`, intersections · `left`, `matchInformation`, globaux, `-0` (D16, D17, D19) · ternaire et court-circuit (ADR-8, D2) · gabarits de chaînes, types fonction, type contextuel des tableaux littéraux · variantes 05 et 06 · ADR-7, 8, 9 · fiches 02 à 06 · README.

Écarts au contrat du Sprint 3 (assumés, documentés dans l'ADR-7) :
- `createFunctionValue` : `body` reçoit des paramètres **typés** (`{ expression, goType, type }`) et renvoie une **application** (`{ before, expression, goType, type? }`), et non un `TransformationSuccess`. C'est ce qui permet au handler de fournir le type Go qu'il produit (ADR-7 §3.3).
- Nouvelle abstraction `resolveCallback` (`duplojs/application.ts`), partagée par `whenIsRight`, `whenIsRightOtherwise`, `matchInformation` et `map`.
- `03-curried-stored` reste en échec : **limite documentée**, car TypeScript lui-même type la constante en `(input: unknown) => unknown` [observé].
- Ajouts hors contrat, nécessaires aux variantes : gabarits de chaînes (`${x}` traduit comme `DString.to`), type fonction, et type contextuel pour un tableau littéral vide (`never[]`).
- Constat **[observé]** sur D19 : la cause était double. `Print` utilisait le format de `String(n)`, mais en plus `float64(-0)` est une **constante Go qui vaut +0**. D'où `JSNegativeZero()` (`math.Copysign(0, -1)`).


> Sources : `./scripts/check-all.sh`, `--variations`, `pnpm test:types` et `test:lint`, lancés sur `origin/main` (`78d4752`, PR #9 à #13) **dans une copie jetable** (`git worktree`). Également : le code mergé, `docs/decisions/ADR-2-unions.md`, `ADR-3-functions.md`, `docs/exercises/01.md` à `04.md`, et les PR GitHub (API publique).
> Historique : Sprint 0, 1/11 ; Sprint 1, 1/11 sur `main` (2/11 avec le correctif I1).

### 0.1 État de `check-all` **[observé]**

**Sur `main` : 2/11 exercices (00, 01), 10/19 variantes. ⚠️ La cible du Sprint 2 (02, 03, 04 ✅) n'est pas atteinte, et le lint est en échec (3 erreurs).**

| Cible | Résultat | Cause du premier échec |
|---|---|---|
| 00, 01 | ✅ | |
| 02, 03, 04 | 💥 transpile | `transformation-error` sur `whenIsRight(…)` : **non branché** (D14) |
| 05, 06 | 💥 transpile | `whenIsRightOtherwise` (Sprint 3) |
| 07 | 💥 transpile | `rightPipe` (Sprint 4) |
| 08, 09 | 💥 transpile | `DArray.map` (Sprint 3 et 4) |
| 10 | 💥 transpile | `TypeReference` synthétique (`Promise<…>`) |
| Variantes 01 | **7/9** ✅ | `01-is-left` : 💥 go (`Print[Either[JSUndefined]]` appliqué à un `Either[float64]`, D16) ; `01-print-values` : 💥 go (`undefined: Sourced_NaN`, D17) |
| Variantes 02–04 | **3/10** ✅ (`03-pipe-one-step`, `04-nested-if`, `04-unary`) | Les 7 autres : `whenIsRight` non branché (D14), `DArray.coalescing` en valeur (D15) |

**Ce qu'il faudrait pour atteindre la cible du Sprint 2** (essayé dans la copie jetable, rien n'est appliqué) :
1. rebrancher `whenIsRight` et remplacer les **trois bouchons mergés** par les vrais contrats (`coerceExpression`, `type/goTypeOf`, `createFunctionValue`). Le blocage devient alors `DArray.coalescing` passé en valeur ;
2. même ainsi, **02, 03 et 04 restent en échec** : le type du callback reste **générique**. On obtient `GenericValue`, puis `Coalescing<GenericValue>`, même en passant par le type contextuel ou par la signature résolue de l'appel englobant. C'est un **vrai problème de conception** (D15), pas un oubli d'intégration.

### 0.1 bis Respect de la règle de merge au Sprint 2 **[observé]**

| Règle (§0.2) | Constat |
|---|---|
| Ordre I1 → P4 → P2 → P3 → P1 | ❌ Ordre réel : #9 (P1) → **#10 (P4) → #11 (P2) → #12 (I1)** → #13 (P3). I1 est passé en 3e position. |
| Rapport `compare-main.sh` dans la PR | ❌ Les 5 PR (#9 à #13) n'ont **aucune description** : aucun rapport n'a été joint. |
| Aucun bouchon mergé | ❌ **3 bouchons mergés** : `expression/goTypeOf.ts` (P2, « Temporary P4 contract adapter; replace with type/goTypeOf before merging ») ; `createFunctionValue` local dans `duplojs/array/coalescing.ts` (P2, « Temporary local contract stub », qui renvoie toujours `notSupport`) ; `coerceToResultType` dans `either/whenIsRight/index.ts` (P3, « Bouchon LOCAL en attendant coerceExpression »). `compare-main.sh` les aurait signalés : ses motifs `Temporary`, `stub` et `Bouchon` les couvrent. |
| Point de contact branché | ❌ `whenIsRight` était branché dans la branche de P3 (`fd3ecbb`), puis **perdu en résolvant le conflit** du merge `c585e27` (`origin/main` → `sprint2/pipe-whenisright`). Le routeur fusionné ne contient plus la branche (D14). |
| `test:lint` au vert | ❌ 3 erreurs sur `main` (D18). |
| Cible du sprint ✅ ou échec documenté | ❌ 02, 03 et 04 échouent, et les fiches ne sont pas mises à jour. |

**Conclusion :** la règle existait et était outillée, mais **elle n'a pas été appliquée**. Les merges ont été faits sans passer par le contrôle. Au Sprint 3, le contrôle devient une **condition matérielle** du merge (§0.2, « Règle de merge renforcée »).

### 0.2 Décisions validées

| Décision | Contenu retenu | Source |
|---|---|---|
| **ADR-1 · Either** | **A : `Either[V]{Kind EitherKind; Information string; Value V}` par valeur.** `Kind` a 4 valeurs (Right, Left, Success, Fail), parce que `print` doit distinguer les 4 formes. Repli **A' `Either2[L, R]`** si les côtés diffèrent (ex. 09), puis union fermée générée, puis C (`any`) en dernier recours. **B (interface) est écarté.** | ADR-1, mesures : 0 alloc contre 1 par retour, 5 à 8× plus rapide sur 1000 valeurs |
| **ADR-5 · async** | **Option A (exécution synchrone séquentielle) devient la traduction fidèle**, et pas seulement un raccourci. Les options B et C (goroutines pour `asyncGroup`) sont **invalidées**. | Sémantique Q1 : `asyncGroup`, `rightAsyncPipe` et `asyncPipe` sont **strictement séquentiels** |
| **ADR-6 · print** | `print` = `console.info`, donc format **`util.inspect` de Node**, et il **renvoie son entrée** (tap). Une chaîne seule s'affiche sans guillemets, entre `'…'` dans une structure. Les clés des Either sont complètes, et `value: undefined` pour `fail`. Les tags JSON actuels **ne servent à rien** pour `print`. | Sémantique Q2, ADR-1 §1 |
| **`DString.to`** | Coercition JS native `${v}` : exponentielle si `≥1e21` ou `<1e-7`, `-0` donne `"0"`, `NaN` et `±Infinity` littéraux. Une fonction Go `JSNumberToString` dédiée est **partagée avec `print`**. | Sémantique Q4 |
| **`rightPipe`** | Étape non-Either acceptée et enveloppée **seulement à la fin** (`success(acc)`). Le transpileur connaît statiquement le type de chaque étape : il déballe ou transmet sans enveloppe intermédiaire. | Sémantique Q5 |
| **`group`** | Premier `Left` renvoyé tel quel. Tableau ou objet. Vide donne `Success([])`. Les éléments déjà construits sont **tous évalués avant** l'appel : il ne faut **pas** ajouter de court-circuit que le TS n'a pas. | Sémantique Q3 |
| **ADR-2 · unions non-Either** (Sprint 2) | Voir §0.5. Les membres d'une union sont traduits en types Go, puis **regroupés par rendu Go** : (1) que des valeurs nues de même type Go donnent ce type ; (2) des variantes Either plus des valeurs nues de même type V donnent **`Either[V]` avec une 5e forme `EitherKindPlain`** (valeur nue) ; (3) sinon, ce sont les replis de l'ADR-1 (A', union fermée, `any` justifié). **Tableaux et tuples donnent des slices `[]T`** au Sprint 2. | Type mesuré de `newResult` dans 02, 03, 04 : `Fail \| readonly [number]` **[observé]** |
| **ADR-3 · fonctions en valeur et curryfication** (Sprint 2) | Voir §0.5. (1) Les **combinateurs DuploJS sont inlinés** au site d'appel (`whenIsRight` donne un `if`) ; (2) une **forme curryfiée** (`whenIsRight(f)`) donne un **`func` literal** construit d'après le type attendu ; (3) `pipe(x, s1, s2)` donne des **appels séquentiels** (`t1 := s1(t0)`), et un `func` literal appelé immédiatement doit être inliné par Go (**[à vérifier]** avec `-gcflags=-m`) ; (4) une **fonction DuploJS générique passée en valeur** (`DArray.coalescing`) donne un `func` literal **instancié**, jamais une fonction générique nue (leçon de D1). | §6 ex. 02 et 03, ADR-4 |
| **Règle de merge** (nouvelle) | Une PR n'est mergée que si : la cible du sprint est ✅ **ou** l'échec restant est documenté ; **aucune régression** (`check-all` + `--variations`) ; le point de contact entre deux personnes est **branché et testé** dans la même PR. Le contrôle est fait par P1 avant chaque merge. | Constat du Sprint 1 (D10) |
| **Règle de merge renforcée** (Sprint 3) | (1) **Seul P1 merge**, après avoir collé dans la PR le rapport de `./scripts/compare-main.sh <branche>` ; (2) **après toute fusion de `main` dans une branche** (résolution de conflit), relancer `compare-main` avant de merger (leçon de D14) ; (3) `test:lint` au vert est **bloquant** ; (4) une PR qui dépend d'un contrat pas encore mergé **attend** ce merge : on rebase, on retire le bouchon, puis on merge. On ne merge jamais avec le bouchon. | Constat §0.1 bis |
| **ADR-2 · unions** | ✅ Implémenté (P4, PR #10) : forme `Plain`, `EitherPlainOf`, `EitherRetype`, `InspectPlain`, regroupement par type Go, types `string`, `bool` et `[]T`. Mesure : 0 allocation **[observé, ADR-2 §4]**. | `docs/decisions/ADR-2-unions.md` |
| **ADR-3 · fonctions** | ⚠️ Implémenté (P3, PR #13) mais **inopérant sur `main`** (D14, D15). L'inlinage et le `func` literal **sans échappement** sont mesurés sur un cas de recherche (`research/functions/pipe-whenisright`, « can inline init.0.func1 », aucun « escapes to heap ») **[observé, ADR-3]**, pas sur l'ex. 03, qui ne se transpile pas. | `docs/decisions/ADR-3-functions.md` |
| **ADR-7 · fonctions fléchées et fonctions génériques en valeur** (Sprint 3) | Voir §0.6. | |
| **ADR-8 · ternaire et court-circuit** (Sprint 3) | Voir §0.6. | |
| **ADR-9 · `matchInformation`** (Sprint 3) | Voir §0.6. | |
| **ADR-6 amendé · deux formats de nombre** (Sprint 3) | `JSNumberToString` = `String(n)` (`-0` donne `"0"`) pour `DString.to` ; le nombre dans `print` = `util.inspect` (**`-0` donne `"-0"`**, observé avec `tsx` dans `01-print-values`). Aujourd'hui, `Print` réutilise `JSNumberToString` : **[à vérifier]** dès que D17 sera levé, la sortie attendue est `"0"` au lieu de `"-0"`. | Variante `01-print-values` |

### 0.3 Contradictions relevées et arbitrages

| # | Contradiction | Arbitrage |
|---|---|---|
| C1 | La sémantique (§Impacts 2) recommande une **interface scellée** (option B) « pour rester proche du duck typing » ; l'ADR-1 **écarte B** sur mesures. | **ADR-1 l'emporte.** Le duck typing est un mécanisme JS d'exécution ; en Go, le typage statique du transpileur garantit déjà qu'un objet « maquillé » ne peut pas devenir un `Either`. La fidélité observable (4 formes, `print`) est assurée par `Kind`. |
| C2 | Le plan (ADR-1) proposait `Right bool` et demandait s'il fallait « garder les champs `JSNull` » ; le struct actuel `EitherSuccess[T]` ne peut représenter ni `left` ni `fail`. | `Kind` à 4 valeurs, **remplacement** de `EitherSuccess[T]` par `Either[V]`. Le nom `EitherSuccessOf` est conservé (README du 00). |
| C3 | Le plan (ex. 09) prévoyait `Either[[]V]` ; l'ADR-1 montre que le résultat de `group` est `Left<…, number> \| Success<number[]>`, donc des **types différents par côté**. | Ex. 09 → **A' `Either2[float64, []float64]`** + coercition `FromLeft` (sans allocation). |
| C4 | Plan ADR-5 : « option A justifiée faute d'I/O » ; options B/C (goroutines) proposées pour `asyncGroup`. | Q1 prouve l'exécution séquentielle : **A est la traduction fidèle** ; goroutines = **changement de comportement**. B devient une simple étude comparative facultative. |
| C5 | Sémantique (§Impacts 6) : « insérer un `Success{}` à chaque étape intermédiaire » de `rightPipe` ; ADR-1 §7 : « retours anticipés, aucune conversion ». | **ADR-1** : le transpileur connaît statiquement le type de chaque étape ; il n'enveloppe qu'**à la fin**, et seulement si la dernière étape renvoie une valeur nue (comme le runtime DuploJS). |
| C6 | ADR-1 §7 exige que `fail()` reçoive son paramètre de type **depuis le type attendu** (`EitherFailOf[float64]()`) ; le correctif D1 du 00 l'infère **depuis l'argument**, et `fail()` n'a pas d'argument. | Nouveau besoin de **typage contextuel** (`getContextualType` / type de retour de la fonction englobante) : à traiter au Sprint 1 pour le type, au Sprint 2 (ex. 04) pour les constructeurs. |
| C7 | La sémantique (§Impacts 4) et le plan (ex. 09) parlent de « boucle avec arrêt au premier gauche ». Mais dans l'ex. 09, `calculations` est **déjà évalué** avant `group`. | Pas de contradiction de résultat. La boucle s'arrête au premier gauche, mais aucun calcul n'est économisé. Ne pas transformer les éléments en fabriques. |
| C8 | `docs/setup.md` décrit une installation **macOS** ; la fiche 00 et l'ADR-1 montrent que deux postes sont sous **Windows** (`check.sh` non exécutable en PowerShell, Smart App Control bloque `go.exe`, Node 22.16 < 22.18 requis par oxlint ; mesures faites dans Docker). | La boucle de validation **n'est pas utilisable par toute l'équipe** : chantier P1 au Sprint 1 (Docker ou WSL documenté). |
| C9 | Le correctif du 00 (et le plan) passent par `typeToTypeNode` pour obtenir un type ; ce **nœud synthétique** est précisément ce qui fait échouer l'ex. 10 (`getText()` impossible). | Le transformer de type des Either (Sprint 1) doit **partir du `Type` du checker** (membres d'union, symboles), pas uniquement d'un `TypeNode`. Cela rend aussi possibles les types de retour **inférés** (ex. 04 et suivants). |
| C10 | Contrat §8 : `InspectEntry` vient de la dépendance par défaut **toujours émise** (P3) ; P3 l'enregistre **seulement** quand `print` est utilisé, avec une justification : la concaténation des dépendances dans `build.ts` ne dédoublonne pas. P4 l'a aussi déclaré **en temporaire**, sans le retirer. | Les deux déclarations entraîneraient `InspectEntry redeclared`, et en retirer une **casse le 00** (`undefined: InspectEntry`), essayé dans la copie jetable. **Arbitrage :** `inspect` passe dans `defaultSharedDependencies` et `build.ts` fusionne par **ensemble** (`new Set([...défauts, ...enregistrées])`), ce qui supprime le doublon à la source. La déclaration temporaire de P4 est retirée. Correctif I1. |
| C11 | Prompt P4 (C9) : « s'appuyer sur `getTypeFromTypeNode` » ; P4 constate que l'appel **lève une erreur** sur les nœuds synthétiques (`invalid node handle`) et résout chaque membre par symbole. | **Écart accepté** : il respecte l'intention de C9 (types inférés), et le même code sert au chemin annoté et au chemin inféré. Le « Type du checker » reste **la** règle pour l'ADR-2, mais via `resolveReferenceModule` et les symboles, pas via `getTypeFromTypeNode`. |
| C12 | Contrat §8 : 4 formes d'Either ; P4 traduit `Fail` seul en `Either[JSUndefined]`. | Extension cohérente, gardée. L'ADR-2 ajoute une 5e forme, `Plain`. |
| C13 | §8 : P1 devait intégrer les notes de P2, P3 et P4 dans `01.md`, puis les supprimer. **Ce n'est pas fait** : `01-either.notes.md` est toujours là, et les notes de P2 et P3 manquent. | L'intégration est reportée au **début du Sprint 2** (P1), après le correctif I1. |
| C14 | Contrat §8 : `coerceExpression(params: { expression; from; to; site; context })`, avec `to` de type `Type`. P4 livre `coerceExpression(params, context)`, et P3 aurait eu besoin d'un `to` sous forme de **type Go**, d'où son bouchon. | La signature de P4 est **conservée** (le contexte est un 2e argument). Le `to` reste un **`Type` TS** : c'est le type de l'appel (`getTypeAtLocation(appel)`), à passer par P3. Essayé dans la copie jetable, ça fonctionne. |
| C15 | ADR-3 : « `createFunctionValue` prend la signature attendue (type propre, sinon type contextuel) ». Pour une **fonction générique passée en valeur**, les deux sont **non instanciés** : on obtient `GenericValue`, puis `Coalescing<GenericValue>` même via le type contextuel **[observé]**. | **ADR-7** : les types des paramètres viennent de la **signature résolue de l'appel englobant**, et le type de retour vient du **corps traduit** (le handler connaît le type Go qu'il produit), jamais de la signature générique. |
| C16 | P4 voulait centraliser « type TS → type Go » dans `type/goTypeOf.ts` ; P2 a mergé **son propre** `expression/goTypeOf.ts`, sans rebaser sur la version de P4. | Un seul `goTypeOf` (`type/`). Le doublon de P2 est retiré dans le correctif I2. |
| C17 | Fiches 02 à 04 : « 04 : il ne manque que `-1` ». Sur `main`, `-1` est bien traduit (P2), mais 04 échoue sur `whenIsRight` dans son `index.ts`, qui contient le même `pipe` que 03. | La fiche 04 se trompait sur ce point : l'exercice dépend aussi de D14 et D15. ✅ Corrigé dans la fiche 04 (Sprint 3). |

### 0.4 Défauts du socle : suivi

| # | Statut |
|---|---|
| D1 instanciation générique | ✅ Corrigé. **Le piège reste actif** pour toute fonction générique passée **en valeur** (ADR-3 §4). |
| D4 ordre non déterministe | ✅ Corrigé |
| D6 variables locales inutilisées | ✅ Contourné : `const` de premier niveau donne une `var` de package (P2). Reste valable pour les temporaires `Generated_N` locales. |
| D9 imports en double dans `shard_dependencies.go` | ✅ Corrigé (P3, dédoublonnage par chemin) |
| D2 court-circuit `&&` `\|\|` | ✅ Corrigé au Sprint 3 (ADR-8), variante `06-short-circuit` |
| D3 `%`, opérateurs bit à bit sur `float64` | ⏳ Ouvert, non utilisé |
| D5 `return;` sans valeur | ⏳ Ouvert |
| D7 imports cycliques | ⏳ Limite à documenter |
| D8 noms de packages en chemin absolu | ⏳ Ouvert, faible priorité |
| D10 `isRight`/`isLeft` non branchés | ✅ Corrigé (I1, PR #12) |
| D11 `InspectEntry` en double | ✅ Corrigé (I1, PR #12) |
| D12 types chaîne, booléen et tableau | ✅ Corrigé (P4, PR #10) |
| **D13 (nouveau)** génériques imprimés `[V any,]` (virgule finale) | Cosmétique : du Go valide, mais à soigner dans le printer pour la lisibilité en soutenance |
| **D14 (nouveau)** branchement de `whenIsRight` **perdu au merge** `c585e27` (conflit dans `either/index.ts` résolu en gardant `main`) | ✅ Corrigé (I2) |
| **D15 (nouveau)** **fonction générique passée en valeur** (`DArray.coalescing`, puis `DString.to` aux ex. 05 et 07) : le type de la valeur reste générique (`GenericValue`, `Coalescing<GenericValue>`) | ✅ Corrigé (ADR-7) : 02, 03, 04 ✅ |
| **D16 (nouveau)** type générique de `Print[T]` tiré du type **rétréci** par TypeScript (`Fail` après `isLeft`) au lieu du type Go **déclaré** de la variable (`Either[float64]`) | ✅ Corrigé (`goTypeOfExpression`) : `01-is-left` ✅ |
| **D17 (nouveau)** globaux `NaN`, `Infinity` (et `undefined`) traduits en identifiants `Sourced_NaN`… | ✅ Corrigé (`expression/globals.ts`, par symbole) |
| **D18 (nouveau)** `test:lint` en échec sur `main` : `expression/goTypeOf.ts` (import de type), `statement/if.ts:77` (`init-declarations`, présent depuis la PR #6), `duplojs/array/coalescing.ts:64` (`require-await`, dans le bouchon) | ✅ Corrigé (I2), lint au vert |
| **D19 (nouveau)** `print(-0)` affiche probablement `0` au lieu de `-0` (`Print` utilise `JSNumberToString`) | ✅ Corrigé : `Print` affiche `-0`, et le littéral `-0` devient `JSNegativeZero()` : `01-print-values` ✅ |

### 0.5 ADR-2 et ADR-3 : décisions pour le Sprint 2 (implémentées, voir §0.2)

**ADR-2 · unions qui ne sont pas que des Either.**
Cas réel : `DEither.whenIsRight(result, DArray.coalescing)` renvoie les gauches **inchangées** et la sortie du callback **sans l'envelopper** (sémantique `whenIsRight`). Le type est donc `Fail | readonly [number]`, et l'exécution affiche `[ 3 ]` ou l'objet `Fail` **[observé]**.

| Option | Forme | Verdict |
|---|---|---|
| **A+ : `Either[V]` avec une forme `Plain`** | `Kind = EitherKindPlain`, `Value = []float64` ; `IsRight()` et `IsLeft()` sont **faux** (comme `isRight` à l'exécution, qui teste les clés) ; `print` affiche `Value` nue | ✅ **Retenue.** Même struct par valeur que l'ADR-1, donc **0 allocation** et aucune nouvelle machinerie. Elle couvre exactement la forme `Exclude<Input, Right> \| Output` produite par `whenIsRight`. |
| Union fermée générée (un champ par membre) | `struct { Kind; A []float64; B Either[…] }` | Repli si plusieurs types de valeur nue coexistent. Elle demande une génération de noms et une prise en charge par `print`. |
| Interface ou `any` | | Dernier recours, à justifier (coût mesuré par l'ADR-1). |

Règle de regroupement, appliquée sur les **types Go rendus** :
1. tous les membres sont nus et de même type Go T : on obtient **T**. Exemple à venir dans l'ex. 05, `readonly [number] | number[]`, qui donne `[]float64` ;
2. des variantes Either (de valeur V ou sans valeur) plus des valeurs nues de type V : on obtient **`Either[V]`** ;
3. sinon : replis de l'ADR-1, avec un `notSupport` explicite tant qu'ils ne sont pas implémentés.

**Tableaux et tuples** : `T[]`, `readonly T[]`, `[T]` et `readonly [T, T]` homogène donnent **`[]T`** au Sprint 2. Le regroupement par type Go doit fonctionner, puisque `coalescing` donne un tuple ou un tableau selon l'entrée. Les tableaux de taille fixe `[N]T` sont **reportés à l'ex. 08** (tuples annotés), comme optimisation documentée.

Coercition (`coerce`) d'une valeur vers le type d'une union : la valeur nue de type V devient `EitherPlainOf[V](v)` ; `Either[A]` vers `Either[B]` n'est permis que si **toutes les variantes gauches de A sont sans valeur** (`Fail`), via `EitherRetype[B, A](e)` ; sinon, `notSupport` documenté.

**ADR-3 · fonctions en valeur et curryfication.**

| Forme TS | Traduction Go | Pourquoi |
|---|---|---|
| `whenIsRight(e, f)` (directe) | **Inlinée** : `var r T; if e.IsRight() { r = coerce(f(e.Value)) } else { r = coerce(e) }` | Pas d'appel indirect, et le type de chaque branche est connu statiquement. |
| `whenIsRight(f)` (curryfiée) | `func(input In) T { …même code inliné… }` : un **`func` literal** dont `In` et `T` viennent du **type attendu** (la signature du résultat de l'appel, donnée par le checker) | Mécanisme **uniforme** pour toutes les fonctions data-last (`whenIsRight`, `map`, `matchInformation`…). |
| `pipe(x, s1, s2)` | `t0 := x; t1 := s1(t0); t2 := s2(t1)` ; si `sᵢ` est un `func` literal, il est **appelé immédiatement** | L'ordre d'évaluation est conservé. Go inline normalement un `func` literal appelé immédiatement et non échappé : **[à vérifier]** avec `-gcflags=-m`, en mesurant les allocations. |
| `DArray.coalescing` passé **en valeur** | `func(v float64) []float64 { return []float64{v} }`, instancié d'après le type du paramètre attendu | Une fonction générique Go ne peut pas être une valeur non instanciée (D1). |
| `coalescing(x)` (appel direct) | **Inliné statiquement** : x déjà tableau donne `x` ; sinon `[]T{x}` | Le type de x est connu à la transpilation : pas de test à l'exécution. |
| Fonction utilisateur non générique en valeur | Son identifiant Go tel quel | Une fonction Go non générique est une valeur. |

### 0.6 Décisions pour le Sprint 3 (exercices 05 et 06, et rattrapage de 02 à 04)

Ce qu'il faut traduire **[observé, sources des exercices]** :
- **05** : `pipe(result, whenIsRightOtherwise(coalescing, () => [-12]), DArray.map(DString.to))`. Sortie : `Success(3)` puis `[ '3' ]`.
- **06** : le `add` de 05, plus `left("negative-operand", one < 0 ? one : two)`, `one < 0 || two < 0` et `matchInformation(result, { "negative-operand": () => "…", success: (value) => DString.to(value) })`. Sortie : `[ '-12' ]` puis `un opérande est négatif`.

**ADR-7 · fonctions fléchées et fonctions génériques en valeur**

| Forme TS | Traduction Go | Justification |
|---|---|---|
| Fonction fléchée `(value) => expr` ou `() => { … }` | `func` literal. Les **paramètres** viennent du type de la fonction fléchée, déjà instancié par le contexte en TypeScript. Le **type de retour** est le type Go du corps traduit. Un corps-expression devient `return expr` ; un corps-bloc devient ses instructions (le `return` final est obligatoire en Go) | Les closures JS et Go capturent toutes deux **par référence** : la sémantique des variables capturées est conservée. Un `func` literal appelé immédiatement est inliné, sans allocation (ADR-3, **[observé]** sur un cas de recherche). |
| Fonction **générique** passée en valeur (`DArray.coalescing`, `DString.to`) | **Eta-expansion** : `func(p T) R { return <handler inliné>(p) }`. **T** vient de la **signature résolue de l'appel englobant**, au rang de l'argument (puis de la 1re signature d'appel de ce type). **R** est le **type Go produit par le handler**, qui le connaît : `[]T` pour `coalescing`, `string` pour `to` | Corrige D15 : la signature générique propre ne donne jamais un type instanciable (C15). |
| Fonction utilisateur non générique en valeur | Son identifiant | Inchangé (ADR-3). |

**ADR-8 · ternaire et court-circuit (corrige D2)**

| Forme | Traduction Go | Pourquoi |
|---|---|---|
| `c ? a : b` | `before(c)` ; `var t T` ; `if c { before(a) ; t = a } else { before(b) ; t = b }`, avec T = `goTypeOf(type de l'expression)` | Go n'a pas d'opérateur ternaire. Les préparations de chaque branche restent **dans** leur branche : `a` et `b` ne sont jamais évalués tous les deux. |
| `a && b` / `a \|\| b`, **sans** `before` à droite | `left && right` / `left \|\| right` natifs | Go court-circuite comme JS. Le défaut D2 ne venait que de la **sortie des deux opérandes dans des variables** (`before`). |
| `a && b` / `a \|\| b`, **avec** `before` à droite | `t := a ; if t { before(b) ; t = b }` (pour `&&`) ; `if !t { … }` (pour `\|\|`) | Le côté droit, et ses effets, ne sont évalués que si nécessaire. |
| `x \|\| défaut` sur des valeurs **non booléennes** | `notSupport` documenté | En JS, l'opérateur renvoie la **valeur** d'un opérande. Ce n'est pas utilisé dans les exercices. |

**ADR-9 · `matchInformation`**
- Forme directe : `var r T ; switch e.Information { case "negative-operand": r = coerce(h1(e.Value)) ; case "success": r = coerce(h2(e.Value)) ; default: panic("matchInformation : information non gérée") }`.
- Les clés de l'objet littéral sont lues **à la transpilation** (identifiant ou chaîne). Chaque handler reçoit la **valeur déballée**, et c'est une fonction fléchée (ADR-7) ou une référence de fonction.
- T est le type de l'appel, regroupé par type Go (ADR-2). Dans l'ex. 06, `"un opérande est négatif" | string` donne `string`.
- Le `default` qui panique reproduit le `TypeError` de l'exécution JS (sémantique : pas de garde-fou, exhaustivité garantie par TypeScript).
- La forme curryfiée devient un `func` literal (ADR-3).

**`whenIsRightOtherwise`** (sur le même modèle que `whenIsRight`) : `if e.IsRight() { r = coerce(onRight(e.Value)) } else { r = coerce(onOther(e)) }`. `onOther` reçoit l'Either **complet** (sémantique). Le type de l'ex. 05, `readonly [number] | number[]`, donne `[]float64` (règle 1 de l'ADR-2).

**`DArray.map`** : `out := make([]R, len(arr)) ; for i, v := range arr { out[i] = f(v) }`. La taille est pré-allouée et l'ordre conservé. Un callback qui lit le 2e paramètre (`{ index, self }`) donne `notSupport` documenté.

**`DString.to`** : inliné selon le type de l'argument : `float64` donne `JSNumberToString(x)` ; `string` donne `x` ; `bool` donne `"true"` ou `"false"`. En valeur, on applique l'ADR-7.

**`DEither.left(info, v)`** : `EitherLeftOf[V](info, v)`, avec V tiré du type attendu, comme `fail()`.

**Globaux (D17)** : `NaN`, `Infinity` et `undefined` sont reconnus **par symbole** (déclarations de la lib standard TS) et deviennent `math.NaN()`, `math.Inf(1)` et `JSUndefined{}`.

---

## 1. Objectif et enjeux

**Question posée :** peut-on transpiler du DuploJS vers Go pour obtenir un programme performant **tout en conservant le comportement d'origine** ?

| Élément | Ce qu'on doit en retenir |
|---|---|
| **Nature** | Une **étude de faisabilité**, pas un produit fini. Une limite bien argumentée compte comme un résultat. |
| **Périmètre** | Les exercices **01 à 10** de `projects/`. Il **ne s'agit pas** de prendre en charge tout TypeScript. |
| **Projet 00** | Exemple résolu. Ce n'est pas un exercice noté, mais il fixe les conventions : transformers, `before`, dépendances partagées, `float64`. |
| **Comportement** | Le Go produit doit se comporter comme le TS : mêmes résultats, même ordre d'évaluation, mêmes chemins d'échec. |
| **Performance** | Vitesse **et** mémoire. Éviter les allocations sur le tas, le boxing dans `interface{}` et les closures inutiles. |
| **`any`** | Autorisé s'il est **justifié**. Il préserve le comportement mais coûte en performance, et ce coût doit être écrit. |
| **Généricité** | Les stratégies doivent couvrir les **variations** possibles, pas seulement le texte exact des exemples. |
| **Honnêteté** | Séparer ce qui est **observé** (exécuté, mesuré) de ce qui reste **à vérifier**. |
| **Évaluation** | Avancement, qualité du raisonnement, mise en œuvre, documentation, restitution. Note collective. |

---

## 2. Rappel AST : comment le transpileur pense

- Le code est une **structure** et non une suite de caractères : source → tokens → **AST**.
- Un **nœud** est un objet typé dont la nature (`SyntaxKind`) détermine les champs.
- Un nœud a des **enfants typés**. L'arbre est **récursif**, et une liste comme `statements[]` **conserve l'ordre**.
- La **priorité des opérateurs devient une hiérarchie** : `1 + 2 * 3` donne `+(1, *(2, 3))`.
- Les **quatre familles** :

| Famille | Rôle | Exemples TS | Liste de transformers dans le boilerplate |
|---|---|---|---|
| **Statements** | Instructions en séquence | `if`, `return`, `ExpressionStatement`, `VariableStatement` | `statementTransformers` |
| **Declarations** | Introduisent un nom | `FunctionDeclaration`, `VariableDeclaration` | `declarationTransformers` |
| **Expressions** | Produisent une valeur | `BinaryExpression`, `CallExpression`, `ArrowFunction`, `ConditionalExpression` | `expressionTransformers` |
| **Types** | Annotations (ce ne sont pas des valeurs) | `NumberKeyword`, `TypeReference`, `UnionType`, `TupleType` | `typeTransformers` |

- Les familles **se recoupent** : une `FunctionDeclaration` est aussi un statement, et un appel peut être une expression ou une instruction. Côté Go, le boilerplate gère ce recoupement avec des **groupes de tags** (`declaration`, `statement`, `expression`, `type`).
- **Les champs imposent les imbrications** : `IfStatement.expression` est une Expression et `thenStatement` un Statement. Un transformer délègue chaque enfant à **la liste correspondant à son rôle**.

**Traduction dans notre code :** un transformer reconnaît **une** forme de nœud TS et produit **un** nœud Go. Il délègue ses enfants via `context.transform(enfant, listeAdaptée)` et remonte les instructions préparatoires dans `before`.

---

## 3. État du boilerplate (point de départ)

### Pipeline
```
CLI (bin/index.ts)
 └─ createTypescriptInstance (tsgo, API async, checker)
     └─ build() : parcours en largeur des fichiers depuis l'entrée
         └─ transformSourceFile : chaque statement → sourceFileTransformers
             ├─ résultat "declaration" → niveau package
             └─ sinon (et ses before)  → func init()
         └─ GoPrinter → fichiers .go + shard_dependencies/ + main.go + go.mod
```

### Déjà couvert (projet 00)
- `function` nommée, paramètres simples, `return expr`, bloc, appel.
- Identifiant local ou venant d'un autre fichier, littéral numérique `float64(n)`, opérateur binaire.
- Type `number` → `float64`, `DEither.Success<T>` → `EitherSuccess[T]`, `DEither.success(...)`.

### Défauts repérés à corriger ou vérifier en Sprint 0
| # | Problème | Impact |
|---|---|---|
| D1 | `EitherSuccessOf` est stocké dans une variable **sans instanciation générique** (`Generated_N := pkg.EitherSuccessOf`). Go refuse une fonction générique non instanciée. | Le projet 00 ne compilerait peut-être pas. **À vérifier avec `go build`.** |
| D2 | `&&` et `||` : les deux opérandes sont sortis dans des variables, donc **le côté droit est toujours évalué** et le court-circuit est perdu. | Faux dès qu'il y a un appel à droite (ex. 06+). |
| D3 | `%`, `& | ^ << >>` sur `float64` sont invalides en Go. | Erreur de compilation si utilisés. |
| D4 | `Promise.all` lors de la transformation des arguments et des blocs : la numérotation `Generated_N` peut varier d'un build à l'autre. | Sortie non reproductible, ce qui gêne les comparaisons. |
| D5 | `return;` sans valeur n'est pas supporté. | Mineur. |
| D6 | Variables et imports inutilisés : ce sont des erreurs en Go. | À surveiller dans le code généré. |
| D7 | Imports cycliques entre fichiers TS : cycle de packages, interdit en Go. | Limite à documenter. |

---

## 4. Principes de transformation (nos règles)

Ces règles serviront de base au **skill d'équipe** (`.agents/skills/hackathon-strategies/SKILL.md`), qui guidera l'agent IA et la revue humaine.

### 4.1 Composition
1. **Un transformer = une opération** (respecter `typescript-to-go/SKILL.md`). Pas de transformer universel.
2. **Les API DuploJS sont reconnues par symbole résolu** (module, entrée, export), jamais par le texte. Schéma : routeur de domaine, puis handler.
3. **`before` préserve l'ordre d'évaluation de JS** : on évalue la fonction appelée, puis les arguments de gauche à droite.
4. **Le contrôle de flux doit rester conditionnel.** Une préparation qui dépend d'une condition (`&&`, `||`, `?:`, branche de `if`) va **dans la branche**, pas avant le test.
5. **Le checker sert à choisir une représentation, pas à revalider le programme.** On suppose que TS l'a déjà validé.

### 4.2 Coercition, la notion centrale
TS laisse une valeur de type `S` aller là où un type `T ⊇ S` est attendu : retour, argument, affectation, branche de ternaire. Go ne le permet pas.
On introduit **une étape de coercition explicite** : `coerce(expr, typeSource, typeCible)`. Elle emballe la valeur dans la représentation de l'union cible, ou la convertit. C'est elle qui rend composables les exercices 04, 06, 07, 08 et 09.

### 4.3 Performance et mémoire
| Préférer | Éviter | Pourquoi |
|---|---|---|
| Structs **par valeur**, génériques instanciés | `interface{}` / `any` | Le boxing alloue souvent sur le tas, et le type switch a un coût. |
| Boucles `for` avec `make([]T, 0, n)` | Closures enchaînées pour `map` et `pipe` | Pré-allocation, pas d'appel indirect. |
| `[N]T` pour les tuples homogènes | `[]any` | Taille fixe, pas d'allocation propre. |
| `pipe` **inliné** en appels séquentiels | Créer des fonctions curryfiées à l'exécution | Aucune closure si l'argument est connu au site d'appel. |
| Constantes `string` pour les `information` | Construire des chaînes dynamiques | Les littéraux Go n'allouent pas. |

### 4.4 Quand accepter `any`
Seulement si **la représentation précise est impossible ou disproportionnée**, par exemple une union ouverte de types hétérogènes non bornée. Il faut alors **documenter le surcoût** (boxing, assertions de type) et, si possible, le **constater** avec `-gcflags=-m`.

---

## 5. Décisions structurantes à prendre tôt

Ces choix conditionnent tout le reste. Il faut les trancher **avant** de coder l'exercice 01, et les noter en ADR (*Architecture Decision Record*) dans `docs/decisions/`.

### ADR-1 : représentation des valeurs `Either`
> ✅ **Tranché** : option A avec `Kind` à 4 valeurs, puis replis A', union fermée et C. Voir [docs/decisions/ADR-1-either.md](decisions/ADR-1-either.md) et le §0.2. Le tableau ci-dessous est l'analyse initiale, conservée pour la soutenance.

| Option | Forme Go | + | − |
|---|---|---|---|
| A. **Struct taguée générique par valeur** | `type Either[V any] struct{ Right bool; Information string; Value V }` | Pas d'allocation, comparaison rapide, compatible JSON. | Toutes les variantes doivent partager `V`. |
| B. Interface plus une struct par variante | `type Either interface{...}` avec `Right[V]`, `Left[V]` | Fidèle aux unions TS. | Boxing, allocations, type switch. |
| C. Struct avec `Value any` | `struct{...; Value any}` | Couvre tout. | Perd la performance et le typage. |

**Recommandation :** **A** par défaut. Le checker calcule l'union des types de `Value` ; s'ils coïncident (cas `float64` dans 04, 06 et 07), on utilise `Either[float64]`. **Repli sur B ou C** en cas d'hétérogénéité, documenté comme limite.
Point à étudier : faut-il garder les champs `JSNull` actuels (`Right`, `Success`) pour reproduire le JSON DuploJS, ou un simple `Kind uint8` ? Il faut trancher selon la sortie attendue de `DCommon.print`.

### ADR-2 : unions TS générales (hors `Either`)
> ✅ **Tranché pour le Sprint 2** : `Either[V]` avec une forme `Plain`, regroupement par type Go, tableaux et tuples en `[]T`. Voir §0.5.

Exemple de l'exercice 02 : `whenIsRight(result, coalescing)` donne `number[] | Fail`, soit **un tableau ou un Either**.
- Option « union fermée générée » : une struct avec un discriminant et un champ par membre (`Kind`, `A []float64`, `B Either[...]`). Pas de boxing, mais la struct est plus grosse.
- Option « interface » : plus simple, mais avec boxing.
→ La décision dépend de la **fréquence réelle** dans les exercices. À noter.

### ADR-3 : fonctions comme valeurs et curryfication
> ✅ **Tranché pour le Sprint 2** : combinateurs inlinés, forme curryfiée en `func` literal, `pipe` en appels séquentiels. Voir §0.5.

- La fonction est **connue au site d'appel** (`pipe(x, f(a))`) : on fait un **appel direct** avec tous les arguments, sans closure.
- La fonction **échappe** (stockée, passée à `map`) : on génère un **`func` literal**.
- Une **fonction générique** passée en valeur (`DArray.coalescing`, `DString.to`) doit être **instanciée** avec les types résolus par le checker (`getResolvedSignature`). C'est la même cause que le défaut D1.

### ADR-4 : runtime DuploJS en Go
Les fonctions DuploJS (`WhenIsRight`, `Map`, `Group`…) sont-elles :
- **émises comme fonctions génériques** dans `shard_dependencies` (simple, réutilisable, mais un appel par étape),
- ou **inlinées** par le transformer en code spécifique au site d'appel (plus performant, mais génère plus de code) ?

**Recommandation :** inliner les combinateurs de contrôle (`pipe`, `rightPipe`, `whenIsRight`, `matchInformation`), et garder en fonctions partagées les utilitaires de données (`coalescing`, `to`, `print`).

### ADR-5 : asynchronisme (exercice 10)
> ✅ **Orienté** : `asyncGroup`, `rightAsyncPipe` et `asyncPipe` sont **séquentiels** (sémantique Q1). L'exécution synchrone est donc la traduction fidèle. Il reste à écrire l'ADR au Sprint 5.

### ADR-6 : `DCommon.print` et la sortie
> ✅ **Tranché** : format `util.inspect` de Node (sémantique Q2). Le formateur Go dédié vit dans `shard_dependencies`, avec un prototype dans `research/either/inspect/`.

Il faut **établir la sortie de référence** en exécutant le TS (`tsx projects/XX/index.ts`), puis choisir un `print` Go qui produit **la même chose** : sérialisation identique, format des nombres JS, etc.

---

## 6. Analyse exercice par exercice (01 → 10)

> Pour chaque exercice, on note les **nouveautés**, les **variations** à couvrir au-delà de l'exemple, la **stratégie**, et les **limites probables**.
> « Vérifier » signifie confirmer la sémantique DuploJS dans la doc `@duplojs/agents-kit` (routeurs API et concepts).

### 01 · Union de retour, `if`, `const`, `isRight`, `print`
- **Nouveautés :** type de retour `Success<number> | Fail` ; `const x = …` ; `IfStatement` ; `DEither.isRight` ; `DCommon.print`.
- **Variations :** `let` et `const`, `if/else`, `else if`, condition avec `before`, `isLeft`, union dans l'autre ordre, alias d'import.
- **Stratégie :**
  - `UnionType` d'`Either` vers `Either[V]` (ADR-1) ; `Fail` vers une variante gauche avec une valeur zéro.
  - `const` vers `x := …`.
  - `if` : les `before` de la condition vont **avant** le `if`. Pour un `else if`, ils doivent rester **dans** le `else`.
  - `isRight(e)` vers `e.Right` (ou `e.Kind == right`), inliné.
  - Le *narrowing* TS n'a pas de coût en Go, puisque c'est la même struct.
- **Limites :** `print` doit reproduire le format DuploJS (ADR-6).
- **Après le Sprint 0 :** voir le détail du Sprint 1 au §8. Le `const` de premier niveau devient une **`var` de package** plus une affectation dans `init()`. Il reste ainsi visible des fonctions du fichier, et le défaut D6 est évité.

### 02 · Fonction en argument : `whenIsRight(result, coalescing)`
- **Nouveautés :** passer une **fonction générique** en valeur ; `DArray.coalescing` ; le résultat est une **union hétérogène** (`number[] | Fail`).
- **Variations :** une fonction utilisateur, une arrow, une fonction importée d'un autre fichier, un alias.
- **Stratégie :** instancier la fonction (ADR-3). Inliner `whenIsRight` : `if e.Right { r = f(e.Value) } else { r = e }`. Le type de `r` vient de l'ADR-2.
- **Limites :** le coût de l'union hétérogène est à documenter.

### 03 · `pipe` et forme curryfiée
- **Nouveautés :** `DCommon.pipe(x, …steps)` ; `whenIsRight(fn)` en **application partielle**.
- **Variations :** `pipe` à 1..N étapes, étapes curryfiées ou non, arrow inline, `pipe` imbriqué.
- **Stratégie :** **inliner `pipe`** : chaque étape devient une variable temporaire. Une étape curryfiée connue est appelée en forme complète `whenIsRight(prev, fn)`, sans closure. Si l'étape est une valeur inconnue (une variable de fonction), on fait un appel indirect.
- **Limites :** une forme curryfiée stockée dans une variable puis réutilisée produit une closure.

### 04 · Plusieurs chemins de retour
- **Nouveautés :** `if (one === -1) return fail();` ; le type de retour est **inféré** comme union par le checker ; `===` sur un nombre.
- **Variations :** `return` dans les deux branches, `return` imbriqué, retour de types différents, retour sans `else`.
- **Stratégie :** le type Go de la fonction vient du type de retour inféré. **Chaque `return` passe par la coercition** (§4.2) vers ce type. `-1` est une `PrefixUnaryExpression`.
- **Limites :** `NaN` et `-0` : `==` en Go se comporte comme `===` en JS pour les floats (à vérifier et noter).

### 05 · `whenIsRightOtherwise`, arrow, tableaux, `DArray.map`, `DString.to`
- **Nouveautés :** `ArrowFunction` (`() => [-12]`) ; `ArrayLiteral` ; `map` curryfié dans un `pipe` ; conversion nombre → chaîne.
- **Variations :** arrow avec bloc ou expression, avec ou sans paramètres, tableau vide, `map(arr, fn)` contre `map(fn)`.
- **Stratégie :**
  - Arrow vers `func` literal, ou inlining si elle est appelée immédiatement par un combinateur inliné.
  - Tableau vers slice `[]float64{…}`.
  - `map` vers une boucle `for` sur un slice pré-alloué.
  - `DString.to(float64)` vers un formatage **identique à JS** (`strconv.FormatFloat(v, 'f', -1, 64)` diverge sur les exposants et sur `-0` : à traiter ou à documenter).
- **Limites :** l'index optionnel passé au callback de `map`.

### 06 · Erreurs identifiées, `matchInformation`, ternaire
- **Nouveautés :** `DEither.left("negative-operand", v)` ; `matchInformation(result, { … })` ; `?:` ; `||` ; `<` ; littéraux string.
- **Variations :** plusieurs informations, information absente du `match`, handler qui ignore la valeur, ternaire imbriqué, ternaire avec des appels dans les branches.
- **Stratégie :**
  - `Information` est une **constante string**.
  - `matchInformation` devient un `switch e.Information { case "…": … }`, avec un résultat de type commun calculé par le checker.
  - **Ternaire :** `var t T; if c { …before; t = a } else { …before; t = b }`.
  - **Corriger D2 :** `||` et `&&` avec le même schéma conditionnel.
- **Limites :** type de résultat hétérogène entre handlers (repli ADR-2).

### 07 · `rightPipe` : chaînage avec court-circuit
- **Nouveautés :** `DEither.rightPipe(e, f1, f2…)` ; deuxième fichier `divide.ts` ; division (`/ 0` donne `Infinity` en JS et `+Inf` en Go, à vérifier).
- **Variations :** N étapes, une étape qui retourne une valeur non-Either (à vérifier dans la sémantique DuploJS), un Either initial déjà à gauche.
- **Stratégie :** inliner en `if`/`goto` séquentiel ou en fonction locale avec retours anticipés. L'union finale accumule les informations gauches de toutes les étapes (via le checker).
- **Limites :** les divisions constantes par zéro sont refusées par Go à la compilation (on les évite grâce aux variables temporaires).

### 08 · Collection de calculs, tuples, déstructuration
- **Nouveautés :** `[number, number, number][]` ; littéral de tableau de tuples ; paramètre `([a, b, c]) =>` ; `map` d'Either.
- **Variations :** tuple hétérogène (`[string, number]`), tuple avec élément optionnel, déstructuration avec défaut, élision.
- **Stratégie :**
  - Tuple homogène vers **`[3]float64`** (valeur, pas d'allocation).
  - Tuple hétérogène vers **struct anonyme** `struct{ F0 string; F1 float64 }`.
  - Déstructuration : `func(p [3]float64) { one, two, divisor := p[0], p[1], p[2]; … }`.
  - Tableau de tuples : `[][3]float64`, en mémoire contiguë.
- **Limites :** reste et défauts dans la déstructuration (hors périmètre, à documenter).
- **Après le Sprint 0 :** `DArray.map` passe `{ index, self }` en deuxième argument au callback. Le callback de l'ex. 08 l'ignore, donc la boucle Go ne le construit pas. Si un callback le lit, c'est une variation à documenter.

### 09 · `group` : transaction tout ou rien
- **Nouveautés :** `DEither.group(array)` ; réduction en `Either[[]V]` ; premier échec propagé.
- **Variations :** groupe d'objet ou de tableau (vérifier ce que DuploJS accepte), groupe vide.
- **Stratégie :** boucle avec arrêt au premier gauche ; slice résultat pré-alloué à `len(input)`.
- **Limites :** l'ordre de propagation de l'échec (premier ou tous ?) est à vérifier dans DuploJS.
- **Après le Sprint 0 :** c'est le **premier** `Left` qui est renvoyé (sémantique Q3). Le type de résultat est `Either2[float64, []float64]` (ADR-1, A') et non `Either[[]V]`. Les éléments sont déjà évalués avant l'appel.

### 10 · Asynchronisme : `async`, `await`, `rightAsyncPipe`, `asyncGroup`, `asyncPipe`
- **Nouveautés :** `async function`, `Promise`, `await` de premier niveau, fabriques `() => calculate(...)`.
- **Questions à trancher :**
  - `asyncGroup` exécute-t-il les fabriques **en parallèle** (`Promise.all`) ou **séquentiellement** ? **À vérifier.**
  - JS est mono-thread avec une boucle d'événements ; Go a des goroutines préemptives.
- **Options :**

| Option | Forme | + | − |
|---|---|---|---|
| A. **Synchrone** | `async`/`await` effacés, fonctions directes | Ordre identique, zéro coût. | Faux en présence de vraie concurrence ou d'I/O. |
| B. **Future** | `Promise[T]` = struct + `chan T` / `sync.WaitGroup`, `await` = réception | Sémantique de disponibilité différée. | Allocation d'un channel et d'une goroutine par promesse. |
| C. Mixte | Synchrone si aucune I/O, goroutines pour `asyncGroup` | Bon compromis. | Analyse plus complexe. |

- **Recommandation :** A pour l'exemple (aucune I/O réelle), **justifié** et documenté, plus un prototype B en Go écrit à la main pour **comparer** (mémoire, goroutines) et discuter de la généralisation.
- **Après le Sprint 0 :** l'option A est **la traduction fidèle**, car DuploJS exécute tout séquentiellement (sémantique Q1). Paralléliser avec des goroutines changerait le comportement. Le blocage actuel vient du type de retour inféré `Promise<…>`, un nœud synthétique (C9).
- **Limites :** ordre des micro-tâches, effets de bord entrelacés, rejets de promesses.

---

## 7. Graphe des capacités et dépendances

| Capacité | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Représentation `Either` (ADR-1) | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| `const` / `if` | ● | ● | ● | ● | ● | ● | ● | | | |
| `print` | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Fonction en valeur + instanciation | | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Union hétérogène (ADR-2) | | ● | ● | ● | | | | | | |
| `pipe` / curryfication | | | ● | ● | ● | ● | ● | ● | | ● |
| Coercition de retour | | | | ● | | ● | ● | ● | ● | ● |
| Arrow, tableaux, `map`, `to` | | | | | ● | ● | ● | ● | ● | ● |
| `left` / `matchInformation` / ternaire / `||` | | | | | | ● | ● | ● | ● | ● |
| `rightPipe` | | | | | | | ● | ● | ● | ● |
| Tuples / déstructuration | | | | | | | | ● | ● | |
| `group` | | | | | | | | | ● | |
| Async | | | | | | | | | | ● |

**Lecture :** chaque exercice réutilise presque tout le précédent. La **progression est cumulative**, donc un ordre linéaire est naturel. Le socle (ADR-1, coercition, `print`) est le chemin critique.

---

## 8. Sprints

> Hypothèse : J1 = 17/11 (aujourd'hui), soutenance le 20/11. On compte environ **7 demi-journées utiles**.
> Chaque sprint se termine par une **démo interne de 10 min**, un **commit** et une **mise à jour de la doc de l'exercice**.
> **Définition de « terminé » pour un exercice :** le Go **compile**, `go run` produit **la même sortie** que `tsx`, la fiche de doc est remplie, et au moins une variation est testée.

### Sprint 0 · Fondations et outillage (J1 matin, environ 3 h) · **bloquant**
- Fork du boilerplate, accès pour l'équipe, README avec noms, prénoms et classes.
- Environnement : `pnpm install` (corriger le problème pnpm 12.18), **installer Go ≥ 1.24** (alias génériques).
- Lancer `build:00` et `go build` / `go run` : **confirmer ou corriger D1**.
- Script `scripts/check.sh <XX>` : `tsx` (sortie de référence), transpilation, `go vet`, `go run`, puis `diff`.
- Ajouter les scripts `build:02` à `build:10` dans `package.json`.
- Corriger D4 (numérotation déterministe) pour pouvoir comparer le Go produit d'un build à l'autre.
- Lire la doc DuploJS des API utilisées (`whenIsRight`, `coalescing`, `group`, `asyncGroup`, `print`, `to`).
- **Livrable :** boucle de validation automatique fonctionnelle sur 00.
- ✅ **Terminé le 17/11** (PR #1 à #4) : 00 identique au TS, `check.sh` et `check-all.sh`, fiche de sémantique, ADR-1. Reste ouvert : la boucle de validation sous **Windows** (C8), reportée au Sprint 1.

### Sprint 1 · Socle de représentation + exercice 01 (J1 après-midi)
- ~~Rédiger ADR-1~~ (fait) et ADR-6 (fait). **ADR-2** (unions non-Either) est reporté au Sprint 2, car l'exercice 01 n'en a pas besoin.
- Implémenter : type union d'`Either`, `Fail`, `const`, `if`/`else`, `isRight`/`isLeft`, `print`.
- Commencer le **skill d'équipe** avec les règles du §4 et les arbitrages du §0.3.
- **Livrable :** **01 terminé** et documenté.

#### Ce que l'exercice 01 exige (vérifié sur le code)

| Fichier | Construction TS | Traduction Go visée | Qui |
|---|---|---|---|
| `add.ts` | `): (DEither.Success<number> \| DEither.Fail)`, une union de type annotée | `shard_dependencies.Either[float64]` | **P4** |
| `add.ts` | `return DEither.success(one + two)` | `return shard_dependencies.EitherSuccessOf[float64](…)`, qui renvoie désormais `Either[V]` | **P4** (dépendance partagée) |
| `index.ts` | `const result = add(1, 2);` au premier niveau | `var Sourced_result <type>` (package), puis `Sourced_result = …` dans `init()` | **P2** |
| `index.ts` | `if (…) { … }` | `if cond { … }`, les `before` de la condition placés avant le `if` | **P2** |
| `index.ts` | `DEither.isRight(result)` | `Sourced_result.IsRight()` (méthode inlinée par Go) | **P3** |
| `index.ts` | `DCommon.print(result)` | `shard_dependencies.Print[T](…)`, qui écrit au format `util.inspect` et renvoie son entrée | **P3** |
| — | Fiche, variantes, validation multi-OS | `docs/exercises/01.md`, `variations/01-*`, `check.sh` sous Windows | **P1** |

Sortie de référence attendue (`out/01.ts.txt`) :
```
{
  '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 3,
  '@duplojs/lang/kind/@DuplojsLangEither/success': null
}
```

#### Contrat d'interface Go (à respecter par tous, fixé avant de coder)

Sans ce contrat, P2, P3 et P4 se bloqueraient mutuellement. Tous les noms sont exportés depuis le package `shard_dependencies`.

```go
// ── P4 · dépendance partagée « either » (remplace EitherSuccess[T]) ──
type EitherKind uint8
const (
	EitherKindRight EitherKind = iota
	EitherKindLeft
	EitherKindSuccess
	EitherKindFail
)
type Either[V any] struct { Kind EitherKind; Information string; Value V }
func EitherSuccessOf[V any](value V) Either[V]           // nom conservé (README 00)
func EitherFailOf[V any]() Either[V]                      // value affichée : undefined
func (e Either[V]) IsRight() bool                         // Right || Success
func (e Either[V]) IsLeft() bool                          // Left  || Fail
func (e Either[V]) InspectEntries() []InspectEntry        // clés DuploJS dans l'ordre exact de print

// ── P3 · dépendance par défaut « inspect » (toujours émise, comme JSNull/JSUndefined) ──
type InspectEntry struct { Key string; Value any }
type Inspectable interface { InspectEntries() []InspectEntry }
func Print[T any](value T) T                              // console.info + util.inspect, renvoie value
func JSNumberToString(value float64) string               // String(n) en JS, réutilisé par DString.to
```

- `InspectEntries` de `Fail` renvoie `JSUndefined{}` comme valeur, et les clés de tag (`…/right`, `…/success`) valent `JSNull{}`. Le formateur de P3 ne connaît donc **pas** `Either`. Il sait afficher n'importe quel objet à clés ordonnées, ce qui resservira pour les objets et les tuples.
- Le `any` de `InspectEntry.Value` est **assumé** : il ne sert qu'au chemin d'affichage, limité par les entrées-sorties, jamais au calcul. Ce choix est à justifier dans la fiche 01.
- `Print[T]` et `EitherFailOf[V]` sont génériques : il faut **toujours les instancier explicitement** (leçon de D1).

#### Partage des fichiers (périmètres disjoints)

| Personne | Possède (création et modification) | Ne touche pas |
|---|---|---|
| **P1** | `docs/exercises/01.md`, `variations/`, `scripts/`, `docs/setup.md`, `README.md`, `package.json` (scripts) | `src/` |
| **P2** | `src/transpiler/transformers/statement/` (sauf `return.ts`), `src/transpiler/transformSourceFile.ts`, `src/go/` (seulement si un nœud manque) | `duplojs/`, `type/`, `sharedDependency/` |
| **P3** | `src/transpiler/transformers/duplojs/common/` (nouveau), `src/transpiler/transformers/duplojs/either/isRight/` (nouveau), `src/transpiler/sharedDependency/defaults/`, `src/transpiler/build.ts` (dédoublonnage des imports, D9), `src/transpiler/transformers/duplojs/index.ts` | `type/`, `statement/` |
| **P4** | `src/transpiler/transformers/type/`, `src/transpiler/transformers/duplojs/either/` (sauf `isRight/`), dont `either/index.ts` (routeurs) et la dépendance `either` | `statement/`, `common/` |

**Seul point de contact :** P3 ajoute **une branche** `DPattern.match("isRight" | "isLeft")` dans le routeur d'expressions de `either/index.ts`, qui appartient à P4. Ordre de merge : **P4 → P2 → P3 → P1**. P3 rebase sur P4 avant d'ajouter sa branche.

#### Définition de « terminé » du Sprint 1
`./scripts/check.sh 01` affiche ✅ IDENTIQUE ; 00 reste ✅ ; au moins 4 variantes de `variations/01-*` passent ou ont une limite documentée ; `pnpm test:types` vert ; `docs/exercises/01.md` rempli.

> **Bilan du Sprint 1 (17/11)** : ❌ **non atteint sur `main`** (01 en échec, 0/9 variantes), alors que tout le code nécessaire est écrit. Deux points de contact n'ont pas été branchés (D10, D11). Avec le correctif I1 (≈ 30 lignes, essayé hors du dépôt) : 01 ✅ et 4/9 variantes. Les 5 autres bloquent sur les types chaîne (D12). La fiche 01 n'est pas complétée (C13). Ces points ouvrent le Sprint 2.

### Sprint 2 · Fonctions et composition : 02, 03, 04 (J2 matin)
- ~~ADR-3 et ADR-4~~ : ADR-2 et ADR-3 sont tranchés au §0.5. L'ADR-4 est absorbé par l'ADR-3 (combinateurs inlinés, utilitaires de données en fonctions partagées ou inlinés statiquement).
- Instanciation des fonctions génériques en valeur, `whenIsRight` inliné, `coalescing`, `pipe` inliné, forme curryfiée.
- Coercition de retour et plusieurs `return` (04), `PrefixUnary`, `===`.
- **Livrable :** **02, 03 et 04 terminés.**

#### Étape 0 : correctif d'intégration I1 (avant tout le reste, P3, environ 30 min)

C'est le patch essayé dans la copie jetable, qui fait passer **01 en ✅** et 4 variantes. Il doit être mergé **avant** les autres PR du Sprint 2 :
1. `either/index.ts` : brancher `isRight` et `isLeft` sur les handlers existants de `either/isRight/` (2 `DPattern.match`) ;
2. `either/sharedDependency.ts` : retirer la déclaration **temporaire** de `InspectEntry` (P4 l'avait prévu dans ses notes) ;
3. `sharedDependency/defaults/index.ts` : ajouter `inspectSharedDependency` aux défauts ;
4. `build.ts` : fusionner défauts et dépendances enregistrées **par ensemble** (`new Set([...])`) au lieu de `DGenerator.concat`.

Vérification : `check-all.sh 00 01` donne 2/2 ✅, et `check-all.sh --variations 01` donne au moins 4/9.

#### Ce que les exercices 02, 03 et 04 exigent (vérifié avec le correctif I1)

| Ex. | Construction | Type ou forme TS **[observé]** | Traduction Go visée | Qui |
|---|---|---|---|---|
| 02 | `DEither.whenIsRight(result, DArray.coalescing)` | `Fail \| readonly [number]` | `Either[[]float64]` (forme `Plain`), `whenIsRight` inliné | P3 (whenIsRight), P4 (type, coercition) |
| 02 | `DArray.coalescing` **en valeur** | générique `<V>(v: V) => Coalescing<V>` | appel inliné `[]float64{v}` ou `func` literal instancié | P2 |
| 03 | `DCommon.pipe(result, DEither.whenIsRight(DArray.coalescing))` | forme **curryfiée** | `t1 := func(in Either[float64]) Either[[]float64] {…}(t0)` | P3 |
| 04 | `if (one === -1) { return DEither.fail(); }` + 2e `return` | retour **inféré** `Fail \| Success<number>` | `if Generated == float64(-1) { return EitherFailOf[float64]() }` | P2 (`-1`, `return` imbriqué) ; P4 (déjà fait : type inféré, `fail()` contextuel) |
| 02–04 | `DCommon.print(newResult)` sur une valeur `Plain` | | `[ 3 ]` (valeur nue), l'objet `Fail` sinon | P3 (formateur), P4 (`InspectPlain`) |
| 01 (rattrapage) | `print("…")`, `print([1, 2, 3])` | `LiteralType` chaîne, tableaux | types `string`, `bool`, `[]T` | P4 (types), P2 (littéraux d'expression) |

Sorties de référence **[observé]** : 02 et 03 affichent le `Success(3)` puis `[ 3 ]` ; 04 affiche l'objet `Fail` (et rien pour `isRight`).

#### Contrat d'interface (fixé avant de coder)

```go
// ── P4 · dépendance « either » : ajouts de l'ADR-2 ──
const EitherKindPlain EitherKind = 4                         // valeur nue (membre non-Either d'une union)
func EitherPlainOf[V any](value V) Either[V]                  // Kind = Plain ; IsRight() == IsLeft() == false
func EitherRetype[To, From any](e Either[From]) Either[To]    // copie Kind + Information, Value = zéro de To ;
                                                              // seulement si les gauches de From sont SANS valeur (Fail)
func (e Either[V]) InspectPlain() (any, bool)                 // (e.Value, true) si Kind == Plain

// ── P3 · Print (defaults/inspect) ──
// Print teste d'abord interface{ InspectPlain() (any, bool) } (affiche la valeur nue),
// puis Inspectable (objet à clés), puis les valeurs simples.
```

```ts
// ── P4 · src/transpiler/transformers/type/goTypeOf.ts ──
// Centralise « Type du checker → type Go » (aujourd'hui dupliqué dans variable.ts, success, print).
export function goTypeOf(type: Type, site: TsAST.Node, context: BuildContext):
	Promise<TransformationSuccess<GoAST.Type | GoAST.TypeReference> | TransformationError | NotfoundTransformer>;

// ── P4 · src/transpiler/transformers/duplojs/either/coerce.ts ──
// Rend une expression Go de type `from` utilisable là où `to` est attendu (ADR-2) :
// identité si même type Go, EitherPlainOf pour une valeur nue, EitherRetype pour des gauches sans valeur.
export function coerceExpression(params: {
	expression: GoAST.Expression; from: Type; to: Type; site: TsAST.Node; context: BuildContext;
}): Promise<TransformationSuccess<GoAST.Expression> | TransformationError | TransformationNotSupported>;

// ── P3 · src/transpiler/transformers/duplojs/application.ts ──
// Construit un func literal Go à partir du type de fonction attendu en `site`
// (getTypeAtLocation, sinon type contextuel ; 1re signature d'appel).
export function createFunctionValue(params: {
	site: TsAST.Node; context: BuildContext;
	body: (parameters: readonly GoAST.Identifier[]) =>
		Promise<TransformationSuccess<GoAST.Expression> | TransformationError | NotfoundTransformer>;
}): Promise<TransformationSuccess<GoAST.FunctionLiteral> | TransformationError | NotfoundTransformer | TransformationNotSupported>;
```

#### Partage des fichiers (périmètres disjoints)

| Personne | Possède | Points de contact (à brancher **et tester** dans sa PR) |
|---|---|---|
| **P3** | **I1** (4 fichiers listés ci-dessus, avec l'accord de P4) ; `duplojs/application.ts` (nouveau) ; `duplojs/common/` (dont `pipe/`, nouveau) ; `duplojs/either/whenIsRight/` (nouveau) ; `sharedDependency/defaults/` ; `build.ts` ; `docs/decisions/ADR-3-functions.md` | ajoute **une** branche `whenIsRight` dans `either/index.ts` (routeur de P4) |
| **P4** | `transformers/type/` (dont `goTypeOf.ts`, `string.ts`, `boolean.ts`, `array.ts`, `tuple.ts`, `typeOperator.ts`) ; `duplojs/either/` (sauf `isRight/` et `whenIsRight/`), dont `either/types/`, `either/coerce.ts` et la dépendance `either` ; `docs/decisions/ADR-2-unions.md` | aucun |
| **P2** | `transformers/expression/` (préfixe unaire, chaîne, booléen, littéral de tableau) ; `transformers/statement/` (y compris `return.ts`) ; `duplojs/array/` (nouveau routeur + `coalescing`) ; `duplojs/index.ts` (enregistrement du domaine `array`) | utilise `createFunctionValue` (P3) pour `coalescing` en valeur |
| **P1** | `docs/exercises/01.md` (finalisation, suppression des `.notes.md`), `02.md`, `03.md`, `04.md` ; `variations/02-*`, `03-*`, `04-*` ; `scripts/` ; `README.md` ; **contrôle de la règle de merge** | aucun |

**Ordre de merge : I1 → P4 → P2 → P3 → P1.** Pendant le développement, chacun code contre le contrat avec des **bouchons locaux non commités**. Un bouchon ne doit jamais être mergé (leçon de D11).

#### Définition de « terminé » du Sprint 2
`check-all.sh` : **00 à 04 ✅** ; `--variations 01` : **au moins 8/9** (l'écart restant documenté) ; les variantes 02, 03 et 04 existent, et chacune passe ou a une limite documentée ; preuve `-gcflags=-m` que le `func` literal d'un `pipe` ne s'échappe pas (ou constat contraire documenté) ; `ADR-2-unions.md` et `ADR-3-functions.md` rédigés ; fiches 01 (complète), 02, 03 et 04 ; `test:types` et `test:lint` au vert.

> **Bilan du Sprint 2 (17/11)** : ❌ **cible non atteinte** (02, 03 et 04 en échec, lint en échec). Atteint : ADR-2 et ADR-3 rédigés avec des mesures ; types `string`, `bool` et `[]T` ; forme `Plain` ; préfixe unaire ; littéraux ; variantes 01 à 7/9 ; variantes 02–04 à 3/10. Causes : un branchement perdu au merge (D14), trois bouchons mergés (§0.1 bis), et un problème de conception sur les fonctions génériques en valeur (D15).

### Sprint 3 · Valeurs riches : 05, 06 (J2 après-midi), et rattrapage de 02 à 04
- ~~Arrow function, littéral de tableau~~ (le littéral de tableau est fait au Sprint 2), `map`, `DString.to` (format JS), `whenIsRightOtherwise`.
- `left` avec information, `matchInformation` vers `switch`, **ternaire**, **correction de D2** (`&&`/`||`), ~~littéraux string~~ (faits).
- **Livrable :** **02 à 06 terminés.** **Point mi-parcours** : réajuster le plan. Si 02 à 04 ne passent pas en milieu de Sprint 3, appliquer la **variante V4** (§8).

#### Étape 0 : correctif d'intégration I2 (P1, avant tout le reste)

Le même principe que I1 : on **raccorde** ce qui est déjà mergé, sans rien concevoir de nouveau.
1. `either/index.ts` : rebrancher `whenIsRight` (D14).
2. `either/whenIsRight/index.ts` : remplacer le bouchon `coerceToResultType` par `coerceExpression(params, context)` de P4, avec `to` = `getTypeAtLocation(appel whenIsRight)` (C14).
3. `duplojs/array/coalescing.ts` : remplacer le `createFunctionValue` local par celui de `duplojs/application.ts` (P3), et importer `goTypeOf` depuis `type/`.
4. Supprimer `expression/goTypeOf.ts` (C16).
5. Corriger les 3 erreurs de lint (D18).

**Attendu [observé, copie jetable pour 1 à 3]** : aucune régression ; 02, 03 et 04 passent **du blocage `whenIsRight` au blocage D15** (`DArray.coalescing` en valeur). Ils ne passeront qu'après la tâche D15 de P3.

#### Ce que le Sprint 3 exige

| Ex. | Construction | Traduction Go visée | Qui |
|---|---|---|---|
| 02–04 | `DArray.coalescing` **en valeur** (D15) | eta-expansion instanciée (ADR-7) | **P3 (priorité 1)** |
| 05 | `whenIsRightOtherwise(coalescing, () => [-12])` (curryfiée, dans un `pipe`) | `if`/`else` inliné, résultat `[]float64` | P3 |
| 05 | `() => [-12]`, `(value) => DString.to(value)` | `func` literal (ADR-7) | P2 |
| 05 | `DArray.map(DString.to)` (curryfiée, et `to` en valeur) | boucle pré-allouée ; `to` en eta-expansion | P4 (`map`, `to`), P3 (ADR-7) |
| 06 | `DEither.left("negative-operand", one < 0 ? one : two)` | `EitherLeftOf[float64]("negative-operand", t)` ; ternaire (ADR-8) | P4 (`left`), P2 (ternaire) |
| 06 | `one < 0 \|\| two < 0` | `\|\|` natif (ADR-8, D2) | P2 |
| 06 | `matchInformation(result, { … })` | `switch` + `panic` par défaut (ADR-9) | P3 |
| 01 (rattrapage) | `01-is-left` (D16), `01-print-values` (D17, D19) | `goTypeOfExpression` ; globaux ; `-0` | P4, P2, P3 |

#### Contrat d'interface (fixé avant de coder)

```go
// ── P4 · dépendance « either » ──
func EitherLeftOf[V any](information string, value V) Either[V]   // Kind = Left
// ── P3 · defaults/inspect ── (privé ; seule la règle compte)
// le nombre affiché par Print suit util.inspect : -0 donne "-0" ; JSNumberToString reste String(n) (-0 donne "0")
```

```ts
// ── P3 · duplojs/application.ts (évolution de createFunctionValue, ADR-7) ──
// Types des paramètres d'une fonction passée en argument : signature RÉSOLUE de l'appel englobant
// (au rang de l'argument), sinon type propre s'il n'est pas générique, sinon type contextuel.
export function resolveCallbackParameterTypes(site: TsAST.Node, context: BuildContext):
	Promise<readonly Type[] | undefined>;
export function createFunctionValue(params: {
	site: TsAST.Node; context: BuildContext;
	returnGoType?: GoType;          // fourni par l'appelant qui le connaît (handler, fonction fléchée) ; sinon, signature
	body: (parameters: readonly GoAST.Identifier[], parameterTypes: readonly Type[]) =>
		Promise<TransformationSuccess<GoAST.Expression> | TransformationError | NotfoundTransformer>;
}): Promise<TransformationSuccess<GoAST.FunctionLiteral> | TransformationError | NotfoundTransformer | TransformationNotSupported>;

// ── P4 · type/goTypeOf.ts (D16) ──
// Type Go d'une EXPRESSION telle que traduite : pour un identifiant de variable, le type DÉCLARÉ
// (pas le type rétréci par un if) ; sinon goTypeOf(getTypeAtLocation(node)).
export function goTypeOfExpression(node: TsAST.Expression, context: BuildContext):
	Promise<TransformationSuccess<GoType> | TransformationError | NotfoundTransformer>;

// ── P2 · expression/arrowFunction.ts ──
// ArrowFunction → GoAST.FunctionLiteral (transformer de la liste des expressions) ; les handlers de P3
// obtiennent un callback en transformant l'argument avec expressionTransformers, puis l'appellent.
```

#### Partage des fichiers (périmètres disjoints)

| Personne | Possède | Points de contact (branchés **et testés** dans sa PR) |
|---|---|---|
| **P1** | **I2** (fichiers listés ci-dessus) ; `docs/exercises/` (02 à 04 mises à jour, 05 et 06 nouvelles) ; `variations/` ; `scripts/` ; `README.md` ; **seul habilité à merger** | aucun |
| **P2** | `transformers/expression/` (`arrowFunction.ts`, `conditional.ts`, `binary.ts` pour D2, `globals.ts` pour D17) ; `transformers/statement/` ; `docs/decisions/ADR-8-ternary-short-circuit.md` | aucun |
| **P3** | `duplojs/application.ts` (ADR-7, D15) ; `duplojs/either/whenIsRight/`, `whenIsRightOtherwise/` (nouveau), `matchInformation/` (nouveau) ; `sharedDependency/defaults/` (D19) ; `docs/decisions/ADR-7-arrow-generic-values.md`, `ADR-9-match-information.md` | ajoute 2 branches (`whenIsRightOtherwise`, `matchInformation`) dans `either/index.ts` (P4) |
| **P4** | `transformers/type/` (`goTypeOfExpression`) ; `duplojs/either/` (sauf les dossiers de P3), dont `left/` (nouveau) et la dépendance `either` ; `duplojs/array/map/` (nouveau) ; `duplojs/string/` (nouveau domaine, `to`) ; `duplojs/index.ts` (enregistrement du domaine `string`) | ajoute la branche `map` dans `duplojs/array/index.ts` (P2) ; adapte `print` (P3) à `goTypeOfExpression` pour D16 |

**Ordre de merge : I2 (P1) → P3 (D15 d'abord, dans une PR à part si possible) → P4 → P2 → P3 (reste) → P1 (fiches).** Une PR qui dépend d'un contrat pas encore sur `main` **attend** (règle renforcée). On ne merge jamais avec un bouchon.

#### Définition de « terminé » du Sprint 3
`check-all.sh` : **00 à 06 ✅** ; variantes 01 à **9/9**, variantes 02–04 à **au moins 8/10** (écarts documentés) ; variantes 05 et 06 créées (au moins 6) ; `test:types` et `test:lint` **au vert** ; ADR-7, ADR-8 et ADR-9 rédigés ; fiches 02 à 04 mises à jour, 05 et 06 rédigées ; **chaque PR contient son rapport `compare-main`**.

> **Bilan du Sprint 3 (17/11, branche `sprint3/full`)** : ✅ **cible atteinte** sur tous les critères. 00 à 06 ✅ ; variantes 01 à 9/9, 02–04 à 9/10 (`03-curried-stored` : limite documentée), 05 et 06 à 8/8 ; types et lint au vert ; ADR-7, 8 et 9 rédigés ; fiches 02 à 06 à jour ; rapport `compare-main` : 0 régression, verdict mergeable. Le travail a été fait sur une seule branche plutôt qu'en 4 PR. Il reste à ouvrir **une PR** avec ce rapport, puis à la merger. La variante V4 n'est pas nécessaire à ce stade.

### Sprint 4 · Chaînage et collections : 07, 08, 09 (J3 matin)
- `rightPipe` avec court-circuit, multi-fichiers (`divide.ts`), union qui accumule les gauches.
- Tuples vers `[N]T` ou struct, déstructuration de paramètre, tableau de tuples.
- `group` tout ou rien.
- **Livrable :** **07, 08 et 09 terminés.**

> **Bilan du Sprint 4 (17/11, PR #15)** : ✅ **cible fonctionnelle atteinte** : 07, 08 et 09 ✅, 11 variantes, ADR-10, 11 et 12 et fiches rédigés, 0 régression. ❌ **Règle de merge** : rapport absent et **lint mergé en échec** (11 erreurs) ; un seul commit au lieu de 4 PR (§0.000).

### Sprint 5 · Asynchronisme, mesures et préparation de la livraison : 10 (J2, 18/11)

> Avec 10/11 dès le soir du J1, l'équipe a **une journée d'avance** sur le §8. Le Sprint 5 occupe le J2 ; le J3 et le J4 au matin restent pour la consolidation (Sprint 6), avec une marge de sécurité avant le gel du J4 à midi.

- **Étape 0 · I3 (P1, avant tout le reste)** : remettre `test:lint` au vert sur `main` (11 erreurs, aucune modification de comportement) ; `compare-main` sans régression.
- **Livrable :** 10 ✅ (option A, ADR-5) ; au moins 5 variantes 10 (dont `10-sync-between`, limite assumée) ; prototype B mesuré ; tableau de mesures du §10 ; D8 corrigé ; README avec l'équipe ; script du ZIP ; trame de soutenance.

#### Contrat d'interface (fixé avant de coder)

```ts
// ── P4 · type/promise.ts ──
// TypeReference vers Promise (symbole déclaré dans la lib standard de TS, pas par le nom) : goTypeOf(T).
export const promiseTypeTransformer: Transformer<GoType>;

// ── P2 · expression/await.ts, declaration/function.ts, expression/arrowFunction.ts ──
// `await e` devient la traduction de `e` (before compris).
// `async function` et `async () => …` sont acceptées : même traduction qu'une fonction
// ordinaire, avec pour type de retour celui de la signature (Promise<T> donne T par P4).
export const awaitExpressionTransformer: Transformer<GoAST.Expression>;

// ── P3 · duplojs/either/rightPipe, duplojs/either/group, duplojs/common/pipe ──
// rightAsyncPipe : le handler de rightPipe (mêmes règles, ADR-10) ; asyncGroup : celui de group,
// mais un élément de type fonction (fabrique) est un callback d'arité 0 APPELÉ DANS LA BOUCLE ;
// DCommon.asyncPipe : le handler de pipe. Branchés dans les routeurs either/ et common/.
```

#### Partage des fichiers (périmètres disjoints)

| Personne | Possède | Points de contact |
|---|---|---|
| **P1** | I3 ; `README.md`, `docs/` (synthèse, soutenance), `scripts/` (ZIP), `variations/README.md` ; **seul habilité à merger** | aucun |
| **P2** | `transformers/expression/`, `transformers/statement/`, `transformers/declaration/`, `src/transpiler/context/` (D8), `src/go/printer/` (D13) | aucun |
| **P3** | `duplojs/either/rightPipe/`, `duplojs/either/group/`, `duplojs/common/` ; `variations/10-*` ; `docs/decisions/ADR-5-async.md` ; `docs/exercises/10.md` | branches `rightAsyncPipe` et `asyncGroup` dans `either/index.ts`, `asyncPipe` dans `common/index.ts` |
| **P4** | `transformers/type/` ; `research/async/` (prototype B) ; `research/measures/` et §10 (tableau de mesures) | aucun |

**Ordre de merge : I3 (P1) → P4 (Promise) → P2 (async, await, D8) → P3 (API async, variantes, ADR-5, fiche 10) → P4 (mesures) → P1 (livraison).**

> **Avancement du Sprint 5 (17/11 au soir, P1 et P4, branches locales empilées, non mergées)** : I3 ✅ (lint vert, 47 → 47) ; `Promise<T>` ✅ (le blocage de 10 passe à `rightAsyncPipe`, côté P3) ; option B mesurée (`research/async` : A 13,7 ns/op et 1 allocation, B 759,9 ns/op, 10 allocations et 3 goroutines) ; mesures de bout en bout de 01, 05 et 09 (`docs/measures.md`) ; `scripts/make-zip.sh`, `docs/synthese.md`, `docs/soutenance.md` et liens du README. **Reste** : table « Équipe » (noms à fournir), P2 et P3, mesure de 10, chiffres de B dans l'ADR-5 (quand P3 l'aura rédigé), deux répétitions chronométrées.

#### Définition de « terminé » du Sprint 5
`check-all.sh` : **00 à 10 ✅** ; variantes 10 créées (au moins 5, `10-sync-between` documentée comme limite) ; `test:types` et `test:lint` **au vert sur `main` après chaque merge** ; ADR-5 rédigé (A implémentée, B mesurée, limite de réordonnancement) ; fiche 10 ; tableau de mesures ; D8 corrigé ; README complet (équipe, avancement) ; `scripts/make-zip.sh` ; **chaque PR contient son rapport `compare-main`**.

> **Bilan du Sprint 5 (18/11)** : ❌ **10 non atteint sur `main`** (D20, D21, D22). Correctif de 10 identifié et essayé (patch de 3 lignes). Livrés : `async` et `await`, D8, API async, ADR-5, `Promise<T>`, option B mesurée, mesures de 01, 05 et 09, ZIP, synthèse, trame. ❌ Règle de merge : aucun rapport collé, 2 merges par l'auteur, lint en échec (§0.00000).

### Sprint 6 · Consolidation et livraison (J2 après-midi → J4 12:00)

- **Étape 0 · I4 (P1)** : D20, D21 et lint, avant tout le reste (§0.8).
- **Calendrier** : gel du code le J3 à 20:00 ; gel de la documentation le J4 à 10:00 ; répétition 1 le J3 au soir, répétition 2 le J4 à 10:30 ; gel final, PR et ZIP le J4 à 12:00.

| Personne | Possède | Livrable |
|---|---|---|
| **P1** | I4 ; merges ; `README.md` (table « Équipe », avancement) ; `docs/soutenance.md` (répétitions) ; PR vers le boilerplate ; ZIP | I4 mergé, 11/11 ; ZIP vérifié identique à la PR ; PR ouverte au gel |
| **P2** | `src/go/printer/` (D13) ; relecture des fiches 00 à 04 et des ADR-1, 2, 3 et 7 | D13 ; partie de `docs/relecture.md` |
| **P3** | `duplojs/either/group/`, `type/` pour `never` (D22) ; fiche 10, ADR-5 (Go produit réel, étiquettes) ; relecture des fiches 05 à 07 et des ADR-8, 9 et 10 | variantes 10 conformes (10-sync-between en échec au **diff** seulement) ; fiche 10 à jour |
| **P4** | `docs/measures.md` (mesure de 10), chiffres de l'option B dans l'ADR-5 ; `scripts/record-demo.sh`, `docs/demo/` ; `docs/synthese.md` (chiffres) ; relecture des fiches 08 et 09 et des ADR-11 et 12 | mesures complètes ; plan B enregistré ; synthèse à jour |

**Ordre de merge : I4 (P1) → P3 (D22) → P2 (D13) → P4 (mesures, plan B, synthèse) → relectures (chacun) → P1 (README, PR, ZIP).**

> **Bilan du Sprint 6 (18/11, P1)** : `main` `f0a10cf` (PR #24, D22 et mesures de 10) : **11/11**, variantes **41/43** (seuls `03-curried-stored` à la transpilation et `10-sync-between` au diff), `test:types` et `test:lint` au vert **[observé, copie jetable]**. Documentation de livraison sur `sprint6/delivery-docs` (`compare-main` : 52 → 52, 0 régression) ; ZIP de répétition sur `dd35826` vérifié par `diff -r` (vide). Ouverts : relectures de P2, P3 et P4 (branches absentes), table « Équipe », ADR-11 (réponse de l'auteur), plan B (après le gel du code), répétitions, PR vers le boilerplate et ZIP final (J4).

#### Définition de « terminé » du Sprint 6
**11/11 ✅** sur `main` ; variantes : seules `03-curried-stored` et `10-sync-between` (au diff) en échec, et documentées ; `test:types` et `test:lint` au vert ; `docs/relecture.md` complet (chaque fiche et chaque ADR relus par un non-auteur, corrections faites) ; mesures de 10 ; plan B enregistré ; deux répétitions notées sous 10:00 ; table « Équipe » remplie ; PR ouverte vers `duplojs/hackathon-11-2026` ; ZIP produit par `make-zip.sh` et vérifié par `diff -r` contre le commit de tête de la PR ; **chaque PR contient son rapport `compare-main`, collé par P1, et a été mergée par P1**.

### Variantes de découpage

| Variante | Principe | Quand l'utiliser |
|---|---|---|
| **V1 · Linéaire** (ci-dessus) | Exercice par exercice, dans l'ordre | Par défaut : progression cumulative, démo à chaque étape. |
| **V2 · Par capacités** | Sprints organisés selon les lignes du §7 (toutes les unions, puis toutes les fonctions…), les exercices tombent ensuite | Équipe à l'aise et socle stabilisé tôt. Risqué pour la démo. |
| **V3 · Couloirs parallèles** | Deux binômes : 01→05 d'un côté, et socle runtime (`print`, `Either`, tuples) + étude async de 10 de l'autre | Équipe de 4 avec un bon niveau de Go. |
| **V4 · Repli** | Si retard au point mi-parcours : viser 01–07 complets, et 08–10 en **étude écrite** (Go écrit à la main + limites) | La consigne valorise une limite argumentée. |

**Priorisation (MoSCoW) :**
- **Must** : Sprint 0, exercices 01–05, doc associée, PR et ZIP.
- **Should** : 06–09, mesures.
- **Could** : 10 complet, variations étendues.
- **Won't** : TypeScript générique hors périmètre, classes, exceptions.

---

## 9. Organisation de l'équipe

| Rôle | Responsabilités | Fichiers principaux |
|---|---|---|
| **R1 · Représentations et runtime** | ADR-1 et 2, types et coercition, `shard_dependencies` (`Either`, `print`, `to`) | `transformers/type`, `sharedDependency/` |
| **R2 · Langage** | `const`, `if`, ternaire, `&&`/`||`, arrow, tableaux, tuples, déstructuration | `transformers/statement`, `expression`, `declaration` |
| **R3 · API DuploJS** | Routeurs et handlers `either/`, `common/` (`pipe`), `array/`, `string/` | `transformers/duplojs/*` |
| **R4 · Qualité et doc** (souvent partagé avec un autre rôle si l'équipe compte 3 personnes) | Script de validation, sorties de référence, mesures, fiches, skill d'équipe, README, soutenance | `scripts/`, `docs/`, `README.md` |

**Rituels :**
- Point de 10 min en début de chaque demi-journée.
- Démo en fin de sprint.
- Une branche par exercice, revue croisée avant merge.
- Les décisions vont dans un ADR, jamais seulement à l'oral.

---

## 10. Validation, mesures et preuves

### Validation fonctionnelle (obligatoire)
```
tsx projects/XX/index.ts         > out/XX.ts.txt     # référence
pnpm build:XX                                          # transpilation
cd projects/XX/dist && go vet ./... && go run . > out/XX.go.txt
diff out/XX.ts.txt out/XX.go.txt                       # doit être vide
```
Plus des **variantes** : copier un exercice dans `projects/XX-var-*/` avec une variation (alias, ordre, branche inverse).

### Mesures (optionnelles mais valorisantes)
| Outil | Ce qu'il prouve |
|---|---|
| `go build -gcflags=-m` | **Escape analysis** : quelles valeurs vont sur le tas. Argument direct pour justifier une représentation contre `any`. |
| `go test -bench . -benchmem` | ns/op, B/op, allocs/op pour comparer les représentations (ADR-1 A, B ou C). |
| `GODEBUG=gctrace=1` | Pression sur le GC. |
| `hyperfine` | Temps de bout en bout, Node contre binaire Go. |
| `/usr/bin/time -l` | Mémoire résidente maximale. |

Chaque chiffre est noté **avec son contexte** (machine, version, commande).

**Tableau de mesures** : [`docs/measures.md`](measures.md) (script `research/measures/measure.sh`) ; prototype de l'option B de l'ADR-5 : [`research/async/`](../research/async/). On sépare **observé** et **à vérifier**, comme l'exige la consigne.

---

## 11. Documentation à produire

### Arborescence proposée
```
README.md                         # équipe, synthèse, reproduction
docs/
  decisions/ADR-1-either.md …     # décisions et alternatives
  exercises/01.md … 10.md         # une fiche par exercice
  measurements.md                 # mesures et protocole
  limits.md                       # limites transverses
.agents/skills/hackathon-strategies/SKILL.md   # règles d'équipe pour l'agent IA
```

### Modèle de fiche d'exercice
```markdown
# Exercice XX : <titre>
## Problèmes étudiés          (constructions TS/DuploJS en jeu)
## Variations considérées     (au-delà de l'exemple)
## Stratégie                  (transformers, représentation Go, coercitions)
## Justification              (alternatives écartées, performance et mémoire)
## Go produit                 (extrait commenté)
## Résultats observés         (sortie identique ? mesures ?)
## Limites                    (non géré, impossible, et pourquoi)
## Reproduire                 (commandes exactes)
```

---

## 12. Livrables et soutenance (10 min)

### Checklist de remise
- [x] Fork partagé avec l'équipe : `ahmataffadine99/hackathon-11-2026`, PR #1 à #24 de plusieurs auteurs
- [ ] README : noms, prénoms et classes de tous les membres : table « Équipe » vide, à remplir par chaque membre
- [x] Fiches 01–10 (y compris les limites et les « impossible, parce que… ») : `docs/exercises/00.md` à `10.md`, Go produit vérifié contre `main` (relecture R4, R5)
- [x] ADR et mesures : ADR-1 à 3, 5, 7 à 12, `docs/measures.md` (01, 05, 09, 10) ; contrôle des liens : 0 lien mort
- [ ] PR ouverte vers `duplojs/hackathon-11-2026` : au gel final (J4, 12:00), avec l'accord de l'équipe
- [ ] Archive ZIP **identique à la PR** remise à la soutenance : procédure répétée sur `dd35826` (`diff -r` vide, SHA-256 `c0cd8278…24f4`) ; ZIP final à produire sur la tête de la PR

### Trame de soutenance
| Temps | Contenu |
|---|---|
| 0:00–1:00 | La question, notre réponse en une phrase, avancement (x/10) |
| 1:00–3:00 | **Démarche** : AST, transformers, `before`, coercition, skill d'équipe |
| 3:00–6:00 | **Deux ou trois décisions clés** avec le Go produit : `Either` par valeur, `pipe` inliné, ternaire et court-circuit |
| 6:00–8:00 | **Résultats** : démo en direct (`diff` vide) et un chiffre mémoire ou allocations |
| 8:00–9:30 | **Limites argumentées** : async, unions hétérogènes, `any` |
| 9:30–10:00 | Conclusion : faisabilité, à quelles conditions |

---

## 13. Risques et plans de repli

> Réévalués après le Sprint 5 (18/11). ⬆ = risque en hausse, ⬇ = en baisse, ✅ = levé, = = inchangé.

| Risque | Probabilité | Évolution | Parade |
|---|---|---|---|
| **Discipline de merge** : 3 sprints sans rapport collé ; 2 merges par l'auteur (#20, #21) ; lint mergé en échec (#15, #20, #21) | **Très élevée** | ⬆ | P1 merge **seul** et colle le rapport **lui-même** avant de merger ; pas de merge pendant le gel sans rapport ; protection de branche GitHub (merge réservé à P1) si l'équipe l'accepte |
| **Exercice 10 annoncé fait mais en échec** (D20 troncature, D21 plantage qui masque l'erreur) | Élevée | ⬆ nouveau | I4 en étape 0 (patch essayé : 10 ✅) ; « terminé » se juge sur `check-all` lancé par P1, pas sur la description d'une PR |
| **Documentation désynchronisée** (fiche 10, README, synthèse, soutenance encore à 10/11 et 37/38 ; étiquettes « vérifié ») | Élevée | ⬆ nouveau | Relecture croisée (§0.8), gel de la documentation au J4 à 10:00, chiffres repris de `check-all` et de `docs/measures.md` seulement |
| **Démo le jour J** (réseau, Docker, Go indisponibles) | Moyenne | ⬆ nouveau | Plan B : `docs/demo/` enregistré (P4) ; caches chauds ; répétition 2 faite sur la machine de la soutenance |
| **ZIP différent de la PR** | Faible | = | `make-zip.sh` (refus si l'arbre est modifié) et vérification `diff -r` contre le commit de tête (P1) |
| **Retard sur le planning** | Faible | = | 10 est à un correctif de 3 lignes de 11/11 ; il reste le J2 après-midi et le J3 avant le gel du code |
| **Async (ex. 10)** | Moyenne | ⬇ | `Promise`, `await` et API livrés ; restent D20 et D22 (§0.0000) |
| **Réordonnancement async** : un effet synchrone placé entre l'appel d'un combinateur async et son `await` serait réordonné par l'option A **[observé, sonde tsx]** | Moyenne (hors exercices) | ⬆ nouveau | Limite documentée dans l'ADR-5 et montrée par `10-sync-between` ; un modèle exact (file de microtâches) est hors périmètre |
| **Livraison** : table « Équipe » toujours vide, PR non ouverte | Moyenne | = | P1 ; `make-zip.sh` prêt ; texte de PR prêt |
| **Lisibilité du Go en soutenance** : `[V any,]` (D13) | Faible | ⬇ | D8 ✅ ; D13 (P2) avant le gel du code |
| **Représentation des tuples** : `[]T` coûte 5,3 fois plus que `[N]T` **[observé, research/tuples]** | Faible (fonctionnel) | ⬆ nouveau | Assumé (ADR-11) et présenté comme piste chiffrée ; pas de changement avant le gel |
| Fonctions génériques en valeur (D15) | Faible | ✅ | ADR-7 ; reste la limite `03-curried-stored` (TS type la constante en `unknown`) |
| Types rétrécis contre types déclarés (D16) | Faible | ✅ | `goTypeOfExpression` |
| Unions hétérogènes (côtés différents) | Faible | ✅ | A' `Either2` (ADR-12) ; plusieurs types de gauche différents : union fermée non implémentée (limite) |
| Closures et performance | Faible | ✅ | Inlinage et absence d'échappement observés (ADR-7, 03, 05, 06) |
| Environnement Windows | Faible | ⬇ | Docker ; benchmark des tuples exécuté sous Windows 11 **[observé]** |
