import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { cx } from "@/utils/cx";

export type CopilotDrawerProps = {
    open: boolean;
    onClose: () => void;
    projectName: string;
    returnFocusRef?: RefObject<HTMLButtonElement | null>;
    children: ReactNode;
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
        container.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

export function CopilotDrawer({ open, onClose, projectName, returnFocusRef, children }: CopilotDrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useLockBodyScroll(open);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                handleClose();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, handleClose]);

    useEffect(() => {
        if (!open) return;

        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const frame = requestAnimationFrame(() => {
            const textarea = drawerRef.current?.querySelector("textarea");
            if (textarea instanceof HTMLTextAreaElement) {
                textarea.focus();
                return;
            }
            closeButtonRef.current?.focus();
        });

        const container = drawerRef.current;
        if (!container) {
            return () => cancelAnimationFrame(frame);
        }

        const onTabKey = (e: KeyboardEvent) => {
            if (e.key !== "Tab") return;
            const focusable = getFocusableElements(container);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (e.shiftKey) {
                if (active === first || !container.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        container.addEventListener("keydown", onTabKey);

        return () => {
            cancelAnimationFrame(frame);
            container.removeEventListener("keydown", onTabKey);
            const restore = returnFocusRef?.current ?? previousFocusRef.current;
            restore?.focus();
        };
    }, [open, returnFocusRef]);

    return (
        <div
            className={cx("fixed inset-0 z-40", open ? "pointer-events-auto" : "pointer-events-none")}
            aria-hidden={!open}
        >
            <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={handleClose}
                className={cx(
                    "absolute inset-0 bg-black/40 transition-opacity ease-out",
                    open ? "opacity-100 duration-[250ms]" : "opacity-0 duration-200",
                )}
            />

            <div
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="copilot-drawer-title"
                aria-describedby="copilot-drawer-desc"
                className={cx(
                    "fixed z-50 flex flex-col bg-white shadow-2xl transition-transform ease-out dark:bg-primary",
                    "inset-x-0 bottom-0 h-[90dvh] max-h-[90dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]",
                    open ? "translate-y-0 duration-[250ms]" : "translate-y-full duration-200",
                    "lg:inset-y-0 lg:right-0 lg:left-auto lg:top-0 lg:h-dvh lg:max-h-dvh lg:w-[480px] lg:max-w-[100vw] lg:rounded-none lg:pb-0 lg:shadow-[-8px_0_32px_-8px_rgba(0,0,0,0.18)]",
                    open ? "lg:translate-x-0 lg:translate-y-0" : "lg:translate-x-full lg:translate-y-0",
                )}
            >
                <div
                    className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 lg:hidden"
                    aria-hidden
                />

                <header className="shrink-0 border-b border-slate-200 px-4 py-4 dark:border-secondary sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h2 id="copilot-drawer-title" className="text-base font-semibold text-slate-900 dark:text-fg-primary">
                                Copilot Projet
                            </h2>
                            <p id="copilot-drawer-desc" className="mt-0.5 truncate text-sm text-slate-500 dark:text-fg-secondary">
                                {projectName}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <span className="hidden rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-700 sm:inline-flex dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                                AI Powered
                            </span>
                            <button
                                ref={closeButtonRef}
                                type="button"
                                onClick={handleClose}
                                aria-label="Fermer le copilote"
                                className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-all duration-150 ease-out hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:hover:bg-secondary_subtle"
                            >
                                <X className="size-4" aria-hidden />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
