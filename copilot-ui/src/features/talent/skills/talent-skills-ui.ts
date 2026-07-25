import type { SkillLevelLabel, SkillsTab } from "@/types/talent-skills";
import { cx } from "@/utils/cx";

export type BadgeTone = "blue" | "violet" | "amber" | "slate" | "emerald" | "red" | "orange";

export type SkillsViewMode = "grid" | "category";

/** Tons badge niveau (Avancé inclus pour affichage). */
export const LEVEL_TONES: Record<SkillLevelLabel, BadgeTone> = {
    Expert: "emerald",
    Intermédiaire: "blue",
    Débutant: "amber",
    Découverte: "slate",
};

const LEVEL_TONE_BY_LABEL: Record<string, BadgeTone> = {
    ...LEVEL_TONES,
    Avancé: "violet",
};

export function levelBadgeTone(label: string): BadgeTone {
    return LEVEL_TONE_BY_LABEL[label] ?? "slate";
}

export const SEVERITY_TONES: Record<"high" | "medium" | "low", BadgeTone> = {
    high: "red",
    medium: "amber",
    low: "slate",
};

const TONE_CLASS: Record<BadgeTone, string> = {
    blue: "bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-800",
    violet: "bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-800",
    amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800",
    red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800",
    orange: "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-800",
};

export function badgeToneClass(tone: BadgeTone): string {
    return cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONE_CLASS[tone],
    );
}

export const SKILLS_TABS: { value: SkillsTab; label: string }[] = [
    { value: "mine", label: "Mes compétences" },
    { value: "gaps", label: "Lacunes" },
    { value: "catalog", label: "Catalogue" },
];

export function parseSkillsTabParam(raw: string | null): SkillsTab {
    const value = (raw ?? "mine").trim().toLowerCase();
    const allowed: SkillsTab[] = ["mine", "gaps", "catalog"];
    return allowed.includes(value as SkillsTab) ? (value as SkillsTab) : "mine";
}

export function formatAvgLevel(avg: number): string {
    if (!Number.isFinite(avg)) return "—/10";
    const rounded = Math.round(avg * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${text}/10`;
}

export function groupByCategory<T extends { category: string | null; skill_name: string }>(
    items: T[],
): Array<{ category: string; items: T[] }> {
    const map = new Map<string, T[]>();
    for (const item of items) {
        const key = item.category?.trim() || "Autres";
        const list = map.get(key);
        if (list) list.push(item);
        else map.set(key, [item]);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b, "fr"))
        .map(([category, groupItems]) => ({
            category,
            items: [...groupItems].sort((x, y) => x.skill_name.localeCompare(y.skill_name, "fr")),
        }));
}

export function filterSkillsByName<T extends { skill_name: string }>(items: T[], query: string): T[] {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.skill_name.toLowerCase().includes(q));
}

/** @deprecated Préférer formatLastUsed — conservé pour imports legacy */
export function formatSkillDate(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    const date = new Date(parsed);
    if (date.getFullYear() < 2020) return null;
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
