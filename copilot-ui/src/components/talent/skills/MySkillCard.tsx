import { Award } from "lucide-react";
import type { MySkill } from "@/types/talent-skills";
import { LEVEL_TONES, badgeToneClass, formatSkillDate, type TalentSkillsDensity } from "./talent-skills-ui";
import { cx } from "@/utils/cx";

type MySkillCardProps = {
    skill: MySkill;
    density: TalentSkillsDensity;
    onClick: (skill: MySkill) => void;
};

export function MySkillCard({ skill, density, onClick }: MySkillCardProps) {
    const isCompact = density === "compact";
    const levelTone = LEVEL_TONES[skill.level_label] ?? "slate";
    const lastUsed = formatSkillDate(skill.last_used_at);

    return (
        <button
            type="button"
            onClick={() => onClick(skill)}
            className={cx(
                "flex w-full flex-col rounded-2xl border border-secondary bg-primary text-left shadow-xs ring-1 ring-secondary/60 transition hover:border-brand-secondary/40 hover:shadow-sm",
                isCompact ? "gap-2 p-3" : "gap-3 p-4 sm:p-5",
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className={cx("font-semibold text-primary", isCompact ? "text-sm" : "text-base")}>{skill.skill_name}</p>
                    {skill.is_certified ? <Award className="size-4 shrink-0 text-amber-600" aria-label="Certifié" /> : null}
                </div>
                <span className={badgeToneClass(levelTone)}>{skill.level_label}</span>
            </div>

            {skill.category ? <p className="text-xs text-tertiary">{skill.category}</p> : null}

            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                    className="h-full rounded-full bg-brand-secondary transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, skill.level * 10))}%` }}
                />
            </div>

            <div className={cx("flex flex-wrap gap-x-3 gap-y-1 text-tertiary", isCompact ? "text-[11px]" : "text-xs")}>
                <span>Niveau {skill.level}/10</span>
                {skill.years_experience != null ? <span>{skill.years_experience} ans d&apos;exp.</span> : null}
                {lastUsed ? <span>Dernière utilisation · {lastUsed}</span> : null}
            </div>
        </button>
    );
}
