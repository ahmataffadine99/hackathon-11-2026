# Installation et boucle de validation

Ce guide permet à un membre de l'équipe de tout installer seul, puis de vérifier n'importe quel exercice en une commande.

Il a été testé sur macOS 15.6.1 (Apple Silicon) avec Node 22.19.0 (via nvm), pnpm 12.18.0 et Go 1.27.4.

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

## 5. Vérifier un exercice

```bash
./scripts/check.sh 01        # ou : pnpm check 01
./scripts/check-all.sh       # ou : pnpm check:all   (00 à 10, tableau récapitulatif)
./scripts/check-all.sh 01 02 # seulement certains exercices
```

`check.sh <XX>` enchaîne cinq étapes et **va jusqu'au bout même si l'une échoue**, pour indiquer précisément où ça casse :

| Étape | Commande | Fichiers produits |
|---|---|---|
| 1. Référence TS | `pnpm exec tsx --tsconfig projects/XX/tsconfig.json projects/XX/index.ts` | `out/XX.ts.txt`, `out/XX.ts.err` |
| 2. Transpilation | `pnpm run build:XX` (écrit dans `projects/XX/dist`) | `out/XX.build.log`, `out/XX.build.summary` |
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

`out/` et `projects/*/dist` sont ignorés par git.

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
- **Le Go produit dépend de la machine :** les noms de packages encodent le chemin **absolu** du fichier source (`Sourced_001busers001belwardi001bdesktop…`). Deux membres de l'équipe n'obtiendront donc pas le même Go. À corriger pour pouvoir comparer les sorties entre machines.
