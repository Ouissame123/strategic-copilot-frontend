import { useCallback, useState } from "react";

const STORAGE_KEY = "rh.manager-requests.density";

export type ManagerRequestsDensity = "comfortable" | "compact";

function readStored(): ManagerRequestsDensity {
    try {
        return localStorage.getItem(STORAGE_KEY) === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

export function useManagerRequestsDensity() {
    const [density, setDensityState] = useState<ManagerRequestsDensity>(readStored);

    const setDensity = useCallback((next: ManagerRequestsDensity) => {
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
