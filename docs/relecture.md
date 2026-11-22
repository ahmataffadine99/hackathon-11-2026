# Relecture croisée (Sprint 6)

> Règle ([PLAN §0.8](PLAN_HACKATHON.md#08-décisions-pour-le-sprint-6-consolidation-et-livraison)) : chaque fiche et chaque ADR est relu par une autre personne que son auteur. On contrôle la cohérence des chiffres avec `docs/measures.md`, `research/*/results.txt` et la sortie réelle de `check-all`, les étiquettes (« [observé] » ou « [à vérifier] » uniquement), les extraits de Go après D8 et l'état des exercices.
> Colonne « Accepté » : **oui** si l'auteur ou l'équipe a validé la correction, **non** si la décision n'est pas prise. Colonne « Corrigé » : le commit qui applique la correction.

## Sections des relecteurs

Les branches `sprint6/review-p2`, `sprint6/review-p3` et `sprint6/review-p4` n'existent ni en local ni sur `origin` au 18/11 (`git branch -a`). Leurs sections (fiches 00 à 04 et ADR-1, 2, 3 et 7 pour P2 ; fiches 05 à 07 et ADR-8, 9 et 10 pour P3 ; fiches 08 et 09 et ADR-11 et 12 pour P4) ne sont donc pas dans ce fichier : elles s'ajouteront ci-dessous, sous cet en-tête unique, au merge de chaque branche.

## Contrôles d'intégration (P1)

Faits sur `main` `f0a10cf`, dans une copie jetable (`git worktree`).

| # | Document | Constat | Accepté | Corrigé |
|---|---|---|---|---|
| R1 | ADR-5 | 5 étiquettes « vérifié » au lieu de « [observé] » | oui (règle §0.8) | `b3e2d7b` |
| R2 | ADR-1, 2, 3, 7, 8, 9 | étiquette « hypothèse » au lieu de « [à vérifier] » (légendes, ADR-1 §8, ADR-3 §6) | oui (règle §0.8) | `b3e2d7b` |
| R3 | ADR-1 §1 | lien mort vers `either/success/sharedDependency.ts`, remplacé depuis par `either/sharedDependency.ts` | oui | `bf196ea` |
| R4 | Fiches 07 et 08, `setup.md` | extraits de Go antérieurs à D8 : noms de package qui encodent un chemin absolu personnel ; fiche 08 : littéral de slice d'avant D13 | oui (extraits recopiés du Go produit par `main`, vérifiés ligne à ligne) | `3b884e6` |
| R5 | Fiche 10 | annonçait l'intégration Go comme non faite et le Go produit comme « pas encore observé », alors que `check.sh 10` est ✅ | oui | `4afb38f` |
| R6 | README, synthèse, soutenance | chiffres périmés (10/11, 37/38, 39/43, « en cours de merge ») ; plan B décrit hors du dépôt | oui (repris de `check-all` sur `f0a10cf`) | voir le commit de ce fichier |
| R7 | Synthèse, soutenance, mesures | « 8 à 14 fois » (synthèse) contre « 5 à 8 fois » (mesures) : **pas d'incohérence**, ce sont deux scénarios de l'ADR-1 §4 (appel non inliné ; `Map1000`) | oui | sans objet |

## Décisions de livraison

| # | Sujet | Décision | Accepté | Corrigé |
|---|---|---|---|---|
| D-a | Plan non versionné, 24 renvois « PLAN §… » (22 fichiers) | Versionner le plan dans [`docs/PLAN_HACKATHON.md`](PLAN_HACKATHON.md), liens corrigés ; les renvois restent valides sans toucher à `src/`. `PROMPTS_EQUIPE.md` n'est cité nulle part et n'existe dans aucune copie de travail : rien à versionner. Contrôle des liens relatifs hors blocs de code : 0 lien mort. | **non** : choix de P1, à confirmer par l'équipe (réversible : retirer le fichier et les renvois) | `7a16ddf` |
| D-b | ADR-11 : raison de réévaluer `[N]T` | Reformulation proposée : remplacer « à réévaluer si l'interopérabilité Go devient prioritaire » par « à réévaluer pour son coût mesuré : `[3]float64` environ 5,3 fois plus rapide, 0 allocation contre 1000 ». | **non** : réponse de l'auteur non reçue ; texte de l'ADR-11 inchangé | – |
| D-c | ADR-1 : temps instables (jusqu'à +40 %) | Assumer sans relancer : les temps absolus sont indicatifs, seules les allocations et les ratios d'au moins 5 fois sont cités. Relancer changerait tous les chiffres repris dans la synthèse et la soutenance. | oui (P1, décision prévue par la mission) | `bf196ea` |
