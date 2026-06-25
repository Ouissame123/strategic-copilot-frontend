import { useCallback, useEffect, useState } from "react";

export type RhWorkforceDensity = "comfortable" | "compact";

const STORAGE_KEY = "rh.workforce.density";

function readStored(): RhWorkforceDensity {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

export function useRhWorkforceDensity() {
    const [density, setDensityState] = useState<RhWorkforceDensity>(readStored);

    const setDensity = useCallback((next: RhWorkforceDensity) => {
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

    useEffect(() => {
        setDensityState(readStored());
    }, []);

    return { density, setDensity, toggleDensity };
}
