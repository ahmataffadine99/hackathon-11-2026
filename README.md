# Hackathon DuploJS

## Membres de l'équipe

Renseignez le nom, le prénom et la classe de chaque membre. Les équipes sont composées de trois à quatre personnes.

| | Nom | Prénom | Classe |
|---|---|---|---|
| 1 | À compléter | À compléter | À compléter |
| 2 | À compléter | À compléter | À compléter |
| 3 | À compléter | À compléter | À compléter |
| 4 | À compléter | À compléter | À compléter |

## Objectif

Étudier les stratégies permettant de transpiler du DuploJS vers Go afin d'obtenir de meilleures performances tout en préservant le comportement d'origine.

Le projet `projects/00` présente une première solution et sert de point de départ. Les projets `projects/01` à `projects/10` introduisent différentes problématiques liées à la transpilation.

**Ces projets ne sont pas des exercices à résoudre.**

Chaque projet constitue uniquement un point d'entrée vers une problématique beaucoup plus vaste et complexe. Les cas présentés ne sont ni exhaustifs ni représentatifs de toutes les situations possibles.

Il est indispensable d'imaginer et d'étudier des variantes, des cas limites et des situations plus complexes pour comprendre l'ensemble des enjeux.

**Réussir à transpiler un projet donné ne signifie pas avoir résolu la problématique qu'il introduit.**

## Démarche attendue

### Étudier avant d'implémenter

Le travail attendu est avant tout un travail d'étude et de réflexion.

Avant toute implémentation, il est nécessaire de comprendre précisément la problématique, d'identifier les différences de fonctionnement entre TypeScript/JavaScript et Go, puis d'explorer différentes variantes pour mesurer l'étendue réelle du problème.

Plusieurs stratégies doivent être envisagées et comparées en tenant compte de leurs avantages, de leurs limites et de leurs conséquences sur les performances, la mémoire et la généricité des solutions.

L'implémentation doit découler de cette réflexion, et non l'inverse.

### Privilégier le raisonnement à la production

**Ce qui nous intéresse en priorité n'est pas le code généré ni le nombre de projets correctement transpilés, mais les réflexions qui ont conduit aux solutions proposées.**

Ces réflexions doivent nous permettre de comprendre pourquoi une stratégie a été retenue, dans quelles situations elle fonctionne, quelles sont ses limites et surtout si elle peut être généralisée à d'autres cas.

Une implémentation qui fonctionne sur un exemple particulier n'apporte aucune garantie sur sa capacité à répondre à la problématique dans son ensemble.

Le code sert avant tout à illustrer, expérimenter et vérifier les hypothèses issues de l'étude.

L'objectif est d'identifier des stratégies de transpilation suffisamment générales et composables pour répondre à des problématiques réelles, au-delà des exemples fournis.

Les assistants et agents IA sont autorisés. Vous pouvez créer un skill pour encadrer vos exemples et guider votre implémentation.

## Documentation des problématiques

Pour chaque problématique étudiée, documentez le problème identifié, les différentes pistes envisagées, les variantes explorées ainsi que les raisons qui ont conduit à retenir une stratégie plutôt qu'une autre.

Les exemples utilisés doivent permettre d'illustrer le raisonnement et de vérifier les hypothèses. Les limites connues, les situations non couvertes et les éventuelles difficultés rencontrées doivent également être documentées.

**Une problématique n'a pas nécessairement besoin d'être résolue.** Une étude approfondie mettant en évidence des difficultés, des limites ou des pistes intéressantes constitue déjà un résultat pertinent.

Il est important de distinguer les hypothèses des résultats effectivement vérifiés.

## Reproduction et rendu

Créez un dossier `rendu/` à la racine du dépôt. Il doit contenir **un sous-dossier par problématique identifiée et traitée**, y compris lorsqu'une solution complète n'a pas été trouvée.

Chaque sous-dossier doit contenir un exemple de code minimal, sans bruit, en TypeScript et en Go, pour illustrer concrètement ce que pourrait donner la stratégie envisagée. Il s'agit d'exemples retravaillés pour la démonstration, **pas du code produit automatiquement par le transpileur**.

Ajoutez un petit `README.md` qui présente succinctement la problématique, la démarche et la solution envisagée, ainsi que ses limites. L'objectif est de pouvoir comprendre rapidement le raisonnement et d'apprécier si la stratégie est généralisable.

Indiquez les commandes nécessaires à l'installation et à la reproduction des résultats observés.

Faites un fork du boilerplate et ouvrez une pull request vers le dépôt d'origine.

Remettez une archive ZIP correspondant au travail présenté dans la pull request au moment de la soutenance.
