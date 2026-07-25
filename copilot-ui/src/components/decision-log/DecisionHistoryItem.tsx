import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { DecisionLogDecision, DecisionStatusAction } from "@/services/decisions.api";
import { DecisionLogActions, decisionRowStatusClass } from "./DecisionLogActions";
import {
    confidencePercent,
    decisionLogStatus,
    normalizeDecisionKind,
    timeAgo,
} from "@/utils/decisionLogHelpers";
import { decisionBadgeClass } from "./decision-log-ui";
import { cx } from "@/utils/cx";
import i18n from "@/i18n";
import { localeForDateFormatting } from "@/lib/ui-locale";

type DecisionHistoryItemProps = {
    decision: DecisionLogDecision;
    onOpenProject: () => void;
    onUpdateStatus: (action: DecisionStatusAction) => void;
    statusUpdating?: boolean;
    onDelete?: () => void;
    deleting?: boolean;
};

export function DecisionHistoryItem({
    decision,
    onOpenProject,
    onUpdateStatus,
    statusUpdating,
    onDelete,
    deleting,
}: DecisionHistoryItemProps) {
    const [expanded, setExpanded] = useState(false);
    const kind = normalizeDecisionKind(decision.decision);
    const status = decisionLogStatus(decision);
    const badgeStyle = decisionBadgeClass[kind] ?? decisionBadgeClass.other;
    const padding = "px-4 py-3.5";
    const score = Number(decision.score ?? 0);
    const confPct = confidencePercent(decision.confidence);
    const fullDate = new Date(decision.created_at).toLocaleString(localeForDateFormatting(i18n.language), {
        dateStyle: "medium",
        timeStyle: "short",
    });

    return (
        <div className={cx("border-b border-secondary/50 last:border-b-0", decisionRowStatusClass(status))}>
            <button
                type="button"
                className={cx("group flex w-full items-center gap-3 text-left transition-colors hover:bg-secondary_subtle/50", padding)}
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
            >
                <span
                    className={cx(
                        "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        badgeStyle,
                    )}
                >
                    {kind}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="truncate text-sm font-medium text-primary">{decision.project_name || "—"}</p>
                        {decision.reason_code ? (
                            <p className="truncate text-xs text-tertiary">{decision.reason_code}</p>
                        ) : null}
                        {status === "handled" ? (
                            <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                Traité
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="hidden shrink-0 items-center gap-6 md:flex">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-tertiary">Score</span>
                        <span className="text-sm font-medium tabular-nums text-primary">
                            {score.toFixed(1)}
                            <span className="text-tertiary">/10</span>
                        </span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-tertiary">Conf.</span>
                        <span className="text-sm font-medium tabular-nums text-primary">{confPct}%</span>
                    </div>
                </div>

                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-tertiary" title={fullDate}>
                    {timeAgo(decision.created_at)}
                </span>

                <ChevronRight
                    className={cx(
                        "size-4 shrink-0 text-tertiary/50 transition-transform group-hover:text-secondary",
                        expanded && "rotate-90",
                    )}
                    aria-hidden
                />
            </button>

            {expanded ? (
                <div className="border-t border-secondary/40 bg-secondary_subtle/20 px-4 pb-4 pt-3">
                    <div className="mb-3 flex gap-6 md:hidden">
                        <div>
                            <span className="text-[10px] font-medium uppercase tracking-wider text-tertiary">Score</span>
                            <p className="text-sm font-medium tabular-nums">{score.toFixed(1)}/10</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-medium uppercase tracking-wider text-tertiary">Confiance</span>
                            <p className="text-sm font-medium tabular-nums">{confPct}%</p>
                        </div>
                    </div>
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
        </div>
    );
}
