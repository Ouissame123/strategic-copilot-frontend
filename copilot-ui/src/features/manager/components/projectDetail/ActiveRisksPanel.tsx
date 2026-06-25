import { useTranslation } from "react-i18next";
import { getRiskTitle, severityBadgeClass, severityVariant } from "@/features/manager/lib/ai-risk-display";
import type { AiActiveRisk } from "@/features/manager/types/ai-recommendation";
import { cx } from "@/utils/cx";

export type ActiveRisksPanelProps = {
    risks: AiActiveRisk[];
    risksCount?: number | null;
};

export function ActiveRisksPanel({ risks, risksCount }: ActiveRisksPanelProps) {
    const { t } = useTranslation("common");

    if (risks.length === 0) return null;

    return (
        <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("managerWorkspace.projects.aiRecommendation.activeRisks")}
                {risksCount != null ? ` (${risksCount})` : null}
            </p>
            <ul className="space-y-2">
                {risks.map((risk) => {
                    const variant = severityVariant(risk.severity);
                    const body = risk.message ?? risk.description;

                    return (
                        <li key={risk.id} className="rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-gray-900 dark:text-slate-100">{getRiskTitle(risk)}</span>
                                {risk.severity ? (
                                    <span
                                        className={cx(
                                            "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                                            severityBadgeClass(variant),
                                        )}
                                    >
                                        {String(risk.severity).toUpperCase()}
                                    </span>
                                ) : null}
                            </div>
                            {body ? <p className="text-sm text-gray-600 dark:text-slate-300">{body}</p> : null}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
