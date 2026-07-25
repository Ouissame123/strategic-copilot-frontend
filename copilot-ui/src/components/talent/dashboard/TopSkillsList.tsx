import { TalentSkillBar } from "@/components/talent/talent-skill-bar";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { DashboardSectionCard } from "./DashboardSectionCard";

type TopSkillsListProps = {
    skills?: TalentDashboard["top_skills"];
    stats?: TalentDashboard["skills_stats"];
};

export function TopSkillsList({ skills, stats }: TopSkillsListProps) {
    if (skills === undefined) return null;

    const items = skills.slice(0, 5);
    const empty = items.length === 0;

    const statsLine =
        stats != null
            ? `${stats.total} compétences · ${stats.certified} certifiées · niveau moyen ${stats.avg_level}`
            : null;

    return (
        <DashboardSectionCard
            title="Mes compétences"
            subtitle="Analyst"
            ctaLabel="Voir tout"
            ctaHref="/workspace/talent/skills"
        >
            {statsLine ? <p className="mb-2 text-[10px] text-tertiary">{statsLine}</p> : null}
            {empty ? (
                <p className="text-sm text-tertiary">Aucune compétence renseignée</p>
            ) : (
                <ul className="space-y-1">
                    {items.map((skill) => (
                        <li key={skill.skill_id} className="relative">
                            <TalentSkillBar name={skill.skill_name} valueLabel={`${skill.level}/10`} valuePct={skill.level * 10} />
                            {skill.is_certified ? (
                                <span className="absolute right-0 top-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                    Certifié
                                </span>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </DashboardSectionCard>
    );
}
