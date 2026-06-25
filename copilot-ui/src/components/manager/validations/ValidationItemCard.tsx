import { Link } from "react-router";
import { Button } from "@/components/base/buttons/button";
import type { ValidationDedupEntry, ValidationsDensity } from "@/lib/manager-validations-list-utils";
import { validationDetailHref } from "@/lib/manager-validations-list-utils";
import type { PendingValidation, ValidationCategory, ValidationType } from "@/services/validations.api";
import { cx } from "@/utils/cx";

const TYPE_LABELS: Record<ValidationType, string> = {
    rh_action: "Action RH",
    arbitrage: "Arbitrage",
    decision: "Décision",
};

const CATEGORY_LABELS: Record<ValidationCategory, string> = {
    conflict: "Conflit",
    missing_justification: "Justif manquante",
    standard: "Standard",
};

function PriorityBadge({ score }: { score: number }) {
    return (
        <span
            className={cx(
                "inline-flex min-w-[2rem] shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                score >= 90
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200"
                    : score >= 70
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
            )}
        >
            {score}
        </span>
    );
}

type ValidationItemCardProps = {
    entry: ValidationDedupEntry;
    density: ValidationsDensity;
    onShowDuplicates?: (entry: ValidationDedupEntry) => void;
};

export function ValidationItemCard({ entry, density, onShowDuplicates }: ValidationItemCardProps) {
    const { item, count } = entry;
    const compact = density === "compact";
    const detailHref = validationDetailHref(item);

    return (
        <article
            className={cx(
                "rounded-md border border-slate-200 bg-white transition hover:border-violet-300 dark:border-slate-700 dark:bg-slate-950",
                compact ? "px-3 py-2" : "px-4 py-3",
            )}
        >
            <div className="flex items-start gap-3">
                <PriorityBadge score={item.priority_score} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                            {TYPE_LABELS[item.type] ?? item.type_label}
                        </span>
                        <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
                            {CATEGORY_LABELS[item.category]}
                        </span>
                        {item.blocking ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                                Bloquant
                            </span>
                        ) : null}
                        {count > 1 ? (
                            <button
                                type="button"
                                onClick={() => onShowDuplicates?.(entry)}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                            >
                                × {count}
                            </button>
                        ) : null}
                    </div>
                    <p className={cx("mt-1 truncate font-medium text-slate-900 dark:text-slate-100", compact ? "text-sm" : "text-base")}>
                        {item.project_name || item.type_label}
                        {item.talent_name ? (
                            <span className="font-normal text-slate-500 dark:text-slate-400"> · {item.talent_name}</span>
                        ) : null}
                    </p>
                    {!compact && item.why ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{item.why}</p>
                    ) : null}
                </div>
                <Button type="button" color="primary" size="sm" href={detailHref} className="shrink-0">
                    Traiter
                </Button>
            </div>
        </article>
    );
}

export function ValidationDuplicateRow({ item }: { item: PendingValidation }) {
    const detailHref = validationDetailHref(item);
    return (
        <div className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.project_name || item.type_label}
                </p>
                {item.why ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.why}</p> : null}
                <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(item.created_at).toLocaleString("fr-FR")} · score {item.priority_score}
                </p>
            </div>
            <Link to={detailHref} className="shrink-0 text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
                Traiter →
            </Link>
        </div>
    );
}
