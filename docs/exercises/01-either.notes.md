# Notes P4 : types et unions Either (exercice 01)

> À intégrer par la Personne 1 dans `docs/exercises/01.md`, puis à supprimer.
> Légende : **[observé]** = exécuté ; **[à vérifier]** = pas encore exécuté.

## Stratégie

- **Représentation** : la représentation A de l'ADR-1 remplace `EitherSuccess[T]`, dont les champs `JSNull` ne pouvaient représenter ni `left` ni `fail`.
  `Success<T>`, `Fail`, `Left<I, T>`, `Right<I, T>` et leurs unions deviennent **un seul type Go**, `shard_dependencies.Either[V]`.
- **Type d'une union** (`duplojs/either/index.ts` puis `either/types/`) : le routeur de types accepte un membre seul ou un `UnionTypeNode` dont **tous** les membres se résolvent, par symbole, vers `@duplojs/lang` `dist/either/`. Le handler regroupe les types de valeur (`Success<V>` : 1er argument ; `Left`/`Right<I, V>` : 2e ; `Fail` : aucun) et les compare **par rendu Go** :
  - un seul type donne `Either[V]` ;
  - seulement `Fail` donne `Either[JSUndefined]` ;
  - plusieurs types (union hétérogène, A') donnent `context.notSupport()`, prévu pour l'exercice 09.
- **Constructeurs** : `success(x)` devient `EitherSuccessOf[V](x)` et `fail()` devient `EitherFailOf[V]()`, tous deux **instanciés explicitement** (correctif D1 conservé). V vient du **type attendu**, pas de l'argument. On essaie dans l'ordre le type contextuel, puis le type de retour de la fonction englobante (même inféré), puis le type propre de l'appel. Sans ça, `fail()`, qui n'a pas d'argument, ne pourrait pas devenir `EitherFailOf[float64]()` dans une fonction `Success<number> | Fail`.
- **Ajouts dans `type/`** : `( A | B )` (type entre parenthèses, présent dans `projects/01/add.ts`) et les types littéraux numériques (`Success<3>` inféré pour `success(3)`) traduits en `float64`.

### Écart avec le prompt (C9) [observé]

Le prompt demandait de s'appuyer sur `getTypeFromTypeNode`. Sur les nœuds **synthétiques** produits par `typeToTypeNode` (types inférés), cet appel **lève une erreur** : `api: client error: invalid node handle "1.194.DEither"` (testé sur les retours inférés de 01, 04, 06 et 09). L'analyse se fait donc membre par membre via `context.resolveReferenceModule`, qui gère déjà les nœuds synthétiques (`pos < 0`). C'est le même code pour le chemin annoté et le chemin inféré, et les deux sont testés.

## Go produit [observé]

`projects/01/add.ts` :

```go
func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either[float64]) {
	Generated_19 := Sourced_one
	Generated_20 := Sourced_two
	Generated_21 := Generated_19 + Generated_20
	return shard_dependencies.EitherSuccessOf[float64](Generated_21)
}
```

Dépendance partagée (extrait) :

```go
type EitherKind uint8
const EitherKindRight EitherKind = 0   // + Left = 1, Success = 2, Fail = 3
type Either[V any,] struct { Kind EitherKind; Information string; Value V }
func EitherSuccessOf[V any,](value V) (Either[V])
func EitherFailOf[V any,]() (Either[V])
func (e Either[V]) IsRight() (bool)   // Right || Success
func (e Either[V]) IsLeft() (bool)    // Left || Fail
func (e Either[V]) InspectEntries() ([]InspectEntry)
```

## Variations couvertes [observé]

Elles sont transpilées puis compilées avec `go vet` (Go 1.27.4 dans Docker). Sources temporaires, à transmettre pour `variations/` :

| Variation | Go produit |
|---|---|
| `Success<number> \| Fail` annoté (`projects/01/add.ts`, entre parenthèses) | `Either[float64]` |
| Union dans l'autre ordre `Fail \| Success<number>` | `Either[float64]` |
| Alias d'import `import { success as ok, type Success as Ok, type Fail as Ko }` | `Either[float64]`, `EitherSuccessOf[float64]` |
| Retour **inféré** `return DEither.success(one + two)` (nœud synthétique) | `Either[float64]` |
| `return DEither.fail()` dans une fonction annotée `Success<number> \| Fail` | `EitherFailOf[float64]()` |
| `Fail` seul (annoté et inféré) | `Either[JSUndefined]` |
| `Success<number>` seul (projet 00) | `Either[float64]`, **00 reste ✅ IDENTIQUE** |
| `Left<"negative-operand", number> \| Success<number>` | `Either[float64]` |
| `success(3)` inféré `Success<3>` | `Either[float64]` |

Comportement Go [observé] (test Go temporaire) : `IsRight`/`IsLeft` et `InspectEntries` (clés, ordre, `JSNull{}`, `JSUndefined{}` pour la valeur de `fail`) sont conformes aux 4 formes de `docs/duplojs-semantics.md` (success, fail, left, right).

## Limites

- **Union hétérogène** (côtés de types différents, ex. `group` de l'exercice 09) : `notSupport`, la représentation A' est prévue à l'exercice 09.
- **Alias de type local** (`type R = Success<number> | Fail`) : non pris en charge, la référence se résout vers l'alias et pas vers DuploJS. **[à vérifier]** : on pourrait l'étendre via le checker pour les nœuds réels.
- **`Left<"x">` sans valeur** (`Left<"x", undefined>`) : aucun transformer pour `undefined`, à traiter avec l'exercice 06 si besoin.
- **`success` / `fail` passés comme valeur** (non appelés) : relève de l'ADR-3. `fail` renvoie `notSupport` ; `success` garde l'ancien comportement non instancié.
- **Exercice 04** (`if` + `fail()` dans une fonction à retour inféré) : **[à vérifier]** après le merge de la Personne 2. La règle « type de retour de la fonction englobante » doit le couvrir.
- **`InspectEntry` est déclaré TEMPORAIREMENT** dans la dépendance either. Il faudra le supprimer au rebase sur la PR de la Personne 3, sinon on aura une double déclaration Go.

## Reproduire

```bash
pnpm run build:00 && ./scripts/check.sh 00        # reste ✅
pnpm run build:01                                 # add.ts : Either[float64] (index.ts attend const/if de P2)
```

Sous Windows : transpilation avec `corepack pnpm`, puis `go vet` dans `golang:1.27.4-bookworm`, puisque Smart App Control bloque `go.exe`.
