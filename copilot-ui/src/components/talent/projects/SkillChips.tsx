import { cx } from "@/utils/cx";

export type SkillChipItem = {
    skill_id: string;
    skill_name: string;
    category: string | null;
    level_required: number;
};

type SkillChipsProps = {
    requirements: SkillChipItem[];
};

type AggregatedSkill = {
    key: string;
    skillName: string;
    level: number;
    count: number;
};

function levelChipClass(level: number): string {
    if (level >= 3) {
        return "bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50";
    }
    if (level === 2) {
        return "bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50";
    }
    return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-800";
}

function groupByCategory(requirements: SkillChipItem[]): Array<{ category: string; skills: AggregatedSkill[] }> {
    const order: string[] = [];
    const map = new Map<string, Map<string, AggregatedSkill>>();

    for (const req of requirements) {
        const category = req.category?.trim() || "Autres";
        if (!map.has(category)) {
            map.set(category, new Map());
            order.push(category);
        }
        const group = map.get(category)!;
        const key = `${req.skill_name.trim().toLowerCase()}::${req.level_required}`;
        const existing = group.get(key);
        if (existing) {
            existing.count += 1;
        } else {
            group.set(key, {
                key,
                skillName: req.skill_name,
                level: req.level_required,
                count: 1,
            });
        }
    }

    return order.map((category) => ({
        category,
        skills: Array.from(map.get(category)!.values()),
    }));
}

export function SkillChips({ requirements }: SkillChipsProps) {
    if (requirements.length === 0) return null;

    const groups = groupByCategory(requirements);

    return (
        <div className="mt-3 space-y-3">
            {groups.map((group) => (
                <div key={group.category}>
                    <p className="text-xs font-medium uppercase tracking-wide text-tertiary">{group.category}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {group.skills.map((skill) => {
                            const countSuffix = skill.count > 1 ? ` ×${skill.count}` : "";
                            return (
                                <span
                                    key={skill.key}
                                    className={cx(
                                        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                                        levelChipClass(skill.level),
                                    )}
                                >
                                    {skill.skillName} · Niv. {skill.level}
                                    {countSuffix}
                                </span>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
