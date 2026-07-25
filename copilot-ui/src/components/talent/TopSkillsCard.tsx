import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { toneClasses } from "@/components/talent/dashboard/talent-dashboard-tones";
import { TALENT_SURFACE } from "@/components/talent/ui/talent-workspace-ui";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { cx } from "@/utils/cx";

type TopSkillsCardProps = {
    skills?: TalentDashboard["top_skills"];
    stats?: TalentDashboard["skills_stats"];
};

function levelBarColor(level: number): string {
    if (level >= 8) return "bg-emerald-500";
    if (level >= 6) return "bg-primary-500";
    if (level >= 4) return "bg-amber-500";
    return "bg-orange-500";
}

export function TopSkillsCard({ skills, stats }: TopSkillsCardProps) {
    if (skills === undefined) return null;

    const top5 = skills.slice(0, 5);
    const empty = top5.length === 0;
    const certifiedCls = toneClasses("emerald");

    const statsLine =
        stats != null
            ? `${stats.total} compétence${stats.total > 1 ? "s" : ""} · ${stats.certified} certifiée${stats.certified > 1 ? "s" : ""} · niveau moyen ${stats.avg_level}`
            : null;

    return (
        <section className={cx(TALENT_SURFACE, "flex h-full flex-col p-5")} aria-labelledby="talent-skills-title">
            <header className="mb-4 flex items-start justify-between gap-2">
                <div>
                    <h2 id="talent-skills-title" className="text-base font-semibold text-primary">
                        Mes compétences
                    </h2>
                    {statsLine ? <p className="mt-1 text-xs text-tertiary">{statsLine}</p> : null}
                </div>
                <Link
                    to="/workspace/talent/skills"
                    className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                    aria-label="Voir toutes mes compétences"
                >
                    Voir tout
                    <ArrowRight className="size-3" aria-hidden />
                </Link>
            </header>

            {empty ? (
                <p className="py-6 text-center text-sm text-tertiary">
                    Aucune compétence renseignée pour l&apos;instant.
                    <br />
                    <Link to="/workspace/talent/skills" className="mt-2 inline-block text-sm font-semibold text-brand-secondary">
                        Ajouter une compétence
                    </Link>
                </p>
            ) : (
                <ul className="space-y-3">
                    {top5.map((skill) => (
                        <li key={skill.skill_id} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="flex min-w-0 items-center gap-2">
                                    <span className="truncate font-medium text-primary">{skill.skill_name}</span>
                                    {skill.is_certified ? (
                                        <span className={cx("shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", certifiedCls.badge)}>
                                            Certifié
                                        </span>
                                    ) : null}
                                </span>
                                <span className="shrink-0 tabular-nums text-tertiary">{skill.level}/10</span>
                            </div>
                            <div
                                className="h-1.5 overflow-hidden rounded-full bg-secondary/60"
                                role="progressbar"
                                aria-valuenow={skill.level * 10}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`Niveau ${skill.skill_name}`}
                            >
                                <div
                                    className={cx("h-full transition-all", levelBarColor(skill.level))}
                                    style={{ width: `${(skill.level / 10) * 100}%` }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
