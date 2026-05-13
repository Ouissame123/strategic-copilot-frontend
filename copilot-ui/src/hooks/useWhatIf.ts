import { useMutation } from "@tanstack/react-query";
import { orchestratorApi } from "@/api/orchestrator.api";
import type { WhatIfMutationVariables, WhatIfResult } from "@/types/api.types";

export const useWhatIf = () =>
    useMutation<WhatIfResult, unknown, WhatIfMutationVariables>({
        mutationFn: ({ projectId, modifications }) =>
            orchestratorApi.whatIf(projectId, modifications).then((r): WhatIfResult => r.data),
    });
