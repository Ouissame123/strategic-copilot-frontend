import { useEffect } from "react";

/** Bloque le scroll du document tant que `locked` est vrai (drawer / modale plein écran). */
export function useLockBodyScroll(locked: boolean): void {
    useEffect(() => {
        if (!locked) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [locked]);
}
