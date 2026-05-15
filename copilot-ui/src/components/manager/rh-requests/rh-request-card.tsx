import { motion } from "motion/react";
import { Briefcase, CalendarDays, GraduationCap, LayoutGrid, UserPlus, Zap } from "lucide-react";
import type { KpiBucket, PriorityFilter } from "./rh-requests-utils";
import { REQUEST_TYPE_ORDER, priorityLabel, priorityPillClass, statusLabel, statusPillClass } from "./rh-requests-utils";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import type { RhActionRequestType } from "@/api/rh-actions.api";

function TypeIcon({ type }: { type: string }) {
    const rt = String(type ?? "").trim() as RhActionRequestType;
    const common = "size-5 shrink-0";
    if (rt === "recruitment") return <UserPlus className={cx(common, "text-violet-600 dark:text-violet-400")} aria-hidden />;
    if (rt === "training") return <GraduationCap className={cx(common, "text-blue-600 dark:text-blue-400")} aria-hidden />;
    if (rt === "reallocation") return <LayoutGrid className={cx(common, "text-emerald-600 dark:text-emerald-400")} aria-hidden />;
    if (rt === "overload") return <Zap className={cx(common, "text-amber-600 dark:text-amber-400")} aria-hidden />;
    if (rt === "skill_gap") return <Briefcase className={cx(common, "text-slate-600 dark:text-slate-400")} aria-hidden />;
    return <Briefcase className={cx(common, "text-slate-500")} aria-hidden />;
}

export type RHRequestCardRow = Record<string, unknown> & { id: string; _row_index?: number };

type RHRequestCardProps = {
    row: RHRequestCardRow;
    title: string;
    description: string;
    typeLabel: string;
    projectLabel: string | null;
    sentLine: string | null;
    priorityBucket: PriorityFilter;
    statusBucket: KpiBucket;
    actionId: string;
    showCancel: boolean;
    isCancelling: boolean;
    labels: {
        viewDetails: string;
        cancel: string;
        typePrefix: string;
        projectPrefix: string;
    };
    tr: (k: string) => string;
    onViewDetails: () => void;
    onCancel: () => void;
    index: number;
};

export function RHRequestCard({
    row,
    title,
    description,
    typeLabel,
    projectLabel,
    sentLine,
    priorityBucket,
    statusBucket,
    actionId,
    showCancel,
    isCancelling,
    labels,
    tr,
    onViewDetails,
    onCancel,
    index,
}: RHRequestCardProps) {
    const rowType = String(row.type ?? "").trim();
    const validType = REQUEST_TYPE_ORDER.includes(rowType as RhActionRequestType) ? rowType : "";

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * Math.min(index, 12), duration: 0.3 }}
            id={actionId ? `manager-rh-action-${actionId}` : undefined}
            className={cx(
                "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900",
                "hover:-translate-y-0.5 hover:shadow-md",
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                        <TypeIcon type={validType || rowType} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold leading-snug text-slate-900 dark:text-slate-50">{title}</h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span
                                className={cx(
                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                                    priorityPillClass(priorityBucket),
                                )}
                            >
                                {priorityLabel(priorityBucket, tr)}
                            </span>
                            <span
                                className={cx(
                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                                    statusPillClass(statusBucket),
                                )}
                            >
                                {statusLabel(statusBucket, tr)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                <span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{labels.typePrefix}</span> {typeLabel}
                </span>
                {projectLabel ? (
                    <span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{labels.projectPrefix}</span> {projectLabel}
                    </span>
                ) : null}
            </div>

            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>

            {sentLine ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-500">
                    <CalendarDays className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                    {sentLine}
                </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <Button color="secondary" size="sm" onClick={onViewDetails}>
                    {labels.viewDetails}
                </Button>
                {showCancel ? (
                    <Button color="secondary-destructive" size="sm" onClick={onCancel} isLoading={isCancelling}>
                        {labels.cancel}
                    </Button>
                ) : null}
            </div>
        </motion.article>
    );
}
