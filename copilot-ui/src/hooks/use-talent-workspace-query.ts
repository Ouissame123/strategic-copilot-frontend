import { useQuery } from "@tanstack/react-query";
import { fetchTalentWorkspace } from "@/api/talent-workspace.api";
import { queryKeys } from "@/lib/query-keys";

type Opts = {
    /** Rafraîchissement automatique (ex. page notifications). */
    refetchInterval?: number;
};

/** Données agrégées talent (GET /api/copilot/talent ou env). */
export function useTalentWorkspaceQuery(options?: Opts) {
    return useQuery({
        queryKey: queryKeys.talent.workspace(),
        queryFn: ({ signal }) => fetchTalentWorkspace({ signal }),
        refetchInterval: options?.refetchInterval,
    });
}
