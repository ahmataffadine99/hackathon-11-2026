Machine : Apple M4 , macOS 15.6.1· go1.27.4 darwin/arm64 · Node v22.19.0 · boucle Python (hyperfine absent) · 30 exécutions par mesure · 2026-11-17

| Ex. | Node + tsx (ms) | Node, JS compilé (ms) | Go, binaire (ms) | RSS max Node (Mo) | RSS max Go (Mo) | « escapes to heap » (code utilisateur) | Remarque |
|---|---:|---:|---:|---:|---:|---:|---|
| 01 | 145.7 [142.8..196.5] | 20.3 [19.6..21.4] | 2.1 [2.0..4.3] | 37 | 3 | 0 | |
| 05 | 162.4 [161.1..173.1] | 20.0 [19.6..21.4] | 2.1 [2.0..2.4] | 37 | 3 | 6 | |
| 09 | 162.9 [161.5..212.3] | 21.2 [20.4..22.2] | 2.2 [2.0..2.8] | 37 | 3 | 11 | |
| 10 | – | – | – | – | – | – | transpilation en échec |

Temps : médiane [min..max] d'un processus complet (démarrage compris).
