# Problématique 02 : Unions et formes nues (Plain)

## Problématique
Comment traduire un appel comme `whenIsRight` qui reçoit une fonction de rappel (`coalescing`) et l'applique uniquement en cas de succès, tout en gérant les unions pouvant mélanger des variantes `Either` et des valeurs nues non-Either (`Fail | [number]`) ?

## Démarche et réflexions
Dans [ADR-2](../../docs/decisions/ADR-2-unions.md), nous avons analysé le comportement du checker TypeScript sur les unions. Deux principes ont été adoptés :
1. **Ordre canonique et dédoublonnage** : Chaque membre de l'union TypeScript est traduit en type Go, puis comparé et ordonné par son rendu Go pour éviter les doublons (`string | number` == `number | string`).
2. **Encapsulation `Plain`** : Pour éviter d'introduire une interface vide `any`, une valeur nue mélangée à un `Either` est enveloppée dans une cinquième variante (`KindPlain`) du même struct `Either[V]`.

## Solution
Les combinateurs purs comme `whenIsRight` sont inlinés par le transpileur : si l'entrée est un succès, la transformation est appliquée directement sur `Value` ; sinon, l'échec est propagé inchangé.

## Limites
Cette approche s'applique aux unions dont les membres partagent une représentation commune ou encapsulable en Go. Les unions d'objets aux structures disparates demandent des types somme plus lourds.
