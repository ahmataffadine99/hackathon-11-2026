# Étude comparative des représentations d'Either (ADR-1)

Ce dossier contient les prototypes écrits à la main et les mesures comparant les différentes représentations possibles pour les valeurs `Either` en Go :

- **`a/` (Option A - retenue)** : `struct` par valeur `Either[V]`. Zéro allocation sur le tas, inlining maximal par le compilateur Go.
- **`aprime/` (Option A')** : `Either2[L, R]` par valeur, utilisé pour représenter les cas où les types de gauche et de droite diffèrent (notamment pour `group`, ADR-12).
- **`b/` (Option B)** : Représentation par `interface`. Alloue à chaque retour non inliné (5 à 8 fois plus lente sur 1000 valeurs).
- **`c/` (Option C)** : Représentation avec `Value any`. Alloue également et perd le bénéfice du typage statique Go.
- **`plain/`** : Représentation des valeurs nues mêlées à un Either (ADR-2).
- **`reference/`** : Scénario TypeScript de référence (`scenario.ts`) et sortie attendue (`expected.txt`).

## Résultats et mesures

Les mesures détaillées figurent dans [`results.txt`](results.txt). Pour reproduire :

```bash
cd research/either
./run.sh
./measure.sh
```

Détails complets et justifications architecturales dans [ADR-1](../../docs/decisions/ADR-1-either.md).
