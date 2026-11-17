# ADR-5 : traduction de l'asynchronisme

- **Statut :** accepté — option A
- **Portée :** exercice 10 et API `rightAsyncPipe`, `asyncGroup`, `asyncPipe`
- **Dépend :** P2 (`async`/`await`) et P4 (`Promise<T>`)

## Contexte

L'exercice 10 combine des fonctions `async`, `await`, `rightAsyncPipe`,
`asyncGroup` et `DCommon.asyncPipe`. Le choix doit préserver l'ordre observable
des calculs et l'arrêt au premier `Left`, sans introduire une concurrence que
JavaScript n'exécute pas.

## Sémantique observée

- **[vérifié]** `asyncGroup` traite les fabriques dans l'ordre et attend chacune
  avant d'appeler la suivante. La troisième fabrique n'est pas appelée après un
  `Left`. Source : `node_modules/@duplojs/lang/dist/either/right/asyncGroup.mjs`
  et son `asyncReduce`.
- **[vérifié]** `rightAsyncPipe` attend l'entrée, propage un `Left`, puis appelle
  séquentiellement les étapes et s'arrête au premier `Left`. Une valeur finale
  nue est enveloppée une seule fois dans `Success`.
  Source : `node_modules/@duplojs/lang/dist/either/right/asyncPipe.mjs`.
- **[vérifié]** `DCommon.asyncPipe` attend l'entrée puis chaque étape, dans
  l'ordre. Source : `node_modules/@duplojs/lang/dist/common/asyncPipe.mjs`.
- **[vérifié]** dans `variations/10-sync-between`, le code synchrone qui suit la
  création du combinateur s'affiche avant les fabriques, qui ne démarrent qu'au
  `await`.
- **[vérifié]** le corps d'une fonction `async` démarre dès son appel ; son
  résultat est ensuite une `Promise`.

La sortie TypeScript brute de l'exercice 10 est :

```text
[ 'transaction annulée' ]
```

## Options

1. **A — appels synchrones séquentiels.** Les fonctions `async` deviennent des
   fonctions Go ordinaires ; chaque pipeline appelle ses étapes dans l'ordre.
2. **B — futures séquentielles** avec goroutines et channels : la sémantique
   pourrait être conservée en attendant chaque future, au prix d'une mécanique
   et d'allocations supplémentaires. Les mesures comparatives sont confiées à P4
   et ne sont pas disponibles sur cette branche.
3. **C — file de microtâches** pour simuler l'ordonnanceur JavaScript : modèle
   plus complexe, sans bénéfice pour les API séquentielles de l'exercice.

## Décision

Retenir **A**. L'implémentation réutilise les handlers séquentiels existants :
`rightAsyncPipe` reprend `rightPipe`, `asyncGroup` traite chaque fabrique dans
la boucle de groupement, et `DCommon.asyncPipe` reprend `pipe`. Aucun
parallélisme, goroutine ou channel n'est généré.

## Conséquences et limites

- Les chemins sans effet synchrone intercalé conservent les valeurs, l'ordre et
  l'arrêt au premier `Left`.
- **Écart assumé :** une fabrique d'`asyncGroup` peut s'exécuter dans le Go
  inliné avant un effet synchrone placé entre la création du combinateur et son
  `await`. La variante `10-sync-between` conserve cet écart comme test
  intentionnel ; elle ne doit pas être retirée.
- La forme objet d'`asyncGroup`, bien qu'acceptée par DuploJS, est refusée par le
  transpileur ; seule la forme tableau est prise en charge.
- Les véritables E/S asynchrones et leur ordonnancement ne sont pas représentés
  par l'option A.

## Go produit et validation

Le Go final de l'exercice 10 ne peut pas encore être observé sur cette branche :
`pnpm build:10` s'arrête avant la transformation des API async avec
`notfound-transformer` sur le type `DisplayError`. Le transformer
`Promise<T>` de P4 et les handlers `await` de P2 ne sont pas intégrés ici. Aucun
extrait Go ni résultat de comparaison n'est donc présenté comme vérifié.

Les cinq variantes 10 passent `tsc --noEmit` puis `tsx`. `projects/09` passe
toujours la transpilation, `go vet`, l'exécution Go et la comparaison de sortie.
La validation Go de 10 et la comparaison complète doivent être répétées après
intégration de P2 et P4. Voir [la fiche 10](../exercises/10.md).
