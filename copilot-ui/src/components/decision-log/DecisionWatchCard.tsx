import { AlertCircle } from "lucide-react";
import type { DecisionLogDecision, DecisionStatusAction } from "@/services/decisions.api";
import { DecisionGauge } from "@/components/decision-log/DecisionGauge";
import { DecisionLogActions } from "@/components/decision-log/DecisionLogActions";
import { decisionLogStatus, watchBorderClass } from "@/utils/decisionLogHelpers";
import { cx } from "@/utils/cx";

type DecisionWatchCardProps = {
    decision: DecisionLogDecision;
    onViewProject: () => void;
    onUpdateStatus: (action: DecisionStatusAction) => void;
    statusUpdating?: boolean;
};

export function DecisionWatchCard({ decision, onViewProject, onUpdateStatus, statusUpdating }: DecisionWatchCardProps) {
    const score = Number(decision.score ?? 0);
    const status = decisionLogStatus(decision);

    return (
        <article
            className={cx(
                "rounded-2xl border border-secondary border-l-4 bg-primary p-5 shadow-sm",
                watchBorderClass(score),
            )}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <DecisionGauge score={score} />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">Décision à surveiller</p>
                            <h2 className="mt-0.5 text-base font-semibold text-primary">{decision.project_name || "—"}</h2>
                        </div>
                    </div>
                    {decision.reason_code ? (
                        <span className="inline-flex rounded-full border border-secondary bg-secondary_subtle px-2 py-0.5 text-xs font-medium text-secondary">
                            {decision.reason_code}
                        </span>
                    ) : null}
                    {decision.synthesis ? (
                        <p className="line-clamp-2 text-sm text-secondary">{decision.synthesis}</p>
                    ) : null}
                </div>
            </div>
            <div className="mt-4">
                <DecisionLogActions
                    status={status}
                    statusUpdating={statusUpdating}
                    onViewDetail={onViewProject}
                    onMarkHandled={() => onUpdateStatus("handled")}
                    onDismiss={() => onUpdateStatus("dismissed")}
                    onReopen={() => onUpdateStatus("reopen")}
                />
            </div>
        </article>
    );
}
