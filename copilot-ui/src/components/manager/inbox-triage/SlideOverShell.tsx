import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "@/utils/cx";

type SlideOverShellProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    titleId?: string;
    headerAside?: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
    className?: string;
};

export function SlideOverShell({
    open,
    onClose,
    title,
    titleId = "slide-over-title",
    headerAside,
    footer,
    children,
    className,
}: SlideOverShellProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px] focus-visible:outline-none"
                aria-label="Fermer"
                onClick={onClose}
            />
            <aside
                className={cx(
                    "fixed top-0 right-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-secondary bg-primary shadow-2xl",
                    className,
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary px-4 py-3">
                    <div className="min-w-0 flex-1">
                        {headerAside}
                        <h2 id={titleId} className="mt-1 line-clamp-2 text-base font-semibold text-primary">
                            {title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-tertiary transition hover:bg-secondary_subtle hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
                        aria-label="Fermer"
                    >
                        <X className="size-5" />
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
                {footer ? <footer className="shrink-0 border-t border-secondary px-4 py-3">{footer}</footer> : null}
            </aside>
        </>
    );
}
