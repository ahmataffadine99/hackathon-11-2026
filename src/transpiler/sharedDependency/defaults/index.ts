import * as DCommon from "@duplojs/lang/common";
import { nullShardDependency } from "./null";
import { undefinedShardDependency } from "./undefined";
import { inspectSharedDependency } from "./inspect";

export { nullShardDependency, undefinedShardDependency, inspectSharedDependency };

// inspectSharedDependency vit dans defaults/ par organisation (c'est la
// dépendance par défaut de formatage, au même titre que null/undefined), et
// est désormais incluse ci-dessous comme elles : `build.ts` fusionne défauts
// et dépendances enregistrées par ensemble (identité des objets memoïsés),
// donc un enregistrement explicite (print, either) ne la déclare plus deux
// fois (I1, D11/C10).
export const defaultSharedDependencies = DCommon.memo(() => [
	nullShardDependency.value,
	undefinedShardDependency.value,
	inspectSharedDependency.value,
]);
