import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { managerTeamApi, MANAGER_TEAM_TALENT_UUID_RE, normalizeManagerTeamRouteTalentId } from "../api/manager-team.api";
import { invalidateManagerRiskQueries } from "./use-manager-risk-data";

export const useTeam = (params?: { scope?: "mine" | "enterprise"; search?: string; contract_ending?: boolean; limit?: number }) =>
    useQuery({
        queryKey: ["team", params],
        queryFn: () => managerTeamApi.list(params).then((r) => r.data),
    });

export const useTalentDetail = (talentId: string) => {
    const id = normalizeManagerTeamRouteTalentId(talentId);
    return useQuery({
        queryKey: ["talent-detail", id],
        queryFn: () => managerTeamApi.detail(id).then((r) => r.data),
        enabled: Boolean(id) && MANAGER_TEAM_TALENT_UUID_RE.test(id),
        retry: false,
        refetchOnWindowFocus: false,
    });
};

export const useWatchdogScan = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: { talent_id?: string; project_id?: string; use_ai?: boolean }) =>
            managerTeamApi.watchdogScan(body).then((r) => r.data),
        onSuccess: async () => {
            await invalidateManagerRiskQueries(qc);
        },
    });
};
