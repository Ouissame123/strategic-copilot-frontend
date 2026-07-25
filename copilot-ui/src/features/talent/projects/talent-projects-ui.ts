import type { AllocationStatus, ProjectTab } from "@/types/talent-projects";
import { cx } from "@/utils/cx";

export type BadgeTone = "blue" | "violet" | "amber" | "slate" | "emerald" | "red" | "orange";

export const ALLOCATION_TONES: Record<AllocationStatus, BadgeTone> = {
    available: "emerald",
    light: "emerald",
    engaged: "blue",
    busy: "amber",
    saturated: "red",
};

export const ALLOCATION_STATUS_LABELS_FR: Record<AllocationStatus, string> = {
    available: "disponible",
    light: "légèrement engagé",
    engaged: "engagé",
    busy: "occupé",
    saturated: "saturé",
};

export const SEVERITY_TONES: Record<"critical" | "high" | "medium" | "low", BadgeTone> = {
    critical: "red",
    high: "orange",
    medium: "amber",
    low: "slate",
};

const TONE_CLASS: Record<BadgeTone, string> = {
    blue: "bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50",
    violet: "bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50",
    amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700/60",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50",
    red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/50",
    orange: "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/50",
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

export function formatIsoDate(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Date(parsed).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
