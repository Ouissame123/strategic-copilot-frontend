import { useQuery } from "@tanstack/react-query";
import { managerDashboardApi } from "../api/manager-dashboard.api";

export const useDashboard = (
    scope?: "mine" | "enterprise",
    options?: {
        enabled?: boolean;
    },
) =>
    useQuery({
        queryKey: ["dashboard", scope],
        queryFn: () => managerDashboardApi.get(scope).then((r) => r.data),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        refetchInterval: 5 * 60_000,
        enabled: options?.enabled ?? true,
    });
