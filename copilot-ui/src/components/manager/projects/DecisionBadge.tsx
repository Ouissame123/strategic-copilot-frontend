import type { ProjectAiRecommendation } from "@/types/api.types";
import { getDecisionPalette } from "./ai-recommendation-list-display";

type DecisionBadgeProps = {
    recommendation: ProjectAiRecommendation | null;
};

export function DecisionBadge({ recommendation }: DecisionBadgeProps) {
    if (!recommendation) {
        return (
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                Non analysé
            </span>
        );
    }

    const palette = getDecisionPalette(recommendation.decision_color);
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: palette.bg, color: palette.text, borderColor: palette.border }}
        >
            {recommendation.decision_icon ? <span aria-hidden>{recommendation.decision_icon}</span> : null}
            {recommendation.decision}
        </span>
    );
}
