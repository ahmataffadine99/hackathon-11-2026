# Problématique 07 : Enchaînement dépendant (rightPipe)

## Problématique
Comment enchaîner des opérations qui dépendent les unes des autres (`rightPipe`), en interrompant immédiatement la suite dès qu'une étape produit un échec, sans allouer de closures à chaque étape ?

## Démarche et réflexions
Dans [ADR-10](../../docs/decisions/ADR-10-right-pipe.md), nous avons évalué trois options :
1. Une closure qui boucle sur un tableau de callbacks : compacte mais alloue sur le tas.
2. Des littéraux `func` avec retours anticipés : idiomatique mais crée des fonctions imbriquées.
3. **`if` imbriqués inlinés (retenue)** : L'entrée est évaluée une seule fois, puis chaque étape vérifie `IsRight()`. Si une étape produit un `Left`, le reste du bloc n'est pas exécuté et l'erreur est renvoyée immédiatement.

## Solution
`rightPipe` est traduit en blocs conditionnels directs imbriqués. Cette forme est 100 % inlinable par le compilateur Go et garantit un court-circuit immédiat.

## Limites
Le pipeline doit être statiquement connu à la compilation (pas de liste dynamique de transformations générée au runtime).
