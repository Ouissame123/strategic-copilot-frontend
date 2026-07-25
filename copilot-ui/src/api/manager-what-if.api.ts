export {
    getWhatIfErrorCode,
    getWhatIfErrorMessage,
    managerWhatIfApi,
    parseWhatIfValidationErrors,
    runWhatIfSimulation,
    sanitizeWhatIfModifications,
    WHAT_IF_PATH,
    type ManagerWhatIfResponse,
    type WhatIfBreakdown,
    type ManagerWhatIfModifications as WhatIfModifications,
} from "@/api/whatif.api";

export type {
    ScoreBreakdown,
    ViabilityDecision,
    WhatIfError,
    WhatIfFieldErrors,
    WhatIfRequest,
    WhatIfResponse,
} from "@/api/whatif.types";
