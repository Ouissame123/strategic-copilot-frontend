/** @deprecated Import depuis `@/api/whatif.api` et `@/api/whatif.types`. */
export {
    getWhatIfErrorCode,
    managerWhatIfApi,
    runWhatIfSimulation,
    sanitizeWhatIfModifications,
    WHAT_IF_PATH,
    type ManagerWhatIfResponse,
    type WhatIfBreakdown,
    type ManagerWhatIfModifications as WhatIfModifications,
} from "@/api/whatif.api";

export type { ScoreBreakdown, ViabilityDecision, WhatIfError, WhatIfRequest, WhatIfResponse } from "@/api/whatif.types";
