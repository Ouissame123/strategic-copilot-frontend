import { useQuery } from "@tanstack/react-query";
import { managerDashboardApi } from "@/api/manager-dashboard.api";
import type { DashboardAnalyst, DashboardMatchmaker } from "@/types/api.types";
import type { DashboardResponse } from "@/features/manager/types/dashboard";

export type ManagerDashboardData = DashboardResponse & {
    /** Rétrocompat — sections legacy (MatchmakerSection, AnalystSection). */
    matchmaker?: DashboardMatchmaker;
    analyst?: DashboardAnalyst;
};

function withLegacyAgentFields(data: DashboardResponse): ManagerDashboardData {
    const { matchmaker, analyst } = data.agents;
    const { active: _mmActive, ...matchmakerLegacy } = matchmaker;
    const { active: _anActive, mobility_breakdown: _mobility, ...analystLegacy } = analyst;
    return {
        ...data,
        matchmaker: matchmakerLegacy,
        analyst: analystLegacy,
    };
}

export function useManagerDashboard(scope: "mine" | "enterprise" = "mine", options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ["manager", "dashboard", scope],
        queryFn: () => managerDashboardApi.get(scope).then((response) => withLegacyAgentFields(response.data)),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        enabled: options?.enabled ?? true,
    });
}
