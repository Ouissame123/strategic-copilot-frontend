import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "@/utils/cx";

type SideSheetProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    className?: string;
};

export function SideSheet({ open, onClose, title, children, className }: SideSheetProps) {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        const previous = document.activeElement as HTMLElement | null;
        panelRef.current?.focus();
        return () => {
            window.removeEventListener("keydown", onKey);
            previous?.focus?.();
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Fermer le panneau"
                onClick={onClose}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={cx(
                    "relative z-10 flex h-full w-full max-w-lg flex-col border-l border-[color:var(--ws-border)] bg-ws-card shadow-xl outline-none",
                    className,
                )}
            >
                <header className="flex items-center justify-between gap-3 border-b border-[color:var(--ws-border)] px-4 py-3">
                    <h2 id={titleId} className="text-sm font-semibold text-ws-primary">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-ws-muted hover:bg-ws-muted-surface hover:text-ws-primary"
                        aria-label="Fermer"
                    >
                        <X className="size-4" aria-hidden />
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
            </div>
        </div>
    );
}
