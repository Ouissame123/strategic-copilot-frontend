import type { OpportunitiesSummary } from "@/types/talent-opportunities";
import { TalentKpiStrip } from "@/components/talent/ui/TalentKpiStrip";
import { formatOpportunityScore } from "./talent-opportunities-ui";

type OpportunitiesKpiBarProps = {
    summary?: OpportunitiesSummary;
    isLoading?: boolean;
};

export function OpportunitiesKpiBar({ summary, isLoading }: OpportunitiesKpiBarProps) {
    if (!summary && !isLoading) return null;

    return (
        <TalentKpiStrip
            isLoading={isLoading}
            items={
                summary
                    ? [
                          { key: "matches", label: "Matches", value: String(summary.total_matches), tone: "violet" },
                          { key: "excellent", label: "Excellents", value: String(summary.by_tier.excellent), tone: "emerald" },
                          { key: "top", label: "Top score", value: formatOpportunityScore(summary.top_score), tone: "brand" },
                          {
                              key: "redeploy",
                              label: "Redéploiement",
                              value: String(summary.by_recommendation.redeploy),
                          },
                      ]
                    : []
            }
        />
    );
}
