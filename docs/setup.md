# Installation et boucle de validation

Ce guide permet à un membre de l'équipe de tout installer seul, puis de vérifier n'importe quel exercice en une commande.

## 0. Quelle méthode choisir ?

| Poste | Méthode recommandée | Commande pour tout vérifier |
|---|---|---|
| **Windows** (PowerShell) | **Docker** (§7), car Smart App Control bloque `go.exe` et PowerShell n'exécute pas les `.sh` | `.\scripts\docker-check.ps1` |
| Windows avec Git Bash ou WSL2 | Docker (§7) | `./scripts/docker-check.sh` |
| macOS / Linux | Installation native (§1 à §4) **ou** Docker (§7) | `./scripts/check-all.sh` ou `./scripts/docker-check.sh` |

L'installation native a été testée sur macOS 15.6.1 (Apple Silicon) avec Node 22.19.0 (via nvm), pnpm 12.18.0 et Go 1.27.4. La méthode Docker a été testée sur le même poste avec Docker 28.3.2 : Node 22.23.5, pnpm 12.18.0 et Go 1.27.4 linux/arm64 dans le conteneur. Elle donne les mêmes résultats que l'installation native.

---

## 1. Prérequis

| Outil | Version | Pourquoi |
|---|---|---|
| Node.js | ≥ 22 | Exécute le transpileur (tsx) et la référence TypeScript |
| pnpm | **12.18.0** exactement | Imposé par `packageManager` / `devEngines` dans `package.json` |
| Go | ≥ 1.24 (testé avec 1.27.4) | Compile le code produit ; le `go.mod` généré déclare `go 1.27.4`, et les alias de types génériques demandent ≥ 1.24 |

## 2. Installer pnpm 12.18.0 (procédure fiable)

### Le problème
Si une autre version de pnpm est installée (par exemple la 11.x), elle essaie de basculer automatiquement vers la 12.18.0 (`devEngines.onFail: "download"`), puis échoue :

```
ERROR  Failed to switch pnpm to v12.18.0. Looks like pnpm CLI is missing at
"~/Library/pnpm/.tools/pnpm/12.18.0/bin" or is incorrect
spawnSync ~/Library/pnpm/.tools/pnpm/12.18.0/bin/pnpm ENOEXEC
```

**Cause :** pnpm 12 est distribué sous forme de binaire natif, installé par un script `postinstall`. Le mécanisme de bascule de pnpm 11 télécharge le paquet sans exécuter ce script. Le fichier `bin/pnpm` reste donc un simple script shell sans shebang, que `spawnSync` ne peut pas exécuter (`ENOEXEC`).

### La solution
Installer pnpm 12.18.0 avec npm, qui exécute bien le `postinstall`, puis supprimer la copie cassée :

```bash
npm install -g pnpm@12.18.0
hash -r                                   # oublier l'ancien chemin de pnpm (zsh/bash)
rm -rf ~/Library/pnpm/.tools/pnpm/12.18.0*  # supprimer la copie cassée, si elle existe
pnpm -v                                   # doit afficher 12.18.0
```

> Avec nvm, pnpm est installé pour la version de Node active. Si vous changez de version de Node, relancez la commande.

## 3. Installer Go

```bash
brew install go
go version   # go version go1.27.4 darwin/arm64 (ou ≥ 1.24)
```

Sans Homebrew, utilisez l'installeur officiel sur https://go.dev/dl/.

## 4. Installer le projet

```bash
git clone <url-du-fork>
cd hackathon-11-2026
pnpm install
```

pnpm peut afficher `Agent skills awaiting approval: @duplojs/agents-kit. Run "pnpm approve"` : ce message n'empêche ni la transpilation ni les vérifications.

## 5. Vérifier un exercice ou une variante

```bash
./scripts/check.sh 01                       # ou : pnpm check 01
./scripts/check.sh variations/01-alias      # une variante (tout dossier avec index.ts + tsconfig.json)
./scripts/check-all.sh                      # ou : pnpm check:all   (00 à 10, tableau récapitulatif)
./scripts/check-all.sh 01 02                # seulement certains exercices
./scripts/check-all.sh --variations 01      # toutes les variantes variations/01-*
./scripts/check-all.sh --variations         # toutes les variantes
```

Les variantes sont décrites dans [variations/README.md](../variations/README.md). Leurs fichiers `out/` portent le nom du dossier (`out/01-alias.*`).

`check.sh <XX>` enchaîne cinq étapes et **va jusqu'au bout même si l'une échoue**, pour indiquer précisément où ça casse :

| Étape | Commande | Fichiers produits |
|---|---|---|
| 1. Référence TS | `pnpm exec tsx --tsconfig projects/XX/tsconfig.json projects/XX/index.ts` | `out/XX.ts.txt`, `out/XX.ts.err` |
| 2. Transpilation | `pnpm run build --tsconfig … --input … --output projects/XX/dist` (équivalent de `pnpm build:XX`) | `out/XX.build.log`, `out/XX.build.summary` |
| 3. go vet | `go vet ./...` dans `projects/XX/dist` (compile aussi le code) | `out/XX.vet.log` |
| 4. go run | `go run .` dans `projects/XX/dist` | `out/XX.go.txt`, `out/XX.go.err` |
| 5. Comparaison | `diff -u out/XX.ts.txt out/XX.go.txt` | `out/XX.diff` |

Verdict affiché :
- ✅ **IDENTIQUE** : la sortie Go est égale caractère pour caractère à la sortie TypeScript (code de sortie 0).
- ❌ **DIFFÉRENT** : les deux programmes s'exécutent mais leurs sorties diffèrent (voir `out/XX.diff`).
- 💥 **ÉCHEC** : une étape a échoué, et le verdict nomme la première (référence TS, transpilation, go vet, go run).

En cas d'échec de transpilation, le script extrait de l'erreur du CLI l'information (`notfound-transformer`, `transformation-error`…), le type de nœud TypeScript, son parent et son texte. C'est plus lisible que la stack trace complète, qui reste disponible dans `out/XX.build.log`.

Variables d'environnement :
- `CHECK_TIMEOUT=60` change le délai maximum d'exécution (30 s par défaut) ;
- `CHECK_QUIET=1` n'affiche que le verdict.

`out/`, `projects/*/dist` et `variations/*/dist` sont ignorés par git.

## 6. État initial

Résultat de `./scripts/check-all.sh` au 17/11/2026, sur `main` (commit `9e2995c`) avec les scripts de cette branche, **avant toute modification du transpileur** :

| Exercice | TS | Transpile | go vet | go run | diff | Cause du premier échec |
|---|---|---|---|---|---|---|
| 00 | ✅ | ✅ | ❌ | ❌ | – | add.ts.go:6:17: cannot use generic function shard_dependencies.EitherSuccessOf without instantiation |
| 01 | ✅ | ❌ | – | – | – | notfound-transformer : `FirstStatement` `const result = add(1, 2);` |
| 02 | ✅ | ❌ | – | – | – | notfound-transformer : `FirstStatement` `const result = add(1, 2);` |
| 03 | ✅ | ❌ | – | – | – | notfound-transformer : `FirstStatement` `const result = add(1, 2);` |
| 04 | ✅ | ❌ | – | – | – | notfound-transformer : `FirstStatement` `const result = add(-1, 2);` |
| 05 | ✅ | ❌ | – | – | – | notfound-transformer : `FirstStatement` `const result = add(1, 2);` |
| 06 | ✅ | ❌ | – | – | – | notfound-transformer : `FirstStatement` `const result = add(-1, 2);` |
| 07 | ✅ | ❌ | – | – | – | notfound-transformer : `FirstStatement` `const result = DEither.rightPipe( …` |
| 08 | ✅ | ❌ | – | – | – | notfound-transformer : `FirstStatement` `const inputs: [number, number, number][] = [ …` |
| 09 | ✅ | ❌ | – | – | – | notfound-transformer : `FirstStatement` `const inputs: [number, number, number][] = [ …` |
| 10 | ✅ | ❌ | – | – | – | notfound-transformer : `TypeReference` `DisplayError` |

**0/11 exercices avec une sortie Go identique à TypeScript.**

### Observations
- **00 :** la transpilation réussit, mais le Go ne compile pas. `EitherSuccessOf` est générique, et `shared/call.ts` le range dans une variable (`Generated_N := shard_dependencies.EitherSuccessOf`) sans l'instancier (`[float64]`). C'est le défaut D1 de `PLAN_HACKATHON.md`. La référence TS du 00 n'affiche rien : la sortie attendue est vide.
- **01 à 09 :** le premier blocage est toujours `const …` (`FirstStatement` = `VariableStatement`), qui n'a pas encore de transformer.
- **10 :** le blocage arrive plus tôt, sur un `TypeReference` **synthétique** (le texte `DisplayError` signifie que `getText()` a échoué). C'est probablement le type de retour `Promise<…>` de `async function calculate`, reconstruit par `typeToTypeNode` puisqu'il n'est pas annoté.
- **Format de `DCommon.print` :** les références TS montrent le format de `util.inspect` de Node (clés entre apostrophes, indentation de 2 espaces, `[ '3', '3', 'échec' ]`). C'est ce format que le Go devra reproduire à l'identique.
- **Le Go produit dépend de la machine :** les noms de packages encodaient alors le chemin **absolu** du fichier source, répertoire personnel compris. Deux membres de l'équipe n'obtenaient donc pas le même Go. Corrigé depuis (D8) : les packages portent le chemin relatif au projet (`Sourced_add.Sourced_add`).

## 7. Valider avec Docker (Windows, et tout autre poste)

Le seul prérequis est **Docker Desktop** (ou le démon Docker sous Linux). Ni Node, ni pnpm, ni Go ne sont nécessaires sur l'hôte : tout s'exécute sous Linux dans le conteneur. C'est ce qui contourne les trois blocages Windows :

| Blocage sous Windows | Pourquoi Docker le contourne |
|---|---|
| PowerShell n'exécute pas les scripts `.sh` | Les scripts tournent sous bash, dans le conteneur. Le lanceur Windows est un script PowerShell. |
| Smart App Control bloque `go.exe` et les binaires de test non signés | Go s'exécute dans le conteneur Linux, et seul Docker Desktop (signé) tourne sur l'hôte. Les mesures de l'ADR-1 ont été faites ainsi. |
| oxlint exige Node ≥ 22.18 | Le conteneur embarque Node 22.23.5. |

### Première utilisation

1. Installer Docker Desktop et le lancer.
2. **Windows uniquement : récupérer les scripts avec des fins de ligne LF.** Le dépôt contient un `.gitattributes` qui force `eol=lf` pour les `.sh`. Sur un clone **antérieur** à ce fichier, il faut réextraire les scripts une fois :
   ```powershell
   git pull
   Remove-Item scripts\*.sh, scripts\docker\*.sh, .commands\*.sh
   git checkout -- scripts .commands
   ```
   Sans cette étape, bash échoue dans le conteneur avec `bash\r: No such file or directory`.
3. Lancer la validation. Le premier lancement construit l'image (`hackathon-duplojs-go:1`, environ 1 min), puis installe les dépendances dans un volume Docker :
   ```powershell
   # Windows (PowerShell)
   .\scripts\docker-check.ps1
   ```
   ```bash
   # macOS, Linux, WSL2, Git Bash
   ./scripts/docker-check.sh
   ```
   Si PowerShell refuse le script : `powershell -ExecutionPolicy Bypass -File .\scripts\docker-check.ps1`.

### Commandes

Les deux lanceurs acceptent exactement les mêmes arguments :

| Commande | Effet |
|---|---|
| `docker-check` | `check-all` des exercices 00 à 10 |
| `docker-check 01 variations/01-alias` | `check-all` sur des cibles choisies |
| `docker-check --variations 01` | toutes les variantes `01-*` |
| `docker-check --check 01` | `check.sh` détaillé (étapes et extraits d'erreur) |
| `docker-check --run pnpm test:lint` | n'importe quelle commande (ici le lint, qui exige Node ≥ 22.18) |
| `docker-check --run pnpm test:types` | vérification des types |
| `docker-check --shell` | shell interactif dans le conteneur |

`DOCKER_REBUILD=1` (bash) ou `$env:DOCKER_REBUILD = "1"` (PowerShell) force la reconstruction de l'image, par exemple après une modification de `scripts/docker/Dockerfile`.

### Fonctionnement

- Le dépôt est monté dans `/work`, donc `out/` et les `dist/` produits sont visibles sur l'hôte.
- `node_modules` est un **volume Docker séparé** (`hackathon-node-modules`). Les binaires natifs de l'hôte (tsgo, esbuild, oxlint pour macOS ou Windows) ne sont jamais utilisés sous Linux, et le `node_modules` de l'hôte n'est pas modifié. `pnpm install --frozen-lockfile` est relancé à chaque exécution : c'est quasi instantané, grâce au volume `hackathon-pnpm-store`.
- Les caches Go sont conservés dans les volumes `hackathon-go-cache` et `hackathon-go-mod`.
- Sous Linux ou WSL, les fichiers produits sont rendus à l'utilisateur de l'hôte (`HOST_UID` / `HOST_GID`).
- Pour repartir de zéro : `docker volume rm hackathon-node-modules hackathon-pnpm-store hackathon-go-cache hackathon-go-mod`.

### Limites

- **[observé]** Testé sur macOS (Apple Silicon) avec Docker Desktop 28.3.2 : `check-all` (00 ✅ identique), `--check`, `test:types` et `test:lint` au vert.
- **[à vérifier]** Le lanceur PowerShell n'a **pas** encore été exécuté sur un poste Windows. Un membre sous Windows doit lancer `.\scripts\docker-check.ps1 00` et confirmer `✅ IDENTIQUE [00]`.
- Les temps d'exécution dans Docker ne sont pas représentatifs pour des mesures de performance de l'hôte (VM).

## 8. Contrôler une PR avant de la merger (règle de merge)

La règle de merge (PLAN §0.2) interdit de merger une PR qui **régresse**, qui contient du **code provisoire** (bouchon, `TEMPORAIRE`, « pas encore branché ») ou dont un **point de contact** entre deux personnes n'est pas branché. `scripts/compare-main.sh` l'outille :

```bash
./scripts/compare-main.sh sprint2/hotfix-i1          # une branche (locale ou origin/…) contre origin/main
./scripts/compare-main.sh --patch correctif.patch    # un patch appliqué sur main, avant même la PR
COMPARE_BASE=<ref> ./scripts/compare-main.sh <ref2>  # une autre base de comparaison
```

- Les deux côtés sont extraits dans des **copies jetables** (`git worktree` dans un dossier temporaire) : le dossier de travail n'est pas modifié.
- Les deux côtés utilisent les **mêmes** `scripts/` et `variations/`, ceux du dossier de travail. Les variantes qui ne sont pas encore sur `main` sont donc testées des deux côtés.
- Pour chaque côté, le script lance `check-all.sh` (00 à 10) puis `check-all.sh --variations`, compare cible par cible (🔴 régression, 🟢 corrigé) et cherche des **marqueurs provisoires** dans les lignes ajoutées sous `src/`.
- Le rapport Markdown (`out/compare-<nom>.md`) est affiché, **à coller en commentaire de la PR**. Le code de sortie vaut 1 s'il y a une régression ou un marqueur.
- Deux points restent à vérifier à la main (cases à cocher dans le rapport) : le branchement des points de contact, et `test:types` / `test:lint`.
- Durée : environ 30 s sur macOS (Apple Silicon).

**[observé]** Rejoué sur la PR #8 du Sprint 1 (`COMPARE_BASE=0818959 ./scripts/compare-main.sh 4624394`), l'outil la **bloque** : il détecte le commentaire « Pas encore branché » du handler `isRight`. Appliqué au correctif I1 (`--patch`), il donne **1 → 6 cibles identiques, 0 régression**.

## 8 bis. Produire l'archive ZIP de remise

L'archive remise à la soutenance doit être **identique à la PR** vers `duplojs/hackathon-11-2026` (PLAN §12). On la produit depuis la branche de la PR, après le dernier commit :

```bash
./scripts/make-zip.sh          # archive du commit HEAD
./scripts/make-zip.sh <ref>    # archive d'un autre commit (tête de la PR)
```

- L'archive est créée par `git archive` : elle contient **uniquement les fichiers versionnés** du commit, donc ni `dist/`, ni `out/`, ni `node_modules/`. Le script le vérifie après coup.
- Le script **refuse** de s'exécuter si des fichiers suivis ont des modifications non commitées.
- Il affiche le hash du commit et l'empreinte SHA-256 de l'archive (`out/hackathon-11-2026-<hash>.zip`). Le hash doit être celui de la tête de la PR au moment de la remise.

**[observé]** Sur `11a8429` : 492 fichiers, aucun artefact de build. Le refus a été testé sur un arbre modifié (code de sortie 1).

## 9. État au 17/11 après le Sprint 1

`main` `4624394` (✅ = sortie identique à TypeScript) **[observé]** :

| Cible | `main` | `main` + I1 |
|---|---|---|
| 00 | ✅ | ✅ |
| 01 | 💥 `isRight` non branché (D10) | ✅ |
| 02, 03 | 💥 `isRight` non branché | 💥 `whenIsRight` / `pipe` (Sprint 2) |
| 04 | 💥 `-1` | 💥 `-1` (Sprint 2) |
| 05 à 10 | 💥 | 💥 |
| Variantes 01 (9) | 0/9 | 4/9 (les 5 autres : types chaîne, D12) |
| Variantes 02 à 04 (10) | 0/10 | 1/10 (`04-nested-if`) |

Le détail par cible se trouve dans les fiches [01](exercises/01.md), [02](exercises/02.md), [03](exercises/03.md) et [04](exercises/04.md).

