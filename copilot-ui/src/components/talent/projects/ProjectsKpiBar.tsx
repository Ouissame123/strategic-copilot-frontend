import type { TalentProjectsSummary } from "@/types/talent-projects";
import { TalentKpiStrip } from "@/components/talent/ui/TalentKpiStrip";
import { ALLOCATION_TONES, badgeToneClass } from "./talent-projects-ui";

type ProjectsKpiBarProps = {
    summary?: TalentProjectsSummary;
    isLoading?: boolean;
};

export function ProjectsKpiBar({ summary, isLoading }: ProjectsKpiBarProps) {
    if (!summary && !isLoading) return null;

    const allocTone = summary ? ALLOCATION_TONES[summary.allocation_status] ?? "slate" : "slate";

    return (
        <TalentKpiStrip
            isLoading={isLoading}
            items={
                summary
                    ? [
                          { key: "active", label: "Actifs", value: String(summary.by_tab.active) },
                          { key: "planned", label: "Planifiés", value: String(summary.by_tab.planned) },
                          { key: "past", label: "Passés", value: String(summary.by_tab.past) },
                          {
                              key: "allocation",
                              label: "Allocation",
                              value: `${summary.total_allocation_pct_active}%`,
                              badge: <span className={badgeToneClass(allocTone)}>{summary.allocation_status}</span>,
                              tone: summary.allocation_status === "overloaded" ? "red" : "default",
                          },
                      ]
                    : []
            }
        />
    );
}
