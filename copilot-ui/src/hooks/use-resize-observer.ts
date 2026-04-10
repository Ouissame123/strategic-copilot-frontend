import { useEffect, useSyncExternalStore } from "react";
import type { RefObject } from "@react-types/shared";

function hasResizeObserver() {
    return typeof window !== "undefined" && typeof window.ResizeObserver !== "undefined";
}

function subscribeWindowWidth(onStoreChange: () => void): () => void {
    if (typeof window === "undefined") return () => undefined;
    window.addEventListener("resize", onStoreChange);
    return () => window.removeEventListener("resize", onStoreChange);
}

function getWindowWidthSnapshot(): number {
    return typeof window !== "undefined" ? window.innerWidth : 0;
}

function getServerWindowWidth(): number {
    return 0;
}

type useResizeObserverOptionsType<T> = {
    ref: RefObject<T | undefined | null> | undefined;
    box?: ResizeObserverBoxOptions;
    onResize: () => void;
};

/**
 * Observes element size; uses ResizeObserver when available, otherwise derives updates from window width via {@link useSyncExternalStore}.
 */
export function useResizeObserver<T extends Element>(options: useResizeObserverOptionsType<T>) {
    const { ref, box, onResize } = options;

    const windowWidth = useSyncExternalStore(subscribeWindowWidth, getWindowWidthSnapshot, getServerWindowWidth);

    useEffect(() => {
        const element = ref?.current;
        if (!element) {
            return;
        }

        if (hasResizeObserver()) {
            const resizeObserverInstance = new window.ResizeObserver(() => {
                onResize();
            });
            resizeObserverInstance.observe(element, { box });

            return () => {
                resizeObserverInstance.unobserve(element);
                resizeObserverInstance.disconnect();
            };
        }
    }, [onResize, ref, box]);

    useEffect(() => {
        const element = ref?.current;
        if (!element || hasResizeObserver()) {
            return;
        }
        onResize();
    }, [onResize, ref, windowWidth]);
}
