import { X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import type { DisplayAlert } from "@/components/risks/risks-shared";
import type { RiskAlertDedupEntry } from "@/lib/manager-risks-list-utils";
import { RiskAlertDuplicateRow } from "./RiskAlertCard";

type RiskAlertDedupDrawerProps = {
    entry: RiskAlertDedupEntry | null;
    onClose: () => void;
    onOpenAlert: (alert: DisplayAlert) => void;
};

export function RiskAlertDedupDrawer({ entry, onClose, onOpenAlert }: RiskAlertDedupDrawerProps) {
    useLockBodyScroll(Boolean(entry));

    if (!entry) return null;

    return (
        <>
            <button type="button" className="fixed inset-0 z-40 bg-slate-900/40" aria-label="Fermer" onClick={onClose} />
            <aside
                className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950"
                role="dialog"
                aria-label="Alertes similaires"
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {entry.count} alertes similaires
                        </h2>
                        <p className="text-xs text-slate-500">Lecture seule — même type, projet et sévérité.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Fermer"
                    >
                        <X className="size-4" aria-hidden />
                    </button>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                    {entry.alerts.map((alert) => (
                        <RiskAlertDuplicateRow key={alert.patchId} alert={alert} onOpenDrawer={onOpenAlert} />
                    ))}
                </div>
            </aside>
        </>
    );
}
