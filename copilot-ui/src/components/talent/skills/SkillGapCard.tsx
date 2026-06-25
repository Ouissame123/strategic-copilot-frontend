import { Button } from "@/components/base/buttons/button";
import type { SkillGap } from "@/types/talent-skills";
import { SEVERITY_TONES, badgeToneClass, type TalentSkillsDensity } from "./talent-skills-ui";
import { cx } from "@/utils/cx";

type SkillGapCardProps = {
    gap: SkillGap;
    density: TalentSkillsDensity;
    onRequestFormation: (gap: SkillGap) => void;
};

export function SkillGapCard({ gap, density, onRequestFormation }: SkillGapCardProps) {
    const isCompact = density === "compact";
    const severityTone = SEVERITY_TONES[gap.severity] ?? "slate";

    return (
        <article
            className={cx(
                "rounded-2xl border border-secondary bg-primary shadow-xs ring-1 ring-secondary/60",
                isCompact ? "p-3" : "p-4 sm:p-5",
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className={cx("font-semibold text-primary", isCompact ? "text-sm" : "text-base")}>{gap.skill_name}</p>
                    {gap.category ? <p className="mt-0.5 text-xs text-tertiary">{gap.category}</p> : null}
                </div>
                <span className={badgeToneClass(severityTone)}>{gap.severity}</span>
            </div>

            <p className={cx("mt-3 text-secondary", isCompact ? "text-xs" : "text-sm")}>
                Niveau requis : {gap.max_level_required} / Mon niveau : {gap.my_level} → manque {gap.gap_size} niveaux
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-tertiary">
                <span>{gap.projects_count} projet(s)</span>
                {gap.has_mandatory ? <span className={badgeToneClass("red")}>Obligatoire</span> : null}
            </div>

            <div className="mt-3">
                <Button type="button" color="secondary" size="sm" onClick={() => onRequestFormation(gap)}>
                    Demander une formation
                </Button>
            </div>
        </article>
    );
}
