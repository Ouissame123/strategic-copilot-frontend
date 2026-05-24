import { Award, ChevronRight, Layers } from "lucide-react";
import type { RhAnalyticsKpis } from "@/types/rh-dashboard.types";
import { DashboardSection, levelStars } from "@/components/rh/dashboard/rh-dashboard-shared";
import { RH_LINK, RH_TEXT_MUTED, RH_TEXT_PRIMARY, RH_TEXT_SECONDARY, WS_TEXT_FAINT } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

type Props = {
    kpis: RhAnalyticsKpis;
    onOpenTalents?: () => void;
};

export function RhDashboardSkillsCapacity({ kpis, onOpenTalents }: Props) {
    const { skills } = kpis;

    return (
        <DashboardSection
            eyebrow="Compétences"
            title="Skills & Capacity"
            description="Top compétences, niveaux moyens et tensions de couverture."
            action={
                <span className={cx("rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium tabular-nums dark:border-slate-700 dark:bg-slate-800", RH_TEXT_MUTED)}>
                    {skills.total_unique_skills} skills ·{" "}
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{skills.skills_with_gaps}</span> en tension
                </span>
            }
        >
            {skills.top_skills.length === 0 ? (
                <p className={cx("text-xs", WS_TEXT_FAINT)}>
                    Aucune compétence agrégée — le workflow doit renvoyer <code className="text-[10px]">kpis.skills.top_skills</code>.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {skills.top_skills.slice(0, 8).map((s, i) => (
                        <div
                            key={`${s.skill_name}-${i}`}
                            className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40"
                        >
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm dark:bg-slate-900 dark:text-violet-400">
                                <Layers size={14} aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={cx("truncate text-xs font-semibold", RH_TEXT_PRIMARY)}>{s.skill_name}</p>
                                <p className={cx("text-[10px]", RH_TEXT_MUTED)}>
                                    {s.talent_count} talent(s) · niv. {s.avg_level.toFixed(1)}/5
                                </p>
                            </div>
                            <span className="text-[11px] text-amber-500" title={`Niveau ${s.avg_level}/5`}>
                                {levelStars(s.avg_level)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {onOpenTalents ? (
                <button
                    type="button"
                    onClick={onOpenTalents}
                    className={cx("mt-3 inline-flex items-center gap-1 text-[12px] font-semibold", RH_LINK)}
                >
                    <Award size={13} aria-hidden />
                    Explorer le référentiel talents
                    <ChevronRight size={13} aria-hidden />
                </button>
            ) : null}
        </DashboardSection>
    );
}
