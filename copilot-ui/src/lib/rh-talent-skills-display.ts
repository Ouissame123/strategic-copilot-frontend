import type { RhTalentSkill } from "@/types/rh-talent-skills.types";

export type ProficiencyBadge = {
    label: string;
    cls: string;
};

export function proficiencyBadge(level: number): ProficiencyBadge {
    const n = Math.round(Math.max(1, Math.min(5, level)));
    if (n >= 5) return { label: "Expert", cls: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200" };
    if (n >= 4) return { label: "Confirmé", cls: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" };
    if (n >= 3) return { label: "Intermédiaire", cls: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200" };
    return { label: "Débutant", cls: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
}

export function stars(level: number): string {
    const f = Math.round(Math.max(0, Math.min(5, level)));
    return "★★★★★".slice(0, f) + "☆☆☆☆☆".slice(0, 5 - f);
}

export function groupSkillsByCategory(skills: RhTalentSkill[]): { category: string; items: RhTalentSkill[] }[] {
    const map = new Map<string, RhTalentSkill[]>();
    for (const s of skills) {
        const cat = s.skill_category?.trim() || "Autre";
        const list = map.get(cat) ?? [];
        list.push(s);
        map.set(cat, list);
    }
    return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0], "fr"))
        .map(([category, items]) => ({ category, items }));
}
