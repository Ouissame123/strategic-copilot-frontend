import { useCallback, useState } from "react";

const STORAGE_KEY = "rh.budget.density";

export type RhBudgetDensity = "comfortable" | "compact";

function readStored(): RhBudgetDensity {
    try {
        return localStorage.getItem(STORAGE_KEY) === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

export function useRhBudgetDensity() {
    const [density, setDensityState] = useState<RhBudgetDensity>(readStored);

    const setDensity = useCallback((next: RhBudgetDensity) => {
        setDensityState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* ignore */
        }
    }, []);

    const toggleDensity = useCallback(() => {
        setDensity(density === "comfortable" ? "compact" : "comfortable");
    }, [density, setDensity]);

    return { density, setDensity, toggleDensity };
}
