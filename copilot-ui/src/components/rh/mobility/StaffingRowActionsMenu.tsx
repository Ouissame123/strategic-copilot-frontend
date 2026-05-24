import { useEffect, useRef, useState } from "react";
import { ArrowRightLeft, MoreHorizontal, Trash2 } from "lucide-react";
import { RH_BTN_SECONDARY, RH_TEXT_PRIMARY } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type StaffingRowActionsMenuProps = {
    onReassign?: () => void;
    onRemove?: () => void;
};

export function StaffingRowActionsMenu({ onReassign, onRemove }: StaffingRowActionsMenuProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cx(
                    "rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200",
                    open && "bg-slate-100 text-slate-700 dark:bg-slate-800",
                )}
                aria-label="Actions secondaires"
                aria-expanded={open}
                aria-haspopup="menu"
            >
                <MoreHorizontal size={16} aria-hidden />
            </button>
            {open ? (
                <div
                    role="menu"
                    className="absolute right-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                >
                    {onReassign ? (
                        <button
                            type="button"
                            role="menuitem"
                            className={cx(
                                "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium",
                                RH_TEXT_PRIMARY,
                                "hover:bg-slate-50 dark:hover:bg-slate-800",
                            )}
                            onClick={() => {
                                setOpen(false);
                                onReassign();
                            }}
                        >
                            <ArrowRightLeft size={14} className="text-violet-600" aria-hidden />
                            Réaffecter vers un autre manager
                        </button>
                    ) : null}
                    {onRemove ? (
                        <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                            onClick={() => {
                                setOpen(false);
                                onRemove();
                            }}
                        >
                            <Trash2 size={14} aria-hidden />
                            Retirer l&apos;affectation
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
