import type { AllocationStatus, ProjectStatus } from "@/types/talent-projects";
import type { ProjectTab } from "@/types/talent-projects";
import { cx } from "@/utils/cx";

export type BadgeTone = "blue" | "violet" | "amber" | "slate" | "emerald" | "red" | "orange";

export const PROJECT_STATUS_TONES: Record<ProjectStatus, BadgeTone> = {
    planned: "slate",
    active: "emerald",
    on_hold: "amber",
    completed: "blue",
    cancelled: "red",
};

export const ALLOCATION_TONES: Record<AllocationStatus, BadgeTone> = {
    available: "emerald",
    light: "emerald",
    engaged: "blue",
    busy: "amber",
    saturated: "red",
};

export const SEVERITY_TONES: Record<"critical" | "high" | "medium" | "low", BadgeTone> = {
    critical: "red",
    high: "orange",
    medium: "amber",
    low: "slate",
};

const TONE_CLASS: Record<BadgeTone, string> = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/50",
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

export const PROJECT_TABS: { value: ProjectTab; label: string }[] = [
    { value: "active", label: "Actifs" },
    { value: "planned", label: "Planifiés" },
    { value: "past", label: "Passés" },
    { value: "all", label: "Tous" },
];

export function parseProjectTabParam(raw: string | null): ProjectTab {
    const value = (raw ?? "active").trim().toLowerCase();
    const allowed: ProjectTab[] = ["all", "active", "planned", "past"];
    return allowed.includes(value as ProjectTab) ? (value as ProjectTab) : "active";
}

export type TalentProjectsDensity = "compact" | "comfortable";

export const TALENT_PROJECTS_DENSITY_KEY = "talent_projects_density";

export function readTalentProjectsDensity(): TalentProjectsDensity {
    try {
        const raw = localStorage.getItem(TALENT_PROJECTS_DENSITY_KEY);
        return raw === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

export function writeTalentProjectsDensity(density: TalentProjectsDensity): void {
    try {
        localStorage.setItem(TALENT_PROJECTS_DENSITY_KEY, density);
    } catch {
        /* ignore */
    }
}

export function formatIsoDate(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Date(parsed).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
