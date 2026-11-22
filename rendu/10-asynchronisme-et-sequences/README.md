# Problématique 10 : Asynchronisme séquentiel vs concurrence

## Problématique
Comment traduire `async`/`await`, `rightAsyncPipe` et `asyncGroup` sans dénaturer la sémantique JavaScript d'évaluation séquentielle et sans surcoût inutile de synchronisation ?

## Démarche et réflexions
Dans [ADR-5](../../docs/decisions/ADR-5-async.md) et notre benchmark [`research/async`](../../research/async/README.md) :
- Piste B (futures avec goroutines et channels) : même ordonnancée de façon séquentielle, elle coûte environ **55 fois plus cher en temps d'exécution** (759,9 ns/op vs 13,7 ns/op) et ajoute 10 allocations et 3 goroutines par exécution.
- Piste BParallel (`Promise.all`) : formellement interdite par la sémantique DuploJS, car elle évalue toutes les fabriques même après un échec.
- Piste A (retenue) : Exécution synchrone séquentielle inlinée au point d'appel.

## Solution
Comme les exercices ne comportent aucune entrée/sortie réelle, l'asynchronisme de DuploJS est purement syntaxique et séquentiel. Traduire les fonctions en appels synchrones séquentiels élimine tout surcoût de runtime tout en respectant l'ordre d'évaluation à 100 %.

## Limites
Si du code synchrone avec effet de bord observable est intercalé entre la création d'une promesse et son `await`, l'option A exécute le calcul au point d'appel, ce qui peut réordonner les effets par rapport à la boucle d'événements Node (limite documentée `10-sync-between`).
