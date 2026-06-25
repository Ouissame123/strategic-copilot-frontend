import type { BudgetStatus } from "@/api/rh-budget.api";

export const BORDER_BY_STATUS: Record<BudgetStatus, string> = {
    unset: "border-l-slate-400",
    ok: "border-l-emerald-500",
    warning: "border-l-amber-500",
    critical: "border-l-orange-500",
    exceeded: "border-l-red-500",
};

export const BADGE_BY_STATUS: Record<BudgetStatus, string> = {
    unset: "bg-slate-100 text-slate-700",
    ok: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-800",
    critical: "bg-orange-50 text-orange-800",
    exceeded: "bg-red-50 text-red-700",
};

export const LABEL_BY_STATUS: Record<BudgetStatus, string> = {
    unset: "Non défini",
    ok: "OK",
    warning: "Avertissement",
    critical: "Critique",
    exceeded: "Dépassé",
};

export const INSIGHT_HINT_CLASS: Record<"red" | "orange" | "slate" | "emerald", string> = {
    red: "text-red-700 hover:underline",
    orange: "text-orange-700 hover:underline",
    slate: "text-slate-700 hover:underline",
    emerald: "text-emerald-700 hover:underline",
};

export const SEGMENT_ACTIVE_CLASS: Record<"slate" | "orange" | "red", string> = {
    slate: "bg-slate-100 text-slate-700 font-medium",
    orange: "bg-orange-100 text-orange-700 font-medium",
    red: "bg-red-100 text-red-700 font-medium",
};

export const SEGMENTS: { id: BudgetStatus | "all"; label: string; tone: "slate" | "orange" | "red" }[] = [
    { id: "all", label: "Tous", tone: "slate" },
    { id: "unset", label: "Sans budget", tone: "slate" },
    { id: "critical", label: "⚠ Critiques", tone: "orange" },
    { id: "exceeded", label: "🔴 Dépassés", tone: "red" },
];

export function segmentCount(
    counts: {
        projects_total: number;
        projects_unset: number;
        projects_critical: number;
        projects_exceeded: number;
    },
    id: BudgetStatus | "all",
): number {
    if (id === "all") return counts.projects_total;
    if (id === "unset") return counts.projects_unset;
    if (id === "critical") return counts.projects_critical;
    if (id === "exceeded") return counts.projects_exceeded;
    return 0;
}
