import { useCallback, useState } from "react";

const STORAGE_KEY = "rh.accounts.density";

export type RhAccountsDensity = "comfortable" | "compact";

function readStored(): RhAccountsDensity {
    try {
        return localStorage.getItem(STORAGE_KEY) === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

export function useRhAccountsDensity() {
    const [density, setDensityState] = useState<RhAccountsDensity>(readStored);

    const setDensity = useCallback((next: RhAccountsDensity) => {
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
