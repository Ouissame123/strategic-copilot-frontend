import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

function getMediaQueryList(): MediaQueryList | null {
    if (typeof window === "undefined") return null;
    return window.matchMedia(QUERY);
}

function subscribePrefersDark(onStoreChange: () => void): () => void {
    const mql = getMediaQueryList();
    if (!mql) return () => undefined;
    mql.addEventListener("change", onStoreChange);
    return () => mql.removeEventListener("change", onStoreChange);
}

function getServerSnapshot(): boolean {
    return false;
}

/**
 * Subscribes to OS dark/light preference via {@link useSyncExternalStore} (recommended React pattern for matchMedia).
 */
export function usePrefersColorSchemeDark(): boolean {
    return useSyncExternalStore(
        subscribePrefersDark,
        () => getMediaQueryList()?.matches ?? false,
        getServerSnapshot,
    );
}
