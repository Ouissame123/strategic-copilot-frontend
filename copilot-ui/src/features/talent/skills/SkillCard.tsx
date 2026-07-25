import { Award } from "lucide-react";
import type { MySkill } from "@/types/talent-skills";
import { formatExperience } from "./utils/formatExperience";
import { formatLastUsedMeta } from "./utils/formatLastUsed";
import { badgeToneClass, levelBadgeTone } from "./talent-skills-ui";
import { cx } from "@/utils/cx";

type SkillCardProps = {
    skill: MySkill;
    onClick: (skill: MySkill) => void;
};

function LevelBar({ level }: { level: number }) {
    const pct = Math.min(100, Math.max(0, level * 10));
    return (
        <span
            className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            role="progressbar"
            aria-valuenow={level}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-label={`Niveau ${level} sur 10`}
        >
            <span
                className="absolute inset-y-0 left-0 rounded-full bg-primary-600 dark:bg-primary-500"
                style={{ width: `${pct}%` }}
            />
        </span>
    );
}

export function SkillCard({ skill, onClick }: SkillCardProps) {
    const tone = levelBadgeTone(skill.level_label);
    const exp =
        skill.years_experience != null && Number.isFinite(skill.years_experience)
            ? formatExperience(skill.years_experience)
            : null;
    const lastUsed = formatLastUsedMeta(skill.last_used_at);

    const metaParts = [`Niveau ${skill.level}/10`, exp, lastUsed].filter(
        (part): part is string => Boolean(part && part.length > 0),
    );

    return (
        <button
            type="button"
            onClick={() => onClick(skill)}
            className={cx(
                "flex w-full flex-col gap-1.5 rounded-lg border border-secondary/60 bg-primary p-3 text-left shadow-sm transition",
                "hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-solid",
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate font-medium text-primary">{skill.skill_name}</p>
                    {skill.is_certified ? (
                        <Award className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Certifié" />
                    ) : null}
                </div>
                <span className={cx("shrink-0", badgeToneClass(tone))}>{skill.level_label}</span>
            </div>

            <div className="flex items-center gap-2">
                <p className="shrink-0 text-xs text-tertiary">{skill.category?.trim() || "—"}</p>
                <LevelBar level={skill.level} />
            </div>

            {metaParts.length > 0 ? (
                <p className="truncate text-xs text-tertiary">
                    {metaParts.map((part, i) => (
                        <span key={part}>
                            {i > 0 ? <span aria-hidden> · </span> : null}
                            {part}
                        </span>
                    ))}
                </p>
            ) : null}
        </button>
    );
}
