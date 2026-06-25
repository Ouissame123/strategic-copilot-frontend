import { useCallback, useEffect, useState } from "react";

export const TALENT_DASHBOARD_DENSITY_KEY = "talent_dashboard_density";
export type TalentDashboardDensity = "comfortable" | "compact";

function readStoredDensity(): TalentDashboardDensity {
    try {
        const v = localStorage.getItem(TALENT_DASHBOARD_DENSITY_KEY);
        return v === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

export function useTalentDashboardDensity() {
    const [density, setDensityState] = useState<TalentDashboardDensity>(readStoredDensity);

    const setDensity = useCallback((next: TalentDashboardDensity) => {
        setDensityState(next);
        try {
            localStorage.setItem(TALENT_DASHBOARD_DENSITY_KEY, next);
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
