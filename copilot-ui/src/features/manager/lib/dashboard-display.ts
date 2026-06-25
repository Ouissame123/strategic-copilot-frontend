import type { Decision, HealthLabel } from "@/features/manager/types/dashboard";

export const RISK_TYPE_LABELS: Record<string, string> = {
    critical_skills_gap: "Compétences critiques manquantes",
    resource_overload: "Surcharge ressources",
    key_talent_dependency: "Dépendance talent clé",
    schedule_drift: "Dérive planning",
    turnover: "Risque turnover",
    conflict: "Conflit allocation",
    health_warning: "Santé projet dégradée",
    fragility_high: "Fragilité élevée",
    resource_tension: "Tension ressources",
    overload: "Surcharge équipe",
    skills_gap: "Gap compétences",
    data_quality_gap: "Qualité données insuffisante",
};

export const DECISION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    Continue: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    Adjust: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    Stop: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

export const SEVERITY_COLORS: Record<string, string> = {
    critical: "text-red-700 bg-red-100",
    high: "text-red-600 bg-red-50",
    medium: "text-orange-600 bg-orange-50",
    low: "text-blue-600 bg-blue-50",
};

export const HEALTH_META: Record<
    HealthLabel,
    { label: string; scoreText: string; scoreBg: string; sectionBg: string; border: string }
> = {
    healthy: {
        label: "Sain",
        scoreText: "text-green-700",
        scoreBg: "bg-green-50",
        sectionBg: "bg-green-50",
        border: "border-green-200",
    },
    watch: {
        label: "Surveillance",
        scoreText: "text-blue-700",
        scoreBg: "bg-blue-50",
        sectionBg: "bg-blue-50",
        border: "border-blue-200",
    },
    attention: {
        label: "Attention",
        scoreText: "text-orange-700",
        scoreBg: "bg-orange-50",
        sectionBg: "bg-orange-50",
        border: "border-orange-200",
    },
    critical: {
        label: "Critique",
        scoreText: "text-red-700",
        scoreBg: "bg-red-50",
        sectionBg: "bg-red-50",
        border: "border-red-200",
    },
};

export function riskTypeLabel(riskType: string | null | undefined): string {
    const key = String(riskType ?? "").trim();
    if (!key) return "Alerte";
    return RISK_TYPE_LABELS[key] ?? key.replace(/_/g, " ");
}

/** Classe commune cartes dashboard — alignée design system workspace. */
export const DASHBOARD_CARD_CLASS = "rounded-xl border border-secondary bg-primary p-4 shadow-sm";

export function decisionLabelFr(decision: string | null | undefined): string {
    const key = String(decision ?? "").trim().toLowerCase();
    if (key === "continue" || key === "proceed") return "Poursuivre";
    if (key === "adjust") return "Ajuster";
    if (key === "stop") return "Arrêter";
    const raw = String(decision ?? "").trim();
    return raw || "—";
}

/** Affichage lisible des libellés Helper (évite JSON brut dans l'UI). */
export function formatHelperQueueLabel(raw: string | null | undefined): string {
    const text = String(raw ?? "").trim();
    if (!text) return "—";
    const bracket = text.indexOf("[");
    if (bracket === -1) {
        return text.length > 140 ? `${text.slice(0, 137)}…` : text;
    }
    const prefix = text.slice(0, bracket).replace(/:\s*$/, "").trim();
    try {
        const parsed = JSON.parse(text.slice(bracket)) as unknown;
        if (Array.isArray(parsed)) {
            const names = parsed
                .map((row) => {
                    if (row == null || typeof row !== "object") return null;
                    const name = (row as Record<string, unknown>).talent_name;
                    return typeof name === "string" && name.trim() ? name.trim() : null;
                })
                .filter((n): n is string => Boolean(n));
            if (names.length > 0) {
                const preview = names.slice(0, 2).join(", ");
                const extra = names.length > 2 ? ` +${names.length - 2}` : "";
                return prefix ? `${prefix} : ${preview}${extra}` : `${preview}${extra}`;
            }
        }
    } catch {
        /* fallback truncate */
    }
    return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

export function decisionStyle(decision: string | null | undefined) {
    const key = String(decision ?? "").trim();
    const normalized =
        key.toLowerCase() === "continue"
            ? "Continue"
            : key.toLowerCase() === "adjust"
              ? "Adjust"
              : key.toLowerCase() === "stop"
                ? "Stop"
                : key;
    return DECISION_COLORS[normalized] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
}

export function resolveManagerDashboardLink(link: string): string {
    if (!link?.trim()) return "/workspace/manager/dashboard";
    if (link.startsWith("/workspace/manager")) return link;
    if (link.startsWith("/manager")) return `/workspace${link}`;
    if (link.startsWith("/")) return `/workspace/manager${link}`;
    return `/workspace/manager/${link}`;
}

export function formatDisplayValue(value: string | number | null | undefined): string {
    if (value == null || value === "") return "—";
    return String(value);
}

export function readRecordString(row: unknown, key: string): string | null {
    if (row == null || typeof row !== "object" || Array.isArray(row)) return null;
    const v = (row as Record<string, unknown>)[key];
    if (v == null) return null;
    const s = String(v).trim();
    return s || null;
}

export function readRecordNumber(row: unknown, key: string): number | null {
    if (row == null || typeof row !== "object" || Array.isArray(row)) return null;
    const v = (row as Record<string, unknown>)[key];
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}

export type DecisionKey = Decision;
