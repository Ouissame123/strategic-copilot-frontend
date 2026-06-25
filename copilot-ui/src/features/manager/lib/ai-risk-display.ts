import type { AiActiveRisk } from "@/features/manager/types/ai-recommendation";

/** Mapping technique → label métier (aligné PDF). */
export const RISK_TYPE_LABELS: Record<string, string> = {
    critical_skills_gap: "Compétences critiques manquantes",
    health_warning: "Santé projet dégradée",
    resource_overload: "Surcharge ressources",
    resource_tension: "Tension ressources",
    key_talent_dependency: "Dépendance talent clé",
    structural_fragility: "Fragilité structurelle",
    planning_delay: "Retard planning",
    project_critical: "Projet critique",
    skills_gap: "Gap compétences",
    capacity_missing: "Données capacité manquantes",
    missing_milestone: "Jalon non défini",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
    return UUID_RE.test(value.trim());
}

function formatAlertCode(code: string): string {
    return code
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getRiskTitle(risk: AiActiveRisk): string {
    const title = risk.title?.trim() ?? "";
    if (title && !isUuid(title)) return title;

    const riskType = risk.risk_type?.trim() ?? "";
    if (riskType && RISK_TYPE_LABELS[riskType]) return RISK_TYPE_LABELS[riskType];

    const alertCode = risk.alert_code?.trim() ?? "";
    if (alertCode) return formatAlertCode(alertCode);

    const body = risk.message ?? risk.description ?? "";
    if (body.trim()) return body.trim().slice(0, 60);

    return "Risque détecté";
}

export type RiskSeverityVariant = "destructive" | "warning" | "default";

export function severityVariant(severity?: string | null): RiskSeverityVariant {
    const s = String(severity ?? "").toLowerCase();
    if (s === "critical" || s === "high") return "destructive";
    if (s === "medium") return "warning";
    return "default";
}

export function severityBadgeClass(variant: RiskSeverityVariant): string {
    if (variant === "destructive") return "text-red-700 bg-red-50 ring-red-200";
    if (variant === "warning") return "text-amber-700 bg-amber-50 ring-amber-200";
    return "text-slate-600 bg-slate-50 ring-slate-200";
}
