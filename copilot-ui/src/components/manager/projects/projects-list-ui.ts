import type { ProjectListItem } from "@/types/api.types";

export function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
}

export function fmtScore(value: number | null | undefined): string | null {
    if (value == null || !Number.isFinite(value)) return null;
    return value.toFixed(1);
}

export function viabilityTextClass(score: number | null | undefined): string {
    if (score == null || !Number.isFinite(score)) return "text-slate-400";
    if (score < 4) return "text-red-600";
    if (score < 7) return "text-amber-600";
    return "text-emerald-600";
}

export function normalizeCopilotDecision(
    value: string | null | undefined,
): "Continue" | "Adjust" | "Stop" | null {
    const d = String(value ?? "").trim();
    if (d === "Continue" || d === "Adjust" || d === "Stop") return d;
    return null;
}

export const pillBase =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset";

export function optionTypePillClass(optionType: string): string {
    const t = String(optionType ?? "").toLowerCase();
    if (t.includes("reallocation") || t.includes("reinforce")) {
        return "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300";
    }
    if (t.includes("delay")) {
        return "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200";
    }
    if (t.includes("stop") || t.includes("scope")) {
        return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300";
    }
    return "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-300";
}

export function confidencePct(confidence: number | null | undefined): number {
    if (confidence == null || !Number.isFinite(confidence)) return 0;
    if (confidence <= 1) return Math.round(confidence * 100);
    return Math.round(clamp(confidence, 0, 100));
}

/** Étiquette visuelle de charge — seuils d'affichage uniquement, pas un score métier. */
export function capacityLoadLabel(pct: number | null | undefined): {
    labelKey: "under" | "balanced" | "over" | "unknown";
    toneClass: string;
} {
    if (pct == null || !Number.isFinite(pct)) {
        return { labelKey: "unknown", toneClass: "text-slate-400" };
    }
    if (pct < 90) return { labelKey: "under", toneClass: "text-slate-500 dark:text-slate-400" };
    if (pct <= 110) return { labelKey: "balanced", toneClass: "text-emerald-600 dark:text-emerald-400" };
    return { labelKey: "over", toneClass: "text-amber-600 dark:text-amber-400" };
}

export function budgetConsumptionPct(project: ProjectListItem): number | null {
    const planned = project.budget_rh_planned;
    const actual = project.budget_rh_actual;
    if (planned == null || actual == null || planned <= 0) return null;
    return (actual / planned) * 100;
}

export function deadlineUrgencyBadge(
    urgency: ProjectListItem["deadline_urgency"],
): { labelKey: "overdue" | "urgent" | "warning"; className: string } | null {
    if (urgency === "overdue") {
        return {
            labelKey: "overdue",
            className:
                "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50",
        };
    }
    if (urgency === "urgent") {
        return {
            labelKey: "urgent",
            className:
                "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50",
        };
    }
    if (urgency === "warning") {
        return {
            labelKey: "warning",
            className:
                "bg-yellow-50 text-yellow-800 ring-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-200 dark:ring-yellow-900/40",
        };
    }
    return null;
}

/** Badge statut neutre (pas Continue/Adjust/Stop). */
export function statusNeutralBadgeClass(status: string): string {
    if (status === "active") {
        return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40";
    }
    if (status === "planned") {
        return "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900/40";
    }
    if (status === "on_hold") {
        return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
    }
    if (status === "completed") {
        return "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700";
    }
    if (status === "cancelled") {
        return "bg-slate-100 text-slate-400 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-500 dark:ring-slate-700";
    }
    return "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700";
}
