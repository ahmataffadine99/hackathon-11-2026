import * as DCommon from "@duplojs/lang/common";
import { nullShardDependency } from "./null";
import { undefinedShardDependency } from "./undefined";
import { inspectSharedDependency } from "./inspect";

export { nullShardDependency, undefinedShardDependency, inspectSharedDependency };

// inspectSharedDependency vit dans defaults/ par organisation (c'est la
// dépendance par défaut de formatage, au même titre que null/undefined),
// mais n'est volontairement PAS ajoutée à la liste ci-dessous : null/
// undefined ne sont jamais référencés depuis l'extérieur de
// shard_dependencies (seulement par du code déjà présent dans ce fichier),
// alors que Print doit être appelable depuis le code transpilé. Le handler
// print l'enregistre donc via context.registerSharedDependency, exactement
// comme eitherSuccessDependency. Si elle figurait aussi ici, `build.ts`
// l'inclurait deux fois : une fois via cette liste (toujours fusionnée),
// une fois via l'enregistrement (DGenerator.concat ne déduplique pas entre
// les deux collections), ce qui redéclarerait tous ses symboles en Go.
export const defaultSharedDependencies = DCommon.memo(() => [
	nullShardDependency.value,
	undefinedShardDependency.value,
]);
