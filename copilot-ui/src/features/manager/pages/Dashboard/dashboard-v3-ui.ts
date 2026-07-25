import { cx } from "@/utils/cx";
import type { DashboardDecision, DashboardUrgency, HealthLabel, RiskSeverity } from "@/features/manager/types/dashboard-v3";
import { WORKSPACE_PREFIX } from "@/utils/workspace-routes";

export function viabilityToneClass(score: number | null): string {
    if (score == null || !Number.isFinite(score)) return "text-[color:var(--text-muted)]";
    if (score < 6) return "text-[color:var(--critical)]";
    if (score <= 8) return "text-[color:var(--warn)]";
    return "text-[color:var(--ok)]";
}

export function decisionBadgeClass(decision: DashboardDecision | string | null): string {
    const s = String(decision ?? "").toLowerCase();
    if (s === "continue" || s === "proceed")
        return "bg-[color:color-mix(in_srgb,var(--ok)_14%,transparent)] text-[color:var(--ok)]";
    if (s === "adjust") return "bg-[color:color-mix(in_srgb,var(--warn)_14%,transparent)] text-[color:var(--warn)]";
    if (s === "stop" || s === "reject")
        return "bg-[color:color-mix(in_srgb,var(--critical)_14%,transparent)] text-[color:var(--critical)]";
    return "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]";
}

export function urgencyPanelClass(urgency: DashboardUrgency): string {
    if (urgency === "critical")
        return "border-[color:color-mix(in_srgb,var(--critical)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--critical)_10%,transparent)]";
    if (urgency === "high")
        return "border-[color:color-mix(in_srgb,var(--warn)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--warn)_10%,transparent)]";
    if (urgency === "medium") return "border-[color:var(--border-strong)] bg-[color:var(--accent-muted)]";
    return "border-[color:color-mix(in_srgb,var(--ok)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--ok)_10%,transparent)]";
}

export function healthLabelClass(label: HealthLabel): string {
    if (label === "critical") return "text-[color:var(--critical)]";
    if (label === "attention") return "text-[color:var(--warn)]";
    if (label === "watch") return "text-[color:var(--accent)]";
    return "text-[color:var(--ok)]";
}

export function severityBadgeClass(severity: RiskSeverity): string {
    if (severity === "critical") return "bg-[color:var(--critical)] text-white";
    if (severity === "high") return "bg-[color:var(--warn)] text-[color:var(--bg)]";
    if (severity === "medium") return "bg-[color:color-mix(in_srgb,var(--warn)_70%,transparent)] text-[color:var(--text)]";
    return "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]";
}

export function blocCardClass(className?: string): string {
    return cx(
        "ops-card rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface-1)] p-4 sm:p-5",
        className,
    );
}

export function confidencePct(raw: number): number {
    if (!Number.isFinite(raw)) return 0;
    return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
}

/** Résout uniquement les actions prioritaires connues vers des routes workspace. */
export function resolvePriorityActionHref(action: string): string | null {
    const raw = action.trim();
    if (!raw) return null;
    if (raw.startsWith("/workspace/")) return raw;
    if (raw.startsWith("/")) return `${WORKSPACE_PREFIX.manager}${raw.startsWith("/manager") ? raw.replace(/^\/manager/, "") : raw}`;

    const key = raw.toLowerCase().replace(/\s+/g, "_");
    const map: Record<string, string> = {
        validations: `${WORKSPACE_PREFIX.manager}/validations`,
        open_validations: `${WORKSPACE_PREFIX.manager}/validations`,
        risks: `${WORKSPACE_PREFIX.manager}/risks`,
        open_risks: `${WORKSPACE_PREFIX.manager}/risks`,
        risques: `${WORKSPACE_PREFIX.manager}/risks`,
        projects: `${WORKSPACE_PREFIX.manager}/projects`,
        open_projects: `${WORKSPACE_PREFIX.manager}/projects`,
        projets: `${WORKSPACE_PREFIX.manager}/projects`,
        team: `${WORKSPACE_PREFIX.manager}/team`,
        equipe: `${WORKSPACE_PREFIX.manager}/team`,
        arbitrage: `${WORKSPACE_PREFIX.manager}/projects`,
        talent_requests: `${WORKSPACE_PREFIX.manager}/talent-requests`,
    };
    return map[key] ?? null;
}

export const IMPACT_JSON_ALLOWLIST = [
    "delta_viability",
    "delta_capacity",
    "delta_budget",
    "delta_risk",
    "delay_days",
    "cost_impact",
    "talent_count",
    "summary",
] as const;

export function pickAllowlistedImpacts(impact: Record<string, unknown>): Array<{ key: string; value: string }> {
    const out: Array<{ key: string; value: string }> = [];
    for (const key of IMPACT_JSON_ALLOWLIST) {
        const v = impact[key];
        if (v == null || v === "") continue;
        if (typeof v === "object") continue;
        out.push({ key, value: String(v) });
    }
    return out;
}
