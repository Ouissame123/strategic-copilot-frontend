import { Sparkles } from "lucide-react";
import { getAlertDescription, getAlertTitle } from "@/lib/risk-alert-display";
import { cx } from "@/utils/cx";
import type { DisplayAlert } from "./risks-shared";
import { priorityQueueRationale, severityBadgeClass } from "./risks-shared";

type RiskPriorityListProps = {
    items: DisplayAlert[];
    onTreat: (alert: DisplayAlert) => void;
};

export function RiskPriorityList({ items, onTreat }: RiskPriorityListProps) {
    const shown = items.slice(0, 8);
    const rationale = priorityQueueRationale(shown);

    return (
        <section
            className={cx(
                "rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm sm:p-5",
                "dark:border-emerald-900/50 dark:from-emerald-950/20 dark:to-teal-950/10",
            )}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Priorité IA</h2>
                </div>
                <span className="rounded-full border border-emerald-300/80 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                    {shown.length} élément{shown.length !== 1 ? "s" : ""}
                </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{rationale}</p>
            <ul className="mt-4 space-y-2">
                {shown.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-emerald-200/80 bg-white/50 px-4 py-8 text-center text-sm text-slate-500 dark:border-emerald-900 dark:bg-slate-900/40">
                        Aucune alerte prioritaire.
                    </li>
                ) : (
                    shown.map((a, idx) => (
                        <li
                            key={`${a.patchId}-pq-${idx}`}
                            className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-white/90 p-3 shadow-sm transition hover:shadow-md dark:border-emerald-900/40 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                                        {idx + 1}
                                    </span>
                                    <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{a.projectName}</span>
                                    <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", severityBadgeClass(a.severity))}>
                                        {a.severity}
                                    </span>
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-800 dark:text-slate-200">{getAlertTitle(a)}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{getAlertDescription(a)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onTreat(a)}
                                className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 hover:shadow-md"
                            >
                                Traiter
                            </button>
                        </li>
                    ))
                )}
            </ul>
        </section>
    );
}
