import type { RiskType, Severity } from "@/api/rh-risks.api";

/** Bordures gauche par sévérité — mapping couleur statique (pas de calcul métier). */
export const SEVERITY_BORDER: Record<Severity, string> = {
    critical: "border-l-red-500",
    high: "border-l-orange-400",
    medium: "border-l-amber-300",
    low: "border-l-slate-300",
};

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export const SEVERITY_SECTION_LABELS: Record<Severity, string> = {
    critical: "🔥 CRITIQUE",
    high: "ÉLEVÉE",
    medium: "MOYENNE",
    low: "FAIBLE",
};

/** Dictionnaire statique risk_type → action_type RH (pas de logique métier). */
export function mapRiskToActionType(riskType: RiskType | string): string {
    const map: Record<string, string> = {
        overload: "reallocation",
        contract_expiring: "recruitment",
        critical_skill: "training",
        no_manager: "reallocation",
    };
    return map[riskType] ?? "reallocation";
}

export function formatRiskMetricDisplay(riskType: RiskType, metricValue: number | null): string | null {
    if (metricValue == null) return null;
    if (riskType === "overload") return `${metricValue}%`;
    if (riskType === "contract_expiring") return `${metricValue}j`;
    return String(metricValue);
}

export function formatContractDate(iso: string | null | undefined): string {
    if (!iso?.trim()) return "—";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "—";
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function formatAllocationPct(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return "—";
    return `${Math.round(value)}%`;
}
