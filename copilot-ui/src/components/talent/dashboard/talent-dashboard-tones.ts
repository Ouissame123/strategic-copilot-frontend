import type { AllocationStatus, AlertSeverity, HealthLabel, MobilityFlag } from "@/types/talent-dashboard";

export const HEALTH_TONES = {
    excellent: "emerald",
    bon: "blue",
    "à surveiller": "amber",
    "à améliorer": "red",
    inconnu: "slate",
} as const satisfies Record<HealthLabel, string>;

export const MOBILITY_TONES = {
    stable: "emerald",
    watch: "amber",
    at_risk: "red",
} as const satisfies Record<MobilityFlag, string>;

export const SEVERITY_TONES = {
    critical: "red",
    high: "orange",
    medium: "amber",
    low: "slate",
} as const satisfies Record<AlertSeverity, string>;

export const ALLOCATION_TONES = {
    available: "emerald",
    light: "emerald",
    engaged: "blue",
    busy: "amber",
    saturated: "red",
} as const satisfies Record<AllocationStatus, string>;

/** Libellés FR pour le statut d'allocation renvoyé par l'API (`kpis.allocation.status`). */
export const ALLOCATION_STATUS_LABELS: Record<AllocationStatus, string> = {
    available: "Disponible",
    light: "Légèrement engagé",
    engaged: "Bien engagé",
    busy: "Occupé",
    saturated: "Saturé",
};

export const PRIORITY_TONES = {
    high: "red",
    medium: "amber",
    low: "slate",
} as const;

type ToneKey = "emerald" | "blue" | "amber" | "red" | "orange" | "slate";

const TONE_CLASSES: Record<ToneKey, { badge: string; bar: string; text: string }> = {
    emerald: {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
        bar: "bg-emerald-500",
        text: "text-emerald-700 dark:text-emerald-300",
    },
    blue: {
        badge: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200",
        bar: "bg-blue-500",
        text: "text-blue-700 dark:text-blue-300",
    },
    amber: {
        badge: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
        bar: "bg-amber-500",
        text: "text-amber-700 dark:text-amber-300",
    },
    red: {
        badge: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200",
        bar: "bg-red-500",
        text: "text-red-700 dark:text-red-300",
    },
    orange: {
        badge: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-200",
        bar: "bg-orange-500",
        text: "text-orange-700 dark:text-orange-300",
    },
    slate: {
        badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
        bar: "bg-slate-400",
        text: "text-slate-600 dark:text-slate-400",
    },
};

export function toneClasses(tone: string | null | undefined) {
    const key = (tone ?? "slate") as ToneKey;
    return TONE_CLASSES[key] ?? TONE_CLASSES.slate;
}
