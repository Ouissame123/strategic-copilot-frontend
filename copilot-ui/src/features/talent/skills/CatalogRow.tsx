import { Button } from "@/components/base/buttons/button";
import type { CatalogSkill } from "@/types/talent-skills";

type CatalogRowProps = {
    skill: CatalogSkill;
    onAdd: (skill: CatalogSkill) => void;
};

export function CatalogRow({ skill, onAdd }: CatalogRowProps) {
    const category = skill.category?.trim();

    return (
        <li className="flex items-center justify-between gap-3 border-b border-secondary/40 px-3 py-2.5 last:border-b-0">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary">
                    {skill.skill_name}
                    {category ? (
                        <span className="font-normal text-tertiary">
                            {" · "}
                            {category}
                        </span>
                    ) : null}
                </p>
            </div>

            {skill.already_added ? (
                <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800">
                    ✓ Ajoutée
                </span>
            ) : (
                <Button type="button" color="secondary" size="sm" onClick={() => onAdd(skill)}>
                    Ajouter
                </Button>
            )}
        </li>
    );
}
