import { useSyncExternalStore } from "react";

const screens = {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
} as const;

export type BreakpointSize = keyof typeof screens;

function getMql(size: BreakpointSize): MediaQueryList | null {
    if (typeof window === "undefined") return null;
    return window.matchMedia(`(min-width: ${screens[size]})`);
}

function subscribeBreakpoint(size: BreakpointSize, onStoreChange: () => void): () => void {
    const mql = getMql(size);
    if (!mql) return () => undefined;
    mql.addEventListener("change", onStoreChange);
    return () => mql.removeEventListener("change", onStoreChange);
}

/**
 * Checks whether a particular Tailwind CSS viewport size applies (via {@link useSyncExternalStore} + matchMedia).
 */
export const useBreakpoint = (size: BreakpointSize): boolean => {
    return useSyncExternalStore(
        (onStoreChange) => subscribeBreakpoint(size, onStoreChange),
        () => getMql(size)?.matches ?? true,
        () => true,
    );
};
