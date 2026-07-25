import { useCallback, useEffect, useRef, useState } from "react";
import { managerDashboardApi } from "@/api/manager-dashboard.api";
import type { ManagerDashboardV4Response } from "@/features/manager/types/dashboard-v4";

/** Données complètes GET `/webhook/manager/dashboard` (v4_factual). */
export type DashboardData = ManagerDashboardV4Response;

export type DashboardScope = "mine" | "enterprise";

export const managerDashboardQueryKey = (scope: DashboardScope = "mine") => ["manager", "dashboard", scope] as const;

const AUTO_REFRESH_MS = 60_000;

export type UseManagerDashboardResult = {
    data: DashboardData | null;
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

export function useManagerDashboard(scope: DashboardScope = "mine"): UseManagerDashboardResult {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasDataRef = useRef(false);
    const mountedRef = useRef(true);

    const fetchDashboard = useCallback(
        async (silent: boolean) => {
            if (silent && hasDataRef.current) {
                setRefreshing(true);
            } else if (!silent) {
                setLoading(true);
            }
            if (!silent) setError(null);

            try {
                const response = await managerDashboardApi.get(scope);
                if (!mountedRef.current) return;
                setData(response.data);
                hasDataRef.current = true;
                setError(null);
            } catch (err) {
                if (!mountedRef.current) return;
                const message = err instanceof Error ? err.message : "Impossible de charger le dashboard";
                if (!silent || !hasDataRef.current) setError(message);
            } finally {
                if (!mountedRef.current) return;
                setLoading(false);
                setRefreshing(false);
            }
        },
        [scope],
    );

    const refresh = useCallback(async () => {
        await fetchDashboard(true);
    }, [fetchDashboard]);

    useEffect(() => {
        mountedRef.current = true;
        hasDataRef.current = false;
        void fetchDashboard(false);
        const intervalId = window.setInterval(() => {
            void fetchDashboard(true);
        }, AUTO_REFRESH_MS);
        return () => {
            mountedRef.current = false;
            window.clearInterval(intervalId);
        };
    }, [fetchDashboard]);

    return { data, loading, refreshing, error, refresh };
}
