import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTalentAlerts } from "@/components/talent/talent-detail-shared";
import { getManagerTeamTalentDetailUrl } from "@/config/manager-team-api.config";
import { httpClient } from "@/lib/http-client";
import {
    managerTeamApi,
    MANAGER_TEAM_TALENT_UUID_RE,
    normalizeManagerTeamRouteTalentId,
    normalizeTalentDetail,
} from "../api/manager-team.api";
import { invalidateManagerRiskQueries } from "./use-manager-risk-data";

function injectAlertsIntoDetailPayload(raw: unknown, alerts: unknown[]): unknown {
    if (!raw || typeof raw !== "object") return raw;
    const root = { ...(raw as Record<string, unknown>) };
    if (alerts.length) root.active_alerts = alerts;
    const nested = root.data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        root.data = {
            ...(nested as Record<string, unknown>),
            active_alerts: alerts.length ? alerts : (nested as Record<string, unknown>).active_alerts,
        };
    }
    return root;
}

export const useTeam = (params?: { scope?: "mine" | "enterprise"; search?: string; contract_ending?: boolean; limit?: number }) =>
    useQuery({
        queryKey: ["team", params],
        queryFn: () => managerTeamApi.list(params).then((r) => r.data),
    });

export const useTalentDetail = (talentId: string) => {
    const id = normalizeManagerTeamRouteTalentId(talentId);
    return useQuery({
        queryKey: ["talent-detail", id],
        queryFn: async () => {
            const url = getManagerTeamTalentDetailUrl(encodeURIComponent(id));
            const { data: raw } = await httpClient.get<unknown>(url);
            const alerts = getTalentAlerts(raw);
            return normalizeTalentDetail(injectAlertsIntoDetailPayload(raw, alerts));
        },
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
