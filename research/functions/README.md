# Étude des fonctions, composition et curryfication (ADR-3, ADR-7)

Ce dossier explore la traduction de la composition de fonctions et des formes curryfiées :

- **`pipe-whenisright/`** : Prototype explorant l'enchaînement de `pipe` avec `whenIsRight(coalescing)` sans générer de closures non nécessaires sur le tas.

## Stratégie retenue

En Go, les fonctions génériques non instanciées ne peuvent pas être des valeurs de première classe. Notre stratégie inlinie les combinateurs connus (`whenIsRight`, `coalescing`, `to`) et traduit les compositions `pipe` en appels séquentiels directs.

Détails complets dans [ADR-3](../../docs/decisions/ADR-3-functions.md) et [ADR-7](../../docs/decisions/ADR-7-arrow-generic-values.md).
