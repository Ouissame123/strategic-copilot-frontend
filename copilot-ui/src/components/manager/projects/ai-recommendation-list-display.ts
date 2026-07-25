import type { ProjectAiRecommendation } from "@/types/api.types";
import type { ProjectListItem } from "@/types/api.types";

export type DecisionColorKey = "green" | "orange" | "red" | "gray";

export type DecisionVisualStyle = {
    bg: string;
    text: string;
    border: string;
    ring: string;
};

/** Palette depuis `ai_recommendation.decision_color` — aucun recalcul métier. */
export const DECISION_PALETTE: Record<DecisionColorKey, DecisionVisualStyle> = {
    green: { bg: "#f0fdf4", text: "#10b981", border: "#86efac", ring: "#10b981" },
    orange: { bg: "#FAEEDA", text: "#f59e0b", border: "#FAC775", ring: "#f59e0b" },
    red: { bg: "#FCEBEB", text: "#ef4444", border: "#F7C1C1", ring: "#ef4444" },
    gray: {
        bg: "var(--color-bg-secondary, #f1f5f9)",
        text: "var(--color-text-tertiary, #94a3b8)",
        border: "var(--color-border-secondary, #e2e8f0)",
        ring: "var(--color-border-secondary, #e2e8f0)",
    },
};

export function getDecisionPalette(decisionColor: string | null | undefined): DecisionVisualStyle {
    const key = String(decisionColor ?? "gray").trim().toLowerCase() as DecisionColorKey;
    return DECISION_PALETTE[key] ?? DECISION_PALETTE.gray;
}

export function deadlineUrgencyClass(urgency: ProjectListItem["deadline_urgency"]): string {
    if (urgency === "overdue") return "text-red-600 font-semibold";
    if (urgency === "urgent" || urgency === "warning") return "text-amber-600 font-semibold";
    return "text-slate-500";
}

export function capacityLoadClass(pct: number): string {
    if (pct > 100) return "text-red-600 font-semibold";
    if (pct > 80) return "text-amber-600 font-semibold";
    return "text-slate-500";
}

export function statusBadgeClass(status: string): { bg: string; text: string; border: string } {
    if (status === "active") return { bg: "#f0fdf4", text: "#10b981", border: "#86efac" };
    if (status === "on_hold") return { bg: "#FAEEDA", text: "#f59e0b", border: "#FAC775" };
    return {
        bg: "var(--color-bg-secondary, #f1f5f9)",
        text: "var(--color-text-tertiary, #94a3b8)",
        border: "var(--color-border-secondary, #e2e8f0)",
    };
}

export function hasAiRecommendation(rec: ProjectAiRecommendation | null | undefined): boolean {
    return rec != null && rec.decision != null && String(rec.decision).trim() !== "";
}
