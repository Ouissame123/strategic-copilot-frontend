import type { SkillsSummary } from "@/types/talent-skills";
import { TalentKpiStrip } from "@/components/talent/ui/TalentKpiStrip";

type SkillsKpiBarProps = {
    summary?: SkillsSummary;
    isLoading?: boolean;
};

export function SkillsKpiBar({ summary, isLoading }: SkillsKpiBarProps) {
    if (!summary && !isLoading) return null;

    return (
        <TalentKpiStrip
            isLoading={isLoading}
            items={
                summary
                    ? [
                          { key: "total", label: "Compétences", value: String(summary.total), tone: "violet" },
                          { key: "certified", label: "Certifiées", value: String(summary.certified), tone: "emerald" },
                          { key: "avg", label: "Niveau moyen", value: String(summary.avg_level) },
                          { key: "recent", label: "Utilisées < 6 mois", value: String(summary.recently_used) },
                      ]
                    : []
            }
        />
    );
}
