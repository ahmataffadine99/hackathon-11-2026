# Sémantique DuploJS — fiche de référence vérifiée par exécution

Version analysée : `@duplojs/lang@0.1.0-beta.11` (celle fixée dans `package.json` à la racine du dépôt).
Tous les extraits de sortie ci-dessous sont des copies brutes de ce qu'affiche `node` via `tsx`, sans retouche.
Node exécuté : `./node_modules/.bin/tsx sandbox/<fichier>.ts` depuis la racine du dépôt.

> Le plan de l'équipe est versionné dans [`PLAN_HACKATHON.md`](PLAN_HACKATHON.md) depuis le Sprint 6 ; lors de la rédaction de cette fiche (Sprint 0), il ne l'était pas et son contenu a été fourni en cours de mission. Il est pris en compte ci-dessous (voir « Correspondance avec PLAN_HACKATHON.md » en fin de document). Cette fiche s'appuie par ailleurs sur `AGENTS.md`, les routeurs `API.llms.md` / `concepts.llms.md` de `@duplojs/agents-kit`, le code source de `@duplojs/lang` dans `node_modules/`, et les fichiers de `projects/01` à `projects/10`.

## Résumé exécutif (pour qui ne lit que ça)

| # | Question | Réponse vérifiée |
|---|---|---|
| Q1 | `asyncGroup` parallèle ou séquentiel ? | **Séquentiel**, strictement (chaque fabrique démarre après la résolution complète de la précédente). Ni `Promise.all`, ni concurrence partielle. |
| Q2 | Format exact de `DCommon.print` | `console.info` par défaut (ou `console[params]`/`console.table`/`console.dir` selon l'option) ; **renvoie l'entrée inchangée**. Les objets `Either` s'affichent avec `util.inspect` de Node, clés complètes incluses (ex. `'@duplojs/lang/kind/@DuplojsLangEither/right': null`). |
| Q3 | `group` s'arrête-t-il au premier échec ? | **Oui**, au premier `Left` rencontré dans l'ordre de déclaration ; il renvoie ce premier `Left` tel quel (aucun agrégat des erreurs) ; les fabriques situées après ne sont jamais invoquées ; accepte **tableau et objet**. |
| Q4 | Format de `DString.to` pour les nombres | Coercition JS **native** `${value}` : notation exponentielle à partir de `1e21` et sous `1e-7`, `-0` → `"0"`, `NaN` → `"NaN"`, `Infinity`/`-Infinity` conservés tels quels. |
| Q5 | `rightPipe` avec une étape qui renvoie une valeur non-`Either` | Accepté : la valeur est traitée comme une valeur « nue », transmise telle quelle à l'étape suivante ; si c'est la **dernière** étape, elle est automatiquement enveloppée dans un `Success`. |

---

## Q1 — `asyncGroup` : parallèle (`Promise.all`) ou séquentiel ?

**Statut : ✅ vérifié en exécution (`sandbox/q1-asyncGroup-order.ts`)**

### Preuve par horodatage

Script : trois fabriques asynchrones (300 ms, 100 ms, 200 ms) tracées avec `Date.now()` à leur démarrage et à leur fin, comparées à un vrai `Promise.all` sur les mêmes durées.

Sortie brute :

```
--- array form ---
A(300ms) start @ t+1ms
A(300ms) end @ t+302ms
B(100ms) start @ t+303ms
B(100ms) end @ t+404ms
C(200ms) start @ t+404ms
C(200ms) end @ t+605ms

--- object form ---
a(300ms) start @ t+606ms
a(300ms) end @ t+907ms
b(100ms) start @ t+907ms
b(100ms) end @ t+1007ms
c(200ms) start @ t+1008ms
c(200ms) end @ t+1209ms

--- for comparison: Promise.all ---
A(300ms) start @ t+0ms
B(100ms) start @ t+0ms
C(200ms) start @ t+0ms
B(100ms) end @ t+101ms
C(200ms) end @ t+200ms
A(300ms) end @ t+300ms
```

`B` ne démarre qu'à `t+303ms`, soit juste après la fin de `A` (`t+302ms`) : la deuxième fabrique n'est appelée qu'une fois la première totalement résolue. Le total (`~605ms` pour 300+100+200ms) est la **somme** des durées, pas le `max` comme le donnerait `Promise.all` (qui termine à `t+300ms` dans le bloc de comparaison). Comportement identique pour la forme objet.

### Confirmation par le code source

`node_modules/@duplojs/lang/dist/either/right/asyncGroup.mjs` :

```js
function asyncGroup(group) {
	if (group instanceof Array) return asyncPipe(group, asyncReduce(reduceFrom([]), ({ item, lastValue, nextPush, exit }) => asyncPipe(item, when(isType("function"), (getter) => getter()), when(isLeft, exit), whenIsRight((data) => nextPush(lastValue, data)))), whenNot(isLeft, success));
	return asyncPipe(group, entries, asyncReduce(reduceFrom({}), ({ item: [key, value], lastValue, nextWithObject, exit }) => asyncPipe(value, when(isType("function"), (getter) => getter()), when(isLeft, exit), whenIsRight((data) => nextWithObject(lastValue, { [key]: data })))), whenNot(isLeft, success));
}
```

`asyncGroup` délègue à `DCommon.asyncPipe` + un `asyncReduce` (`node_modules/@duplojs/lang/dist/generator/asyncReduce.mjs`), c'est-à-dire une réduction **séquentielle avec `await`** élément par élément — jamais un `Promise.all`. La documentation elle-même l'annonce correctement (`API/10-lang/10-either/10-asyncGroup.ts` : *« Regrouper **séquentiellement** des résultats synchrones ou asynchrones dans un Success »*) : ici doc et exécution concordent, contrairement à une intuition naïve du nom « group » qui pourrait suggérer du parallélisme.

### Arrêt au premier échec (complément, voir aussi Q3)

**✅ vérifié (`sandbox/async-group-and-pipe.ts`)** : avec des fabriques (`() => ...`), celle placée après un `Left` n'est jamais appelée (`afterErrorCalled: false`), que ce soit en forme tableau ou objet.

---

## Q2 — Format exact de `DCommon.print`

**Statut : ✅ vérifié en exécution (`sandbox/q2-print-format.ts`)**

### Code source

`node_modules/@duplojs/lang/dist/common/print.mjs` :

```js
function print(input, params = "info") {
	if (typeof params === "string") console[params](input);
	else if ("columns" in params) console.table(input, params.columns);
	else console.dir(input, { depth: params.depth });
	return input;
}
```

Signature (`print.d.ts`) :

```ts
type PrintParams = "info" | "warn" | "error" | { columns: string[]; depth?: never } | { depth: number | null; columns?: never };
function print<const GenericInput>(input: GenericInput, params?: PrintParams): GenericInput;
```

- Pas de forme curryfiée : toujours `print(valeur, params?)`.
- `params` par défaut `"info"` → `console.info(input)`.
- `print` **renvoie sa propre entrée inchangée** (comportement « tap » : utile en milieu de pipe).

### Sorties brutes caractère par caractère

```
=== number ===
42
=== string ===
hello
=== array ===
[ 1, 2, 3 ]
=== Either success ===
{
  '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 3,
  '@duplojs/lang/kind/@DuplojsLangEither/success': null
}
=== Either fail ===
{
  '@duplojs/lang/kind/@DuplojsLangEither/left': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'fail',
  '@duplojs/lang/kind/@DuplojsLangEither/value': undefined,
  '@duplojs/lang/kind/@DuplojsLangEither/fail': null
}
=== Left avec information ===
{
  '@duplojs/lang/kind/@DuplojsLangEither/left': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'negative-operand',
  '@duplojs/lang/kind/@DuplojsLangEither/value': -1
}
=== return value (print renvoie son entrée) ===
echo-me
returned === "echo-me"
```

Points importants pour une reproduction fidèle :
- Un nombre ou une chaîne s'affichent **nus**, sans guillemets pour la chaîne quand elle est passée seule à `console.info` (Node n'ajoute de guillemets qu'à l'intérieur d'une structure affichée par `util.inspect`, pas pour une chaîne top-level).
- Un tableau utilise le format `util.inspect` de Node : `[ 1, 2, 3 ]` (espaces après `[` et avant `]`, virgule+espace entre éléments).
- Un objet (dont un `Either`) utilise le format multi-ligne de `util.inspect` avec indentation de 2 espaces, une propriété par ligne, clés entre guillemets simples parce qu'elles contiennent des caractères (`@`, `/`) non valides comme identifiant JS nu, `undefined` affiché littéralement sans guillemets.
- **Aucune clé « cachée »** : toutes les clés de l'objet `Either` (y compris les clés de « tag » comme `.../success` ou `.../fail`, valant toujours `null`) sont énumérables et donc visibles par `console.info`/`util.inspect`.

---

## Q3 — `group` : arrêt au premier échec, quel échec, tableau ou objet ?

**Statut : ✅ vérifié en exécution (`sandbox/q3-group-behavior.ts`)**

### Code source

`node_modules/@duplojs/lang/dist/either/right/group.mjs` :

```js
function group(group) {
	if (group instanceof Array) return pipe(group, reduce(reduceFrom([]), ({ element, lastValue, nextPush, exit }) => pipe(element, when(isType("function"), (getter) => getter()), whenIsRightOtherwise((data) => nextPush(lastValue, data), exit))), whenNot(isLeft, success));
	return pipe(group, entries, reduce(reduceFrom({}), ({ element: [key, value], lastValue, nextWithObject, exit }) => pipe(value, when(isType("function"), (getter) => getter()), whenIsRightOtherwise((data) => nextWithObject(lastValue, { [key]: data }), exit))), whenNot(isLeft, success));
}
```

`group` teste `group instanceof Array` : il **accepte explicitement les deux formes**, tableau ou objet (clé → `Either` ou fabrique `() => Either`), jamais les deux à la fois pour un seul appel.

C'est un `reduce` (synchrone, via `DArray`/générateurs internes) avec une sortie « `exit` » : dès qu'un élément est un `Left`, `exit` interrompt la réduction et devient la valeur finale.

### Preuves d'exécution

1. **Tous succès (tableau)** → `Success` contenant le tableau déballé des valeurs, dans l'ordre :
   ```
   {
     '@duplojs/lang/kind/@DuplojsLangEither/right': null,
     '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
     '@duplojs/lang/kind/@DuplojsLangEither/value': [ 'Alice', 2 ],
     '@duplojs/lang/kind/@DuplojsLangEither/success': null
   }
   ```

2. **Avec fabriques (`() => Either`), un `Left` au milieu** → la fabrique placée *après* le `Left` n'est **jamais appelée** (`afterErrorGetterCalled: false`) :
   ```
   {
     '@duplojs/lang/kind/@DuplojsLangEither/left': null,
     '@duplojs/lang/kind/@DuplojsLangEither/information': 'user-not-found',
     '@duplojs/lang/kind/@DuplojsLangEither/value': 'id-1'
   }
   afterErrorGetterCalled: false
   ```
   ⚠️ Nuance : si les éléments du tableau sont des `Either` déjà construits (pas des fabriques), ils sont forcément déjà évalués **avant même l'appel à `group`** (JS évalue les expressions d'un littéral de tableau avant de les passer en argument) — dans ce cas, `secondCalled`/`thirdCalled` valent `true` même si `group` lui-même s'arrête au premier `Left` pour la suite de son propre traitement. **L'arrêt au premier échec ne protège donc les appels coûteux que si on passe des fabriques (getters), pas des valeurs déjà construites.**

3. **Objet, un `Left`** → c'est bien le **premier** `Left` rencontré dans l'ordre des clés qui est renvoyé, et les fabriques des clés suivantes (`skipped`) ne sont pas appelées (`skippedGetterCalled: false`).

4. **Tableau vide / objet vide** → `Success` avec respectivement `[]` et `{}` (pas d'erreur, pas de cas particulier).

---

## Q4 — Format de `DString.to` pour les nombres (et les autres valeurs)

**Statut : ✅ vérifié en exécution (`sandbox/q4-string-to-format.ts`)**

### Code source

`node_modules/@duplojs/lang/dist/string/to.mjs` :

```js
function to(value) {
	return `${value}`;
}
```

`DString.to` est **exactement** la coercition de template literal JS native — aucune logique de formatage DuploJS spécifique.

### Sorties (colonnes : cas, `DString.to`, coercition native `${value}` pour comparaison)

```
entier positif       -> DString.to = "42"                    | native = "42"
entier négatif       -> DString.to = "-42"                   | native = "-42"
zéro                 -> DString.to = "0"                     | native = "0"
moins zéro           -> DString.to = "0"                     | native = "0"
décimal              -> DString.to = "3.14"                  | native = "3.14"
décimal négatif      -> DString.to = "-3.14"                 | native = "-3.14"
très grand (1e21)    -> DString.to = "1e+21"                 | native = "1e+21"
limite haute (1e20)  -> DString.to = "100000000000000000000" | native = "100000000000000000000"
très petit (1e-7)    -> DString.to = "1e-7"                   | native = "1e-7"
limite basse (1e-6)  -> DString.to = "0.000001"               | native = "0.000001"
NaN                  -> DString.to = "NaN"                    | native = "NaN"
Infinity             -> DString.to = "Infinity"               | native = "Infinity"
-Infinity            -> DString.to = "-Infinity"              | native = "-Infinity"
```

Points clés :
- Bascule en notation exponentielle à partir de **`1e21`** inclus (pas avant : `1e20` reste écrit en entier), et sous **`1e-7`** exclu (`1e-6` reste `"0.000001"`) — ce sont les seuils standards du moteur JS pour `Number.prototype.toString()`.
- `-0` est indistinguable de `0` après conversion : `"0"` dans les deux cas (perte d'information sur le signe du zéro).
- `NaN`, `Infinity`, `-Infinity` sont des chaînes littérales exactes, pas des erreurs.
- Pour une chaîne déjà passée, `DString.to` est une identité (`"déjà une chaîne"` → `"déjà une chaîne"`).
- Pour un tableau ou un objet, c'est aussi la coercition JS native : `[1,2,3]` → `"1,2,3"`, `{a:1}` → `"[object Object]"` (vérifié dans `sandbox/common-array-string.ts`).

Typage (`to.d.ts`) : si la valeur d'entrée est un littéral numérique connu de TypeScript, le type de sortie est littéral (`` `${GenericValue}` ``) ; sinon le type est `string` (avec une contrainte `DNumber`/marqueur interne selon le cas).

---

## Q5 — `rightPipe` avec une étape qui renvoie une valeur non-`Either`

**Statut : ✅ vérifié en exécution (`sandbox/q5-rightPipe-non-either.ts`)**

### Code source

`node_modules/@duplojs/lang/dist/either/right/pipe.mjs` :

```js
function rightPipe(input, ...pipes) {
	if (isLeft(input)) return input;
	let acc = isRight(input) ? valueKind.getValue(input) : input;
	for (const pipe of pipes) {
		acc = pipe(isRight(acc) ? valueKind.getValue(acc) : acc);
		if (isLeft(acc)) return acc;
	}
	return isRight(acc) ? acc : success(acc);
}
```

C'est accepté sans erreur : à chaque étape, `rightPipe` teste `isRight(acc)` et déballe seulement si c'est le cas ; sinon il traite `acc` comme une valeur « nue » et la transmet telle quelle à l'étape suivante. **À la toute fin**, si le dernier résultat n'est pas déjà un `Right`/`Left`, il est automatiquement enveloppé dans `success(acc)`.

### Preuves d'exécution

- Étape unique renvoyant `value + 1` (nombre nu) → résultat final = `Success(2)` (enveloppé automatiquement).
- Deux étapes nues chaînées (`+1` puis `*10`) sur l'entrée `Success(1)` → `Success(20)` : chaque étape reçoit bien la valeur déballée de la précédente, même si cette précédente n'était pas elle-même un `Either`.
- **Entrée brute** (pas un `Either` du tout, ex. `rightPipe(1, ...)`) → traitée exactement pareil : la première étape reçoit `1` directement (pas d'erreur, pas de `Left` implicite).
- Une étape qui renvoie un objet qui *ressemble* à un échec mais n'a pas les clés internes DuploJS (`{ fake: "not-an-either", value }`) → **n'est jamais interprété comme un `Left`** (seules les clés runtime créées par `DEither.left`/`DEither.fail` comptent, cf. `isLeft` dans `node_modules/@duplojs/lang/dist/either/left/is.mjs` : `leftKind.has(input) && informationKind.has(input) && valueKind.has(input)`) : le pipe continue normalement et enveloppe cet objet dans un `Success` final.
- Mélange valeur nue → `Right` explicite → valeur nue : l'étape qui suit un `Right` intermédiaire reçoit bien la valeur **déballée**, pas le wrapper (`DEither.right("doubled", value * 2)` suivi de `(value) => value + 100` reçoit `value` déballé, pas l'objet `Right`).

Donc : TypeScript (via les surcharges `.d.ts` de `rightPipe`, voir plus bas) interdit normalement ce flou en typant chaque étape comme `(input: Valeur_déballée_ou_brute) => Output`, mais **au runtime, aucune vérification n'est faite** — tout JS non typé contournant ces types produirait exactement ce comportement de passage transparent.

---

## Référence complète des API couvertes

### `@duplojs/lang/either`

#### Types `Success`, `Fail`, `Left` — structure réelle en mémoire

**Statut : ✅ vérifié en exécution (`sandbox/either-basics.ts`, `sandbox/q2-print-format.ts`)**

Toutes les variantes `Either` de DuploJS sont de **simples objets JS littéraux**, sans classe ni prototype spécial, dont les clés sont des chaînes de la forme `@duplojs/lang/kind/<namespace>/<nom>` (voir `node_modules/@duplojs/lang/dist/kind/base.mjs`, fonction `create`). Pour le domaine `either`, le namespace est `@DuplojsLangEither`.

Trois clés « rôles » communes à tout `Either` :
- `.../information` → chaîne littérale (ex. `"success"`, `"fail"`, ou l'information personnalisée passée à `left`/`right`).
- `.../value` → la valeur associée (peut être `undefined`).
- une clé de **statut** : `.../right` (toujours présente et valant `null` si c'est un `Right`) ou `.../left` (idem pour un `Left`).

Plus, pour les « raccourcis » standardisés, une clé de tag supplémentaire valant toujours `null` :
- `DEither.success(v)` ajoute `.../success: null` en plus de `.../right: null`.
- `DEither.fail()` ajoute `.../fail: null` en plus de `.../left: null`.
- `DEither.left(info, v)` **n'ajoute aucune clé de tag supplémentaire** — seulement `.../left`, `.../information`, `.../value`.
- `DEither.right(info, v)` même chose côté `Right` (pas de 4ᵉ clé).

Exemple exact (`Object.keys`) :
```
success(3) keys: [
  '@duplojs/lang/kind/@DuplojsLangEither/right',
  '@duplojs/lang/kind/@DuplojsLangEither/information',
  '@duplojs/lang/kind/@DuplojsLangEither/value',
  '@duplojs/lang/kind/@DuplojsLangEither/success'
]
fail() keys: [
  '@duplojs/lang/kind/@DuplojsLangEither/left',
  '@duplojs/lang/kind/@DuplojsLangEither/information',
  '@duplojs/lang/kind/@DuplojsLangEither/value',
  '@duplojs/lang/kind/@DuplojsLangEither/fail'
]
left('info','v') keys: [
  '@duplojs/lang/kind/@DuplojsLangEither/left',
  '@duplojs/lang/kind/@DuplojsLangEither/information',
  '@duplojs/lang/kind/@DuplojsLangEither/value'
]
```

Détection de statut : `isRight`/`isLeft` ne regardent **pas** un discriminant unique style `status: "ok"` mais testent la **présence** de la clé `.../right` ou `.../left` (`leftKind.has(input)` = `runTimeKey in input`). Il n'y a donc pas un seul champ "tag" à traduire en Go mais une présence de clé (en Go : un type ou une interface scellée avec deux implémentations, une pour `Right`, une pour `Left`, est l'équivalent naturel).

Types TypeScript associés (fichiers `.d.ts`) :
```ts
// either/right/create.d.ts
interface Right<Info extends string = string, Value = unknown> { /* porteur des clés right/information/value */ }
// either/right/success.d.ts
interface Success<Value = unknown> extends Right<"success", Value> { /* + clé success */ }
// either/left/create.d.ts
interface Left<Info extends string = string, Value = unknown> { /* porteur des clés left/information/value */ }
// either/left/fail.d.ts
interface Fail extends Left<"fail", void> { /* + clé fail */ }
```
`Success<GenericValue>` = `Right<"success", GenericValue>` ; `Fail` = `Left<"fail", void>`. Autrement dit : au niveau typage, `success`/`fail` sont des cas particuliers de `right`/`left` figés sur l'information `"success"`/`"fail"`.

#### `DEither.success`

**Statut : ✅ vérifié en exécution**
- Signature : `success<const V>(value: V): Success<V>`.
- Pas de forme curryfiée.
- Comportement : construit un `Right` avec `information = "success"` et `value = value`.
- Cas limite : aucune validation de `value` — accepte `undefined`, `null`, objets, tableaux, autres `Either` imbriqués sans les déballer (`success(success(1))` emboîte littéralement).

#### `DEither.fail`

**Statut : ✅ vérifié en exécution**
- Signature : `fail(): Fail`. Aucun argument.
- Construit un `Left` avec `information = "fail"` et `value = undefined`.
- Type de retour : `Fail` = `Left<"fail", void>` — union produite dans une fonction qui peut échouer : `Success<T> | Fail`.

#### `DEither.left`

**Statut : ✅ vérifié en exécution**
- Signatures : `left<Info extends string>(information: Info): Left<Info, undefined>` et `left<Info extends string, const V>(information: Info, value: V): Left<Info, V>`.
- Pas de forme curryfiée.
- `value` par défaut `undefined` (paramètre `value = void 0` dans le source).
- Chaque appel avec une `information` différente produit un type `Left<"xxx", ...>` distinct dans l'union — c'est la base du *pattern matching exhaustif* de `matchInformation`.

#### `DEither.isRight` / `DEither.isLeft`

**Statut : ✅ vérifié en exécution**
- Signatures : `isRight<I>(input: I): input is Extract<I, Right>` / `isLeft<I>(input: I): input is Extract<I, Left>`.
- Garde de type (type predicate) utilisable directement dans un `if` TypeScript pour affiner l'union (`projects/01` à `10` utilisent systématiquement `if (DEither.isRight(result)) { ... }`).
- Implémentation runtime : test de présence des clés `rightKind`/`leftKind` + `informationKind` + `valueKind` — ce n'est **pas** un simple test de type JS (`typeof`) mais une vérification de forme structurelle (duck typing sur les clés internes).
- Un objet qui n'a pas ces clés exactes (même s'il « ressemble » à un `Either`) n'est jamais reconnu comme `Right`/`Left` (voir Q5).

#### `DEither.whenIsRight`

**Statut : ✅ vérifié en exécution**
- Forme directe : `whenIsRight(input, callback)`.
- Forme curryfiée/data-last : `whenIsRight(callback)` renvoie `(input) => whenIsRight(input, callback)` — utilisable dans `DCommon.pipe`.
- Comportement : si `isRight(input)`, appelle `callback(valeur déballée)` et **renvoie directement le résultat de la callback, sans le ré-envelopper** (si la callback renvoie elle-même un `Either`, il n'est pas déballé une seconde fois : `whenIsRight(success(5), v => success(v*2))` renvoie l'objet `Success(10)` littéral produit par la callback, pas un `Success(Success(10))`).
- Si `isRight(input)` est faux (c'est un `Left`), **l'entrée est renvoyée strictement inchangée** (même référence), la callback n'est jamais appelée.
- Type de retour (union) : `Exclude<Input, Right> | Output` — c.-à-d. toutes les variantes `Left` de l'union d'entrée, inchangées, unies au type de retour de la callback.

#### `DEither.whenIsRightOtherwise`

**Statut : ✅ vérifié en exécution**
- Forme directe : `whenIsRightOtherwise(input, onRight, onOtherwise)`.
- Forme curryfiée : `whenIsRightOtherwise(onRight, onOtherwise)` renvoie `(input) => ...` — compatible `DCommon.pipe`.
- Comportement : si `isRight(input)`, appelle `onRight(valeur déballée)` ; **sinon** appelle `onOtherwise(input)` avec l'`Either` **complet, non déballé** (pas juste la valeur) — différence importante avec `whenIsLeft` qui déballerait côté `Left`.
- Type de retour : union des deux retours de callback (`Output1 | Output2`), jamais l'entrée d'origine telle quelle (contrairement à `whenIsRight` seul).

#### `DEither.matchInformation`

**Statut : ✅ vérifié en exécution**
- Forme directe : `matchInformation(input, matcher)`.
- Forme curryfiée : `matchInformation(matcher)` renvoie `(input) => ...`.
- `matcher` est un objet `{ [information]: (valeurDéballée) => Résultat }` — **une clé par information possible dans l'union d'entrée** (le typage TypeScript impose l'exhaustivité et interdit toute clé en plus — `ForbiddenMoreKey` dans le `.d.ts`).
- Comportement runtime : si l'entrée n'a pas les clés `information`/`value` (n'est pas un `Either` reconnu), **l'entrée est renvoyée telle quelle**, sans appeler aucun matcher.
- Si l'entrée est un `Either` reconnu mais que le matcher ne contient **pas** de clé correspondant à son `information` (situation normalement impossible à cause du typage exhaustif, atteinte ici volontairement en contournant TypeScript) : **exception levée au runtime** (`TypeError: matcher[...] is not a function`), pas de valeur de repli silencieuse. ⚠️ Ceci est un point important : contrairement à `whenIsRightOtherwise`, `matchInformation` n'a **pas de garde-fou runtime** — il compte entièrement sur l'exhaustivité vérifiée par TypeScript à la compilation.
- Type de retour : union des types de retour de chaque handler.

#### `DEither.rightPipe`

**Statut : ✅ vérifié en exécution**
- Signature : arité fixe `rightPipe(input, étape1, étape2, ..., étapeN)`, surchargée explicitement de 1 à 15 étapes dans les `.d.ts` (`either/right/pipe.d.ts`) — **pas de forme curryfiée/data-last**, contrairement à `whenIsRight`/`matchInformation`.
- Comportement exact (voir code source cité en Q5) :
  1. Si `input` est déjà un `Left`, il est **renvoyé immédiatement**, aucune étape n'est exécutée.
  2. Sinon, la valeur de départ (déballée si `input` est un `Right`, brute sinon) est passée à la première étape.
  3. Après chaque étape, si le résultat est un `Left`, **arrêt immédiat** (les étapes suivantes ne sont jamais appelées) et ce `Left` est le résultat final.
  4. Si le résultat d'une étape est un `Right`, sa valeur est **déballée** avant d'être transmise à l'étape suivante (jamais le wrapper lui-même).
  5. Si le résultat d'une étape est une valeur brute (ni `Right` ni `Left`), elle est transmise telle quelle à l'étape suivante (voir Q5).
  6. À la fin, si le dernier résultat est déjà un `Right`/`Left`, il est renvoyé tel quel ; sinon il est enveloppé dans `success(...)`.
- Type de retour (union) : `Extract<Left-de-toutes-les-étapes | Success-final, any>` — union de tous les `Left` possibles à n'importe quelle étape, plus le `Right`/`Success` final.
- Arrêt au premier échec, pas de collecte : c'est un court-circuit séquentiel classique (façon `Result`/`Either` monadique), pas un agrégateur.

#### `DEither.rightAsyncPipe`

**Statut : ✅ vérifié en exécution**
- Même sémantique que `rightPipe`, en asynchrone : chaque étape peut renvoyer une valeur ou une `Promise`, chaque étape est `await`-ée avant de passer à la suivante (toujours **séquentiel**, jamais parallèle — cohérent avec `asyncGroup`, voir Q1).
- Signature : `async function rightAsyncPipe(input, ...pipes)`, renvoie toujours une `Promise`. Surchargée de 1 à 15 étapes dans les `.d.ts`, pas de forme curryfiée.
- `input` lui-même peut être une `Promise` (il est `await`-é en premier).
- Un `Left` initial (une fois l'entrée résolue) est propagé **sans exécuter aucune étape** (vérifié : `stepCalled: false`).
- Une étape qui renvoie un `Left` arrête la suite (vérifié : étape suivante jamais appelée).

#### `DEither.group`

**Statut : ✅ vérifié en exécution** — voir Q3 pour le détail complet (arrêt au premier `Left`, tableau et objet acceptés, fabriques optionnelles `() => Either` pour différer l'évaluation, tableau/objet vide → `Success` vide).
- Signature : `group<G>(group: G): Success<...> | Left` où `G` est soit `Record<string, Either | (() => Either)>` soit `readonly (Either | (() => Either))[]`.
- Particularité de typage notable : pour la forme tableau, le `Success` final conserve la **cardinalité exacte** (un tuple typé `[TypeA, TypeB]`, pas un simple `Array<A|B>`).

#### `DEither.asyncGroup`

**Statut : ✅ vérifié en exécution** — voir Q1 pour la preuve d'exécution séquentielle et l'arrêt au premier échec.
- Signature : `asyncGroup<G>(group: G): Promise<Success<...> | Left>`, mêmes formes tableau/objet que `group`, mais chaque entrée peut être `Either`, `Promise<Either>`, `() => Either` ou `() => Promise<Either>`.
- Différence clé avec `group` : exécution **asynchrone séquentielle** (await un par un, jamais en parallèle), implémentée via un `asyncReduce` interne (générateurs).

---

### `@duplojs/lang/common`

#### `DCommon.pipe`

**Statut : ✅ vérifié en exécution (`sandbox/common-array-string.ts`)**
- Code source (`common/pipe.mjs`) :
  ```js
  function pipe(input, ...pipes) {
  	let acc = input;
  	for (const pipe of pipes) acc = pipe(acc);
  	return acc;
  }
  ```
- Simple composition gauche-à-droite, synchrone, sans aucune notion d'`Either` : chaque étape reçoit la sortie brute de la précédente, point.
- Avec zéro étape (`pipe(42)`), renvoie l'entrée inchangée (`42`) — vérifié.
- Signature : surchargée de 1 à au moins 15 étapes (arité fixe), pas de forme variadique générique ni data-last — c'est `pipe` elle-même qui *est* la forme « point final » utilisée pour enchaîner les formes curryfiées d'autres fonctions (`whenIsRight(cb)`, `DArray.map(cb)`, etc.).

#### `DCommon.asyncPipe`

**Statut : ✅ vérifié en exécution**
- Code source (`common/asyncPipe.mjs`) :
  ```js
  async function asyncPipe(input, ...pipes) {
  	let acc = await input;
  	for (const pipe of pipes) acc = await pipe(acc);
  	return acc;
  }
  ```
- Comme `pipe`, mais `input` et chaque sortie d'étape sont `await`-és avant de passer à la suite : accepte un mélange d'étapes synchrones et asynchrones sans distinction (vérifié avec une étape sync `v => v+1` suivie d'une étape `async` avec `setTimeout`).
- Toujours strictement séquentiel (chaque étape attend la fin de la précédente) — jamais de concurrence, cohérent avec `asyncGroup`/`rightAsyncPipe`.
- Renvoie toujours une `Promise` (type `Promise<...>`).

#### `DCommon.print`

Voir détail complet en **Q2** ci-dessus (signature, code source, sorties brutes).

---

### `@duplojs/lang/array`

#### `DArray.coalescing`

**Statut : ✅ vérifié en exécution**
- Code source (`array/coalescing.mjs`) :
  ```js
  function coalescing(value) {
  	return value instanceof Array ? value : [value];
  }
  ```
- Si `value` est déjà un tableau (`instanceof Array`), il est renvoyé **tel quel, même référence** (vérifié : `coalesced === original` → `true` ; aucune copie n'est faite).
- Sinon, enveloppé dans un tableau à un seul élément : `coalescing(42)` → `[42]`.
- Cas limites vérifiés : tableau vide → inchangé (`[]`) ; `null`/`undefined` → chacun enveloppé (`[null]`, `[undefined]`), pas de traitement spécial.
- Pas de forme curryfiée (un seul argument, donc pas nécessaire).
- Type (`Coalescing<V>`) : `V extends readonly any[] ? V : readonly [V]` — littéralement la même logique au niveau des types.

#### `DArray.map`

**Statut : ✅ vérifié en exécution**
- Code source (`array/map.mjs`) :
  ```js
  function map(...args) {
  	if (args.length === 1) {
  		const [theFunction] = args;
  		return (array) => map(array, theFunction);
  	}
  	const [array, theFunction] = args;
  	return array.map((element, index) => theFunction(element, { index, self: array }));
  }
  ```
- Forme directe : `map(array, callback)`. Forme curryfiée : `map(callback)` renvoie `(array) => ...` — utilisable dans `DCommon.pipe` (c'est la forme utilisée dans `projects/05` et suivants).
- C'est un **wrapper mince autour de `Array.prototype.map`** : même ordre de parcours, même préservation de la longueur/structure, pas de logique `Either` particulière (si un élément transformé est lui-même un `Either`, il n'est ni déballé ni traité spécialement — `DArray.map` ne connaît rien d'`Either`).
- La callback reçoit en 2ᵉ paramètre un objet `{ index, self }` (`self` = le tableau d'origine complet), pas seulement l'index comme `Array.prototype.map` natif.
- Tableau vide → tableau vide, vérifié.
- Typage : préserve les contraintes de cardinalité DuploJS du tableau d'entrée sur le tableau de sortie (`ReapplyCompatiblesConstraints`), ex. un tableau borné à 3 éléments max reste borné après `map`.

---

### `@duplojs/lang/string`

#### `DString.to`

Voir détail complet en **Q4** ci-dessus (signature, code source = coercition `${value}` pure, table de sorties pour tous les cas limites numériques).

---

## Impacts pour la traduction Go

1. **`asyncGroup`/`rightAsyncPipe`/`asyncPipe` sont séquentiels, pas concurrents (Q1).** En Go, ne pas traduire par des goroutines + `sync.WaitGroup`/`errgroup` qui lanceraient tout en parallèle : il faut un enchaînement séquentiel classique (boucle `for`, chaque appel attendant le précédent). Un mapping naïf vers des goroutines changerait l'ordre d'exécution observable (les traces de `projects/10` dépendent de cet ordre) et serait une mauvaise traduction même si le résultat final était « correct » dans les cas sans effet de bord observable.

2. **La structure interne d'un `Either` (Q2, section Types) n'a pas de discriminant unique `status: "ok"|"error"` mais une présence de clé parmi deux clés de statut possibles, plus une clé `information` (string) et une clé `value`.** En Go, le plus fidèle est un type somme scellé (interface non exportée + deux implémentations `Right{Information string; Value any}` / `Left{Information string; Value any}`), avec des fonctions `IsRight`/`IsLeft` faisant un type-switch — pas une struct unique avec un booléen `Ok bool`, pour rester proche du duck-typing structurel observé (un `Left` « maquillé » sans les bonnes clés n'est jamais reconnu comme `Left`, cf. Q5).

3. **`DCommon.print` reproduit le format `util.inspect` de Node, pas un simple `fmt.Println` Go.** Si le transpileur doit produire une sortie console *identique* à l'original (ce que demande explicitement Q2), il faudra une fonction de formatage dédiée en Go qui imite cette présentation (guillemets simples sur les clés non-identifiants, indentation à 2 espaces, `undefined`/`null` littéraux…), pas le format par défaut de `%v`/`%+v` de Go qui diffère radicalement.

4. **`group` s'arrête au premier échec et ne collecte pas les erreurs (Q3), et seules les *fabriques* (`() => Either`) bénéficient réellement du court-circuit — les valeurs déjà construites sont toutes évaluées avant l'appel.** En Go, le pattern naturel est un retour anticipé (`if err/left != nil { return left }`) dans une boucle, PAS un style qui collecterait toutes les erreurs (type `[]error`). Si le code source TypeScript passe des valeurs déjà calculées (pas des closures), le transpileur doit conserver cette évaluation anticipée de tous les éléments (donc ne pas « optimiser » en ajoutant un court-circuit qui n'existait pas dans le TS d'origine).

5. **`DString.to` est une coercition JS native (`${value}`), pas un formattage « joli » dédié (Q4).** En Go, `strconv.FormatFloat` avec les options par défaut (`'g'`, précision -1) ne reproduit QUE partiellement ce comportement : les seuils de bascule en notation exponentielle de JS (≥1e21, <1e-7) diffèrent de ceux de Go. Le transpileur doit implémenter une fonction de stringification de nombre dédiée reproduisant exactement ces seuils (et le traitement de `-0` → `"0"`, `NaN`, `±Infinity`) plutôt que de s'appuyer sur le formatage Go par défaut.

6. **`rightPipe`/`rightAsyncPipe` acceptent des étapes qui renvoient des valeurs « nues » non-`Either`, et ne les enveloppent dans un `Success` qu'à la toute fin de la chaîne (Q5).** En Go, où tout doit être explicitement typé, chaque étape devra avoir une signature homogène (ex. `func(T) (U, Either[F, U])` ou retourner systématiquement un type `Either`) — on ne peut pas reproduire le "parfois nu, parfois enveloppé" dynamique de JS sans que le transpileur insère lui-même l'enveloppement (`Success{}`) à chaque étape intermédiaire qui, en TypeScript, ne renvoyait qu'une valeur brute. C'est un point de divergence structurel entre les deux langages qu'il faut gérer explicitement dans les règles de transformation, pas par une simple traduction terme à terme.

7. **`matchInformation` n'a pas de garde-fou runtime en cas d'information non gérée (voir la fiche `DEither.matchInformation` ci-dessus) : il lève une exception JS brute (`TypeError`) si TypeScript n'a pas garanti l'exhaustivité.** Puisque Go n'a pas de vérification d'exhaustivité de switch sur des unions de la même façon, le transpileur doit soit garantir statiquement l'exhaustivité à la génération (en connaissant toutes les informations possibles de l'union d'entrée, ce qui est faisable puisque le typage DuploJS les connaît), soit générer un `panic`/`default` explicite reproduisant la levée d'exception plutôt que de laisser un comportement indéfini.

8. **Les fonctions curryfiées (`whenIsRight`, `whenIsRightOtherwise`, `matchInformation`, `DArray.map`) détectent l'arité par `args.length` au runtime pour choisir entre forme directe et forme data-last, alors que `rightPipe`/`rightAsyncPipe`/`DCommon.pipe`/`DCommon.print`/`DString.to`/`DArray.coalescing` n'ont qu'une seule forme (pas de curryfication).** Le transpileur n'a pas besoin de supporter une détection d'arité dynamique en Go (qui n'a pas de surcharge par arité variable de cette façon) : il suffit, à la génération, de savoir si le code source TypeScript utilisait la forme directe ou la forme pipée, et de générer l'appel Go équivalent correspondant (fonction à 2 arguments vs. fonction retournant une closure/un adaptateur à utiliser dans la chaîne de pipe Go) — la détection se fait à la transpilation (statiquement), pas à l'exécution.

---

## Correspondance avec `PLAN_HACKATHON.md` (sections 5 et 6)

Le plan ([`PLAN_HACKATHON.md`](PLAN_HACKATHON.md), voir note en tête de ce document) liste explicitement plusieurs points « à vérifier » dans la sémantique DuploJS avant de trancher les ADR de la Personne 4 (ADR-1, Either) et de poser les bases du Sprint 5 (ADR-5, async). Voici leur statut après exécution :

| Référence dans le plan | Question posée | Statut après cette fiche |
|---|---|---|
| **ADR-1** (§5), note finale : *« faut-il garder les champs `JSNull` actuels (`Right`, `Success`) … selon la sortie attendue de `DCommon.print` »* | Quelle est la structure réelle (clés) d'un `Either` en mémoire, et ce que `print` en affiche ? | **Résolu** — voir section « Types `Success`, `Fail`, `Left` » et **Q2** ci-dessus. Il y a bien une clé de statut (`right`/`left`), une clé `information`, une clé `value`, et pour `success`/`fail` uniquement une 4ᵉ clé de tag valant toujours `null`. `left`/`right` « bruts » n'ont **pas** cette 4ᵉ clé — à reproduire fidèlement si l'option B/interface (§ADR-1) est retenue. |
| **ADR-6** (§5) : *« établir la sortie de référence en exécutant le TS, puis choisir un `print` Go qui produit la même chose »* | Format exact de `DCommon.print` | **Résolu** — **Q2**, sorties brutes collées caractère par caractère (nombre, chaîne, tableau, `Either` succès/échec/`Left`). |
| **ADR-5** (§5) et exercice **10** (§6) : *« `asyncGroup` exécute-t-il les fabriques en parallèle (`Promise.all`) ou séquentiellement ? À vérifier »* | Concurrence de `asyncGroup` | **Résolu** — **Q1**, preuve par horodatage : strictement séquentiel, jamais parallèle. Impacte directement le choix entre l'option A (synchrone) et l'option B (future/goroutine) de l'ADR-5 : une traduction par goroutines + `WaitGroup` lancées simultanément serait **infidèle** à l'original, quelle que soit l'option choisie pour le modèle de `Promise`. |
| Exercice **07** (§6) : *« une étape qui retourne une valeur non-Either (à vérifier dans la sémantique DuploJS) »* | `rightPipe` avec étape non-`Either` | **Résolu** — **Q5** : accepté, traité comme valeur nue transmise telle quelle, enveloppée dans un `Success` seulement à la fin de la chaîne. |
| Exercice **09** (§6) : *« groupe d'objet ou de tableau (vérifier ce que DuploJS accepte), groupe vide »* et *« l'ordre de propagation de l'échec (premier ou tous ?) est à vérifier »* | Formes acceptées par `group`, comportement sur échec/vide | **Résolu** — **Q3** : tableau **et** objet acceptés (jamais les deux à la fois), premier `Left` rencontré renvoyé tel quel (pas de collecte), groupe vide → `Success` vide (`[]`/`{}`). Nuance ajoutée : le court-circuit ne protège les appels coûteux que si les éléments sont des fabriques (`() => Either`), pas des `Either` déjà construits. |
| Exercice **05** (§6) : *« `DString.to(float64)` vers un formatage identique à JS (`strconv.FormatFloat` diverge sur les exposants et sur `-0`) »* | Seuils exacts de formatage numérique | **Résolu** — **Q4** : seuils exacts (`≥1e21` et `<1e-7`), `-0 → "0"`, `NaN`/`Infinity` littéraux. |

Aucun écart entre la doc `@duplojs/agents-kit` et l'exécution réelle n'a été observé sur les points testés (la seule description de doc vérifiée en détail, celle d'`asyncGroup` — *« regrouper séquentiellement »* —, s'est confirmée à l'exécution).
