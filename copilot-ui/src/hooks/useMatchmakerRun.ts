/** @deprecated Préférer `useMatchmakerQuery` — cache 5 min au lieu d'une mutation à chaque ouverture. */
export {
    MATCHMAKER_KEYS,
    projectMatchmakerQueryKey,
    useMatchmakerQuery,
    type MatchmakerCachedResult,
} from "@/hooks/useMatchmakerQuery";

import { useMatchmakerQuery } from "@/hooks/useMatchmakerQuery";

/** @deprecated Préférer `useMatchmakerQuery(projectId, projectName, open)`. */
export function useMatchmakerRun(projectId: string, projectName = "") {
    return useMatchmakerQuery(projectId, projectName, true);
}

/** @deprecated Préférer `useMatchmakerQuery`. */
export const useMatchmakerForProject = useMatchmakerRun;
