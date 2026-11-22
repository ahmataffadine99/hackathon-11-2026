# Mesures

> Légende : **[observé]** = mesuré, avec la commande et la machine ; **[à vérifier]** = non mesuré.
> Règle : un chiffre n'est donné qu'avec son contexte, et on ne tire pas de conclusion générale d'une micro-mesure.

## 1. De bout en bout : Node contre binaire Go **[observé]**

Script : [`research/measures/measure.sh`](../research/measures/measure.sh) (résultat : [`results.md`](../research/measures/results.md)). Pour chaque exercice, le script :
1. transpile, compile le binaire Go (`go build`, pas `go run`) et produit un JS autonome avec esbuild ;
2. **vérifie que les trois versions produisent la même sortie** avant de mesurer ;
3. mesure 30 exécutions complètes de chaque version, après 3 échauffements.

Apple M4 (10 cœurs), macOS 15.6.1, go1.27.4 darwin/arm64, Node v22.19.0, **18/11/2026**, `main` `699fbaf`. Commande : `./research/measures/measure.sh 01 05 09 10`. `hyperfine` étant absent, le chronométrage passe par une boucle Python (`time.perf_counter` autour de chaque processus). Le script utilise `hyperfine` s'il est installé.

| Ex. | Node + tsx (ms) | Node, JS compilé (ms) | Go, binaire (ms) | RSS max Node (Mo) | RSS max Go (Mo) | « escapes to heap » (code utilisateur) |
|---|---:|---:|---:|---:|---:|---:|
| 01 | 138,1 [134,6..213,5] | 17,2 [16,6..23,9] | 2,0 [1,9..2,5] | 37 | 3 | 0 |
| 05 | 153,4 [151,6..158,6] | 17,1 [16,6..17,9] | 2,0 [1,9..2,1] | 37 | 3 | 6 |
| 09 | 155,3 [152,8..225,5] | 17,9 [17,3..18,7] | 2,0 [2,0..2,9] | 37 | 3 | 11 |
| 10 | 156,5 [154,3..177,0] | 17,6 [17,0..18,8] | 2,0 [1,9..2,3] | 37 | 3 | 10 |

**Écart avec la mesure précédente (17/11, même machine, même commande, `main` `11a8429`) [observé] :** Node sur JS compilé valait alors 20,0 à 21,2 ms (médianes), contre 17,1 à 17,9 ms ici, soit **environ −15 %** ; Node + tsx valait 145,7 à 162,9 ms (environ −5 % ici) ; Go est stable (2,1 à 2,2 ms contre 2,0 ms). Entre les deux mesures, le Go de 01, 05 et 09 n'a changé que par les noms de package (D8) et l'affichage des génériques (D13), sans effet sur la logique : sorties et nombres d'échappements identiques. Et c'est le temps de **Node** qui a bougé, pas celui de Go. La cause de l'écart côté Node n'est pas établie **[à vérifier]** : charge de la machine ou cache du système. On retient donc des **ordres de grandeur**, pas des pourcentages.

Temps : médiane [min..max] d'un processus complet, démarrage compris. RSS : `/usr/bin/time -l`, arrondi au Mo inférieur.

**Ce qu'on en conclut :**
- Pour **ces programmes**, le binaire Go termine environ **8,5 à 10 fois plus vite** que Node sur le JS compilé (selon la mesure : 17/11 ou 18/11), et environ **70 fois plus vite** que Node avec `tsx`, avec environ **12 fois moins de mémoire résidente** (3 Mo contre 37 Mo, stable sur les deux mesures).
- `tsx` coûte à lui seul environ 120 à 140 ms (transpilation TS au lancement). La comparaison honnête est donc « Node, JS compilé » contre « Go ».
- **Échappements** : 0 dans le code utilisateur de 01 (`Either` par valeur, ADR-1). Pour 05, 09 et 10, les seules valeurs qui vont sur le tas sont des **slices** (`[]float64{…}`, `make([]string, …)`, `append`), parce qu'elles sont rangées dans des variables de package ou renvoyées. Il n'y a aucune closure ni aucun `Either` sur le tas (ADR-7). Une même ligne peut apparaître deux fois quand le site est inliné ; le compte est celui des lignes de `-gcflags=-m`.

**Ce qu'on n'en conclut pas :**
- Ces programmes sont **minuscules** : le temps mesuré est presque entièrement du **démarrage** (runtime Node et V8 contre runtime Go). Ce n'est **pas** une mesure de la vitesse du code transpilé sur une charge réelle.
- Le coût du calcul lui-même est mesuré par les micro-benchmarks : ADR-1 (représentations d'Either), ADR-11 (`research/tuples` : `[N]T` contre `[]T`) et ADR-5 (`research/async` : option A contre option B).

## 2. Micro-mesures déjà réalisées

| Sujet | Résultat | Source |
|---|---|---|
| Représentation d'`Either` | A (struct par valeur) : 0 allocation par valeur ; B et C (interfaces) 5 à 8 fois plus lentes sur 1000 valeurs | [ADR-1 §4](decisions/ADR-1-either.md) |
| Tuples `[3]float64` contre `[]float64` | `[3]T` environ 5,3 fois plus rapide, 0 allocation contre 1000 (Windows 11, i7-9750H) | [ADR-11](decisions/ADR-11-tuples-destructuring.md), [`research/tuples`](../research/tuples/) |
| Asynchronisme, option A contre B | A : 13,7 ns/op et 1 allocation ; B (futures séquentielles) : 759,9 ns/op, 10 allocations et 3 goroutines (Apple M4) | [`research/async`](../research/async/), [ADR-5](decisions/ADR-5-async.md) |
| Closures des combinateurs | Toutes inlinées, aucune closure sur le tas (03, 05, 06) | [ADR-7 §4](decisions/ADR-7-arrow-generic-values.md) |

## Reproduire

```bash
./research/measures/measure.sh                    # 01 05 09 10, 30 exécutions
./research/measures/measure.sh --runs 50 01 09    # autres cibles, autre nombre d'exécutions
cd research/async && go test -run '^$' -bench . -benchmem -count 5 ./...
```
