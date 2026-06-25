import { useCallback, useEffect, useState } from "react";

export const MANAGER_DASHBOARD_DENSITY_KEY = "manager_dashboard_density";
export type ManagerDashboardDensity = "comfortable" | "compact";

function readStoredDensity(): ManagerDashboardDensity {
    try {
        const v = localStorage.getItem(MANAGER_DASHBOARD_DENSITY_KEY);
        return v === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

export function useManagerDashboardDensity() {
    const [density, setDensityState] = useState<ManagerDashboardDensity>(readStoredDensity);

    const setDensity = useCallback((next: ManagerDashboardDensity) => {
        setDensityState(next);
        try {
            localStorage.setItem(MANAGER_DASHBOARD_DENSITY_KEY, next);
        } catch {
            /* ignore */
        }
    }, []);

    const toggleDensity = useCallback(() => {
        setDensity(density === "comfortable" ? "compact" : "comfortable");
    }, [density, setDensity]);

    useEffect(() => {
        setDensityState(readStoredDensity());
    }, []);

    return { density, setDensity, toggleDensity };
}
