import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DecisionLogDecision, DecisionStatusAction } from "@/services/decisions.api";
import { DecisionLogActions, decisionRowStatusClass } from "@/components/decision-log/DecisionLogActions";
import { decisionLogStatus } from "@/utils/decisionLogHelpers";
import { ScoreBar } from "@/components/decision-log/ScoreBar";
import { confidencePercent, normalizeDecisionKind, timeAgo } from "@/utils/decisionLogHelpers";
import { cx } from "@/utils/cx";
import i18n from "@/i18n";
import { localeForDateFormatting } from "@/lib/ui-locale";

const BADGE_CLASS: Record<string, string> = {
    continue: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100",
    adjust: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100",
    stop: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100",
    other: "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-600 dark:bg-violet-950/45 dark:text-violet-100",
};

type DecisionRowProps = {
    decision: DecisionLogDecision;
    onOpenProject: () => void;
    onUpdateStatus: (action: DecisionStatusAction) => void;
    statusUpdating?: boolean;
    onDelete?: () => void;
    deleting?: boolean;
};

export function DecisionRow({ decision, onOpenProject, onUpdateStatus, statusUpdating, onDelete, deleting }: DecisionRowProps) {
    const [expanded, setExpanded] = useState(false);
    const kind = normalizeDecisionKind(decision.decision);
    const status = decisionLogStatus(decision);
    const fullDate = new Date(decision.created_at).toLocaleString(localeForDateFormatting(i18n.language), {
        dateStyle: "medium",
        timeStyle: "short",
    });

    return (
        <article className={cx("rounded-xl border border-secondary bg-primary shadow-sm", decisionRowStatusClass(status))}>
            <button
                type="button"
                className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
            >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    {expanded ? <ChevronDown className="size-4 shrink-0 text-tertiary" /> : <ChevronRight className="size-4 shrink-0 text-tertiary" />}
                    <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", BADGE_CLASS[kind])}>
                        {kind}
                    </span>
                    <span className="truncate font-medium text-primary">{decision.project_name || "—"}</span>
                    {status === "handled" ? (
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                            Traité
                        </span>
                    ) : null}
                    {decision.reason_code ? (
                        <span className="rounded-md bg-secondary_subtle px-1.5 py-0.5 text-[10px] font-medium text-tertiary">
                            {decision.reason_code}
                        </span>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-tertiary sm:shrink-0">
                    <div className="space-y-0.5">
                        <span className="block text-[10px] uppercase">Score</span>
                        <ScoreBar value={Number(decision.score ?? 0)} variant="score" />
                    </div>
                    <div className="space-y-0.5">
                        <span className="block text-[10px] uppercase">Confiance</span>
                        <ScoreBar value={confidencePercent(decision.confidence) / 10} variant="confidence" />
                    </div>
                    <span title={fullDate} className="whitespace-nowrap tabular-nums">
                        {timeAgo(decision.created_at)}
                    </span>
                </div>
            </button>
            {expanded ? (
                <div className="border-t border-secondary px-4 pb-4 pt-3">
                    <p className="text-sm leading-relaxed text-secondary">{decision.synthesis || "—"}</p>
                    <div className="mt-3">
                        <DecisionLogActions
                            status={status}
                            statusUpdating={statusUpdating}
                            deleting={deleting}
                            onViewDetail={onOpenProject}
                            onMarkHandled={() => onUpdateStatus("handled")}
                            onDismiss={() => onUpdateStatus("dismissed")}
                            onReopen={() => onUpdateStatus("reopen")}
                            onDelete={onDelete}
                        />
                    </div>
                </div>
            ) : null}
        </article>
    );
}
