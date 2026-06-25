import { useTranslation } from "react-i18next";
import type { WhatIfResponse } from "@/api/whatif.types";
import { DecisionBadgeCompare } from "./DecisionBadgeCompare";
import { ImpactBanner } from "./ImpactBanner";
import { ScoreDeltaCard } from "./ScoreDeltaCard";

function readRecommendationText(recommendation: WhatIfResponse["recommendation"]): string | null {
    if (recommendation == null) return null;
    if (typeof recommendation === "string" && recommendation.trim()) return recommendation.trim();
    if (typeof recommendation === "object") {
        const summary = (recommendation as Record<string, unknown>).summary;
        if (typeof summary === "string" && summary.trim()) return summary.trim();
    }
    return null;
}

type SimulationResultProps = {
    result: WhatIfResponse;
};

export function SimulationResult({ result }: SimulationResultProps) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);
    const recommendationText = readRecommendationText(result.recommendation);

    return (
        <div className="space-y-4">
            <ImpactBanner
                delta={result.delta}
                impactExplained={result.impact_explained}
                scenarioSummary={result.scenario_summary}
            />

            <section className="rounded-xl border border-secondary bg-primary p-4 shadow-sm">
                <h3 className="text-base font-semibold text-fg-primary">{tm("simulationGlobalScore")}</h3>
                <div className="mt-3">
                    <ScoreDeltaCard label={tm("simulationViabilityLabel")} before={result.score_before} after={result.score_after} />
                </div>
                <div className="mt-4">
                    <DecisionBadgeCompare before={result.decision_before} after={result.decision_after} />
                </div>
            </section>

            <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-tertiary">{tm("simulationBreakdownTitle")}</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <ScoreDeltaCard
                        label={tm("breakdownSkillsFit")}
                        before={result.score_breakdown_before.skills_fit}
                        after={result.score_breakdown_after.skills_fit}
                    />
                    <ScoreDeltaCard
                        label={tm("breakdownCapacity")}
                        before={result.score_breakdown_before.capacity}
                        after={result.score_breakdown_after.capacity}
                    />
                    <ScoreDeltaCard
                        label={tm("breakdownBudget")}
                        before={result.score_breakdown_before.budget}
                        after={result.score_breakdown_after.budget}
                    />
                    <ScoreDeltaCard
                        label={tm("breakdownRisk")}
                        before={result.score_breakdown_before.risk}
                        after={result.score_breakdown_after.risk}
                    />
                </div>
            </div>

            {result.explanation_before || result.explanation_after || recommendationText ? (
                <section className="rounded-xl border border-secondary bg-primary p-4 shadow-sm">
                    <h3 className="text-base font-semibold text-fg-primary">{tm("simulationSynthesisTitle")}</h3>
                    <div className="mt-3 space-y-3 text-sm">
                        {result.explanation_before ? (
                            <div>
                                <div className="mb-1 text-xs font-semibold uppercase text-fg-tertiary">{tm("simulationBeforeLabel")}</div>
                                <p className="text-fg-tertiary">{result.explanation_before}</p>
                            </div>
                        ) : null}
                        {result.explanation_after ? (
                            <div>
                                <div className="mb-1 text-xs font-semibold uppercase text-fg-tertiary">{tm("simulationAfterLabel")}</div>
                                <p className="text-fg-secondary">{result.explanation_after}</p>
                            </div>
                        ) : null}
                        {recommendationText ? (
                            <div>
                                <div className="mb-1 text-xs font-semibold uppercase text-fg-tertiary">{tm("simulationRecommendation")}</div>
                                <p className="text-fg-secondary">{recommendationText}</p>
                            </div>
                        ) : null}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
