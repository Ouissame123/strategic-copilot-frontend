import type { TalentRequestsSummary } from "@/types/talent-requests";
import { TalentKpiStrip } from "@/components/talent/ui/TalentKpiStrip";

type TalentRequestsInsightBarProps = {
    summary: TalentRequestsSummary | undefined;
    isLoading?: boolean;
};

export function TalentRequestsInsightBar({ summary, isLoading }: TalentRequestsInsightBarProps) {
    if (!summary && !isLoading) return null;

    const pending = summary?.by_status?.pending ?? 0;
    const accepted = summary?.by_status?.accepted ?? 0;
    const urgent = summary?.urgent ?? 0;

    return (
        <TalentKpiStrip
            isLoading={isLoading}
            items={
                summary
                    ? [
                          { key: "total", label: "Total", value: String(summary.total ?? 0) },
                          { key: "pending", label: "En attente", value: String(pending), tone: "amber" },
                          { key: "accepted", label: "Acceptées", value: String(accepted), tone: "emerald" },
                          { key: "urgent", label: "Urgentes", value: String(urgent), tone: urgent > 0 ? "red" : "default" },
                      ]
                    : []
            }
        />
    );
}
