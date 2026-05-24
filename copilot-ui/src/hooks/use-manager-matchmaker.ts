import { useQuery, useQueryClient } from "@tanstack/react-query";
import { managerProjectsApi } from "@/api/manager-projects.api";
import { runProjectTalentMatching, mapManagerMatchmakerApiError } from "@/api/manager-matchmaker.api";
import { buildManagerMatchmakerDashboard } from "@/lib/manager-matchmaker-normalize";
import type { ManagerMatchmakerDashboard } from "@/types/manager-matchmaker.types";
import { getApiAuthToken } from "@/utils/apiClient";

const MANAGER_MATCHMAKER_PROJECTS_LIMIT = 500;

export function managerMatchmakerQueryKey(managerId: string, enterpriseId: string) {
    return ["manager-matchmaker", managerId.trim(), enterpriseId.trim()] as const;
}

export function useManagerMatchmaker(managerId: string | undefined, enterpriseId: string | undefined) {
    const qc = useQueryClient();
    const enabled = Boolean(managerId?.trim() && enterpriseId?.trim());
    const queryKey = enabled
        ? managerMatchmakerQueryKey(managerId!, enterpriseId!)
        : (["manager-matchmaker", "disabled"] as const);

    const query = useQuery({
        queryKey,
        queryFn: async ({ signal }): Promise<ManagerMatchmakerDashboard> => {
            const mid = managerId!.trim();
            const eid = enterpriseId!.trim();
            const token = getApiAuthToken();

            const listRes = await managerProjectsApi.list({ limit: MANAGER_MATCHMAKER_PROJECTS_LIMIT });
            const items = listRes.data?.items ?? [];
            const projects = items
                .map((p) => ({
                    id: String(p.id ?? "").trim(),
                    name: String(p.name ?? "").trim() || "—",
                }))
                .filter((p) => p.id.length > 0);

            if (projects.length === 0) {
                return buildManagerMatchmakerDashboard([], []);
            }

            const settled = await Promise.allSettled(
                projects.map((p) =>
                    runProjectTalentMatching(p.id, eid, mid, {
                        signal,
                        token,
                        projectName: p.name,
                    }),
                ),
            );

            const results = [];
            const failed: string[] = [];
            for (let i = 0; i < settled.length; i++) {
                const outcome = settled[i];
                const pid = projects[i].id;
                if (outcome.status === "fulfilled") {
                    results.push(outcome.value);
                } else {
                    failed.push(pid);
                }
            }

            if (results.length === 0) {
                const firstErr = settled.find((s) => s.status === "rejected") as PromiseRejectedResult | undefined;
                throw firstErr?.reason ?? new Error("Aucun projet n’a pu être analysé par Matchmaker.");
            }

            return buildManagerMatchmakerDashboard(results, failed);
        },
        enabled,
        staleTime: 120_000,
        retry: false,
    });

    const refetchAll = async () => {
        if (!enabled) return;
        await qc.invalidateQueries({ queryKey: managerMatchmakerQueryKey(managerId!, enterpriseId!) });
    };

    return {
        matchmaker: query.data,
        isLoading: query.isPending,
        isError: query.isError,
        errorMessage: query.isError ? mapManagerMatchmakerApiError(query.error) : null,
        refetchAll,
        hasContext: enabled,
    };
}

export { mapManagerMatchmakerApiError };
