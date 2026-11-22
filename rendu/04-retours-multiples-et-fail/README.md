# Problématique 04 : Retours multiples et inférence de fail()

## Problématique
Comment traduire une fonction comportant plusieurs chemins d'exécution conditionnels qui retournent des variantes différentes (succès ou échec), et comment instancier le type de retour d'une fonction comme `fail()` qui n'a aucun argument ?

## Démarche et réflexions
- En TypeScript, `fail()` est polymorphe et s'unifie avec n'importe quelle branche grâce au vérificateur de type contextuel.
- En Go, `EitherFailOf[V]()` doit obligatoirement connaître son paramètre de type `V` au moment de la compilation.
- Piste retenue : Le transpileur remonte la chaîne syntaxique pour déduire `V` depuis le type de retour déclaré ou inféré de la fonction englobante.

## Solution
Les différents `return` sont traduits directement en instructions de retour Go vers le type unifié `Either[V]`. Chaque chemin produit une instance de la structure par valeur avec son `Kind` approprié.

## Limites
Toutes les branches de succès de la fonction doivent être compatibles avec un type Go unique `V`.
