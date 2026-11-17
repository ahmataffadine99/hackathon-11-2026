# Mesures

> Légende : **[observé]** = mesuré, avec la commande et la machine ; **[à vérifier]** = non mesuré.
> Règle : un chiffre n'est donné qu'avec son contexte, et on ne tire pas de conclusion générale d'une micro-mesure.

## 1. De bout en bout : Node contre binaire Go **[observé]**

Script : [`research/measures/measure.sh`](../research/measures/measure.sh) (résultat : [`results.md`](../research/measures/results.md)). Pour chaque exercice, le script :
1. transpile, compile le binaire Go (`go build`, pas `go run`) et produit un JS autonome avec esbuild ;
2. **vérifie que les trois versions produisent la même sortie** avant de mesurer ;
3. mesure 30 exécutions complètes de chaque version, après 3 échauffements.

Apple M4 (10 cœurs), macOS 15.6.1, go1.27.4 darwin/arm64, Node v22.19.0, 17/11/2026. `hyperfine` étant absent, le chronométrage passe par une boucle Python (`time.perf_counter` autour de chaque processus). Le script utilise `hyperfine` s'il est installé.

| Ex. | Node + tsx (ms) | Node, JS compilé (ms) | Go, binaire (ms) | RSS max Node (Mo) | RSS max Go (Mo) | « escapes to heap » (code utilisateur) |
|---|---:|---:|---:|---:|---:|---:|
| 01 | 145,7 [142,8..196,5] | 20,3 [19,6..21,4] | 2,1 [2,0..4,3] | 37 | 3 | 0 |
| 05 | 162,4 [161,1..173,1] | 20,0 [19,6..21,4] | 2,1 [2,0..2,4] | 37 | 3 | 6 |
| 09 | 162,9 [161,5..212,3] | 21,2 [20,4..22,2] | 2,2 [2,0..2,8] | 37 | 3 | 11 |
| 10 | – | – | – | – | – | – (transpilation en cours, Sprint 5) |

Temps : médiane [min..max] d'un processus complet, démarrage compris. RSS : `/usr/bin/time -l`, arrondi au Mo inférieur.

**Ce qu'on en conclut :**
- Pour **ces programmes**, le binaire Go termine environ **10 fois plus vite** que Node sur le JS compilé, et environ **70 fois plus vite** que Node avec `tsx`, avec environ **12 fois moins de mémoire résidente**.
- `tsx` coûte à lui seul environ 125 à 140 ms (transpilation TS au lancement). La comparaison honnête est donc « Node, JS compilé » contre « Go ».
- **Échappements** : 0 dans le code utilisateur de 01 (`Either` par valeur, ADR-1). Pour 05 et 09, les seules valeurs qui vont sur le tas sont des **slices** (`[]float64{…}`, `make([]string, …)`, `append`), parce qu'elles sont rangées dans des variables de package ou renvoyées. Il n'y a aucune closure ni aucun `Either` sur le tas (ADR-7). Une même ligne peut apparaître deux fois quand le site est inliné ; le compte est celui des lignes de `-gcflags=-m`.

**Ce qu'on n'en conclut pas :**
- Ces programmes sont **minuscules** : le temps mesuré est presque entièrement du **démarrage** (runtime Node et V8 contre runtime Go). Ce n'est **pas** une mesure de la vitesse du code transpilé sur une charge réelle.
- Le coût du calcul lui-même est mesuré par les micro-benchmarks : ADR-1 (représentations d'Either), ADR-11 (`research/tuples` : `[N]T` contre `[]T`) et ADR-5 (`research/async` : option A contre option B).

## 2. Micro-mesures déjà réalisées

| Sujet | Résultat | Source |
|---|---|---|
| Représentation d'`Either` | A (struct par valeur) : 0 allocation par valeur ; B et C (interfaces) 5 à 8 fois plus lentes sur 1000 valeurs | [ADR-1 §4](decisions/ADR-1-either.md) |
| Tuples `[3]float64` contre `[]float64` | `[3]T` environ 5,3 fois plus rapide, 0 allocation contre 1000 (Windows 11, i7-9750H) | [ADR-11](decisions/ADR-11-tuples-destructuring.md), [`research/tuples`](../research/tuples/) |
| Asynchronisme, option A contre B | A : 13,7 ns/op et 1 allocation ; B (futures séquentielles) : 759,9 ns/op, 10 allocations et 3 goroutines (Apple M4) | [`research/async`](../research/async/) |
| Closures des combinateurs | Toutes inlinées, aucune closure sur le tas (03, 05, 06) | [ADR-7 §4](decisions/ADR-7-arrow-generic-values.md) |

## Reproduire

```bash
./research/measures/measure.sh                    # 01 05 09 10, 30 exécutions
./research/measures/measure.sh --runs 50 01 09    # autres cibles, autre nombre d'exécutions
cd research/async && go test -run '^$' -bench . -benchmem -count 5 ./...
```
