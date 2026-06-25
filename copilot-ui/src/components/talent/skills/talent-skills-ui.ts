import type { SkillLevelLabel, SkillsTab } from "@/types/talent-skills";
import { cx } from "@/utils/cx";

export type BadgeTone = "blue" | "violet" | "amber" | "slate" | "emerald" | "red" | "orange";

export const LEVEL_TONES: Record<SkillLevelLabel, BadgeTone> = {
    Expert: "emerald",
    Intermédiaire: "blue",
    Débutant: "amber",
    Découverte: "slate",
};

export const SEVERITY_TONES: Record<"high" | "medium" | "low", BadgeTone> = {
    high: "red",
    medium: "amber",
    low: "slate",
};

const TONE_CLASS: Record<BadgeTone, string> = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200",
    orange: "bg-orange-50 text-orange-800 ring-orange-200",
};

export function badgeToneClass(tone: BadgeTone): string {
    return cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONE_CLASS[tone]);
}

export const SKILLS_TABS: { value: SkillsTab; label: string }[] = [
    { value: "mine", label: "Mes compétences" },
    { value: "gaps", label: "Gaps" },
    { value: "catalog", label: "Catalogue" },
];

export function parseSkillsTabParam(raw: string | null): SkillsTab {
    const value = (raw ?? "mine").trim().toLowerCase();
    const allowed: SkillsTab[] = ["mine", "gaps", "catalog"];
    return allowed.includes(value as SkillsTab) ? (value as SkillsTab) : "mine";
}

export type TalentSkillsDensity = "compact" | "comfortable";

export const TALENT_SKILLS_DENSITY_KEY = "talent_skills_density";

export function readTalentSkillsDensity(): TalentSkillsDensity {
    try {
        const raw = localStorage.getItem(TALENT_SKILLS_DENSITY_KEY);
        return raw === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

export function writeTalentSkillsDensity(density: TalentSkillsDensity): void {
    try {
        localStorage.setItem(TALENT_SKILLS_DENSITY_KEY, density);
    } catch {
        /* ignore */
    }
}

export function formatSkillDate(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Date(parsed).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
