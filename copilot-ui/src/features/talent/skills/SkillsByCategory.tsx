import type { MySkill } from "@/types/talent-skills";
import { SkillCard } from "./SkillCard";
import { groupByCategory } from "./talent-skills-ui";

type SkillsByCategoryProps = {
    skills: MySkill[];
    onSkillClick: (skill: MySkill) => void;
};

export function SkillsByCategory({ skills, onSkillClick }: SkillsByCategoryProps) {
    const groups = groupByCategory(skills);

    return (
        <div className="space-y-6">
            {groups.map((group) => (
                <section key={group.category} aria-labelledby={`skills-cat-${group.category}`}>
                    <h2
                        id={`skills-cat-${group.category}`}
                        className="mb-2 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wider text-tertiary"
                    >
                        <span>{group.category}</span>
                        <span className="font-medium tabular-nums text-quaternary">{group.items.length}</span>
                    </h2>
                    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((skill) => (
                            <SkillCard key={skill.skill_id} skill={skill} onClick={onSkillClick} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
