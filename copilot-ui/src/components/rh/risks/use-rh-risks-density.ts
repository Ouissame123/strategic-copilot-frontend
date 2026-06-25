import { useCallback, useState } from "react";

const STORAGE_KEY = "rh.risks.density";

export type RhRisksDensity = "comfortable" | "compact";

function readStored(): RhRisksDensity {
    try {
        return localStorage.getItem(STORAGE_KEY) === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

export function useRhRisksDensity() {
    const [density, setDensityState] = useState<RhRisksDensity>(readStored);

    const setDensity = useCallback((next: RhRisksDensity) => {
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
