import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { cx } from "@/utils/cx";

export type ToastVariant = "success" | "error" | "neutral";

type ToastItem = { id: string; message: string; variant: ToastVariant };

type ToastContextValue = {
    push: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 4200;

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const baseId = useId();
    const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const push = useCallback(
        (message: string, variant: ToastVariant = "neutral") => {
            const id = `${baseId}-${Date.now()}`;
            setItems((prev) => [...prev, { id, message, variant }]);
            const timerId = setTimeout(() => {
                dismissTimersRef.current.delete(id);
                setItems((prev) => prev.filter((item) => item.id !== id));
            }, TOAST_DURATION_MS);
            dismissTimersRef.current.set(id, timerId);
        },
        [baseId],
    );

    useEffect(() => {
        const timers = dismissTimersRef.current;
        return () => {
            timers.forEach((tid) => clearTimeout(tid));
            timers.clear();
        };
    }, []);

    const value = useMemo(() => ({ push }), [push]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2 p-0 sm:bottom-6 sm:right-6"
                aria-live="polite"
                aria-relevant="additions"
            >
                {items.map((t) => (
                    <div
                        key={t.id}
                        role="status"
                        className={cx(
                            "pointer-events-auto animate-in fade-in slide-in-from-bottom-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg duration-200",
                            t.variant === "success" &&
                                "border-utility-success-200 bg-utility-success-50 text-utility-success-900 dark:border-utility-success-800 dark:bg-utility-success-950/60 dark:text-utility-success-100",
                            t.variant === "error" &&
                                "border-utility-error-200 bg-utility-error-50 text-utility-error-900 dark:border-utility-error-800 dark:bg-utility-error-950/60 dark:text-utility-error-100",
                            t.variant === "neutral" &&
                                "border-secondary bg-primary text-primary ring-1 ring-secondary/80",
                        )}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
