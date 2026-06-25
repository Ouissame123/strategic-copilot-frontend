import { useWhatIfSimulation } from "@/hooks/use-whatif-simulation";
import type { WhatIfModifications } from "@/api/whatif.types";

/** Mutation What-If scoping sur un `projectId` fixe. */
export function useSimulateWhatIf(projectId: string) {
    const mutation = useWhatIfSimulation();
    const pid = projectId.trim();

    return {
        ...mutation,
        mutate: (modifications: WhatIfModifications) =>
            mutation.mutate({
                project_id: pid,
                modifications: {
                    allocation_pct: modifications.allocation_pct,
                    added_talent_id: modifications.added_talent_id ?? null,
                    training_skill_id: modifications.training_skill_id ?? null,
                },
            }),
        mutateAsync: (modifications: WhatIfModifications) =>
            mutation.mutateAsync({
                project_id: pid,
                modifications: {
                    allocation_pct: modifications.allocation_pct,
                    added_talent_id: modifications.added_talent_id ?? null,
                    training_skill_id: modifications.training_skill_id ?? null,
                },
            }),
    };
}
