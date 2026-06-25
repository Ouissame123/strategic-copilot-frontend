import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { ActiveRisksPanel } from "@/features/manager/components/projectDetail/ActiveRisksPanel";
import { AiRecommendationBadge } from "@/features/manager/components/AiRecommendationBadge";
import { sortAiRisksBySeverity } from "@/features/manager/lib/ai-recommendation-normalize";
import type { AiRecommendation } from "@/features/manager/types/ai-recommendation";
import { cx } from "@/utils/cx";

const DECISION_BAR_COLOR: Record<string, string> = {
    green: "bg-green-600",
    orange: "bg-orange-600",
    red: "bg-red-600",
    gray: "bg-gray-400",
};

export type AiRecommendationPanelProps = {
    recommendation: AiRecommendation | null | undefined;
    projectName: string;
    onViewDetails?: () => void;
};

export function AiRecommendationPanel({ recommendation, projectName, onViewDetails }: AiRecommendationPanelProps) {
    const { t } = useTranslation("common");

    const otherOptions = useMemo(() => {
        if (!recommendation?.arbitrage_options?.length) return [];
        const topId = recommendation.top_action?.id?.trim() ?? "";
        return recommendation.arbitrage_options.filter((option) => option.id && option.id !== topId).slice(0, 3);
    }, [recommendation?.arbitrage_options, recommendation?.top_action?.id]);

    const activeRisks = useMemo(() => {
        if (!recommendation?.risks_active?.length) return [];
        return sortAiRisksBySeverity(recommendation.risks_active);
    }, [recommendation?.risks_active]);

    if (recommendation == null) {
        return (
            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                <AiRecommendationBadge recommendation={null} size="lg" />
            </section>
        );
    }

    const colorKey = String(recommendation.decision_color ?? "gray").trim().toLowerCase();
    const barColor = DECISION_BAR_COLOR[colorKey] ?? DECISION_BAR_COLOR.gray;
    const viabilityScore = recommendation.viability_score;
    const showViability = viabilityScore != null && Number.isFinite(viabilityScore);
    const topAction = recommendation.top_action;
    const warnings = recommendation.warnings ?? [];

    return (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <header className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {t("managerWorkspace.projects.aiRecommendation.panelTitle", { project: projectName })}
                </p>
                <AiRecommendationBadge recommendation={recommendation} size="lg" showAction />
                {recommendation.source_agent ? (
                    <p className="text-xs text-slate-500">
                        {t("managerWorkspace.aiRecommendation.sourceAgent", { agent: recommendation.source_agent })}
                    </p>
                ) : null}
            </header>

            {warnings.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <ul className="list-disc space-y-1 pl-4">
                        {warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {showViability ? (
                <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                            {t("managerWorkspace.aiRecommendation.viabilityScore")}
                        </span>
                        <span className="tabular-nums text-slate-600">{viabilityScore}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={cx("h-full rounded-full transition-all", barColor)}
                            style={{ width: `${Math.min(100, Math.max(0, viabilityScore))}%` }}
                        />
                    </div>
                </div>
            ) : null}

            {topAction?.type || topAction?.rationale ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("managerWorkspace.aiRecommendation.priorityAction")}
                    </p>
                    {topAction.type ? <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{topAction.type}</p> : null}
                    {topAction.rationale ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{topAction.rationale}</p> : null}
                    {onViewDetails ? (
                        <Button type="button" color="link-color" size="sm" className="mt-2 h-auto px-0 py-0" onClick={onViewDetails}>
                            {t("managerWorkspace.aiRecommendation.viewDetails")}
                        </Button>
                    ) : null}
                </div>
            ) : null}

            {otherOptions.length > 0 ? (
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("managerWorkspace.aiRecommendation.otherOptions")}
                    </p>
                    <ul className="space-y-2">
                        {otherOptions.map((option) => (
                            <li
                                key={option.id}
                                className="rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                            >
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {option.label ?? option.type ?? option.id}
                                </p>
                                {option.rationale ? <p className="mt-0.5 text-slate-600 dark:text-slate-300">{option.rationale}</p> : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {activeRisks.length > 0 ? (
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("managerWorkspace.aiRecommendation.activeRisks")}
                        {recommendation.risks_count != null ? ` (${recommendation.risks_count})` : null}
                    </p>
                    <ul className="space-y-2">
                        {activeRisks.map((risk) => (
                            <li key={risk.id} className="rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{risk.title ?? risk.id}</span>
                                    {risk.severity ? (
                                        <span
                                            className={cx(
                                                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset",
                                                severityClass(risk.severity),
                                            )}
                                        >
                                            {risk.severity}
                                        </span>
                                    ) : null}
                                </div>
                                {risk.message ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{risk.message}</p> : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </section>
    );
}
