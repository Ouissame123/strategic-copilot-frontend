import { patchManagerRiskAlert } from "@/api/manager-risk-alerts.api";
import type { AlertItem, MissionControlRiskAlert } from "@/types/api.types";

export type ProjectRiskAlertStatus = "open" | "resolved" | "dismissed";
export type ProjectRiskAlertSeverity = "critical" | "high" | "medium" | "low";

export interface ProjectRiskAlert {
    id: string;
    risk_type: string;
    title: string;
    description: string;
    message: string;
    severity: ProjectRiskAlertSeverity;
    status: ProjectRiskAlertStatus;
    risk_score: number;
    impact_area: string;
    owner_role: string;
    source_agent: string;
    entity_type: string;
    entity_id: string;
    detected_at: string;
    resolved_at: string | null;
    updated_at: string;
}

export interface ProjectRisksListResponse {
    status: string;
    risks: ProjectRiskAlert[];
    count: number;
    counts?: { open: number; resolved: number; dismissed: number };
}

export type ProjectRiskPatchAction = "resolve" | "dismiss";

export interface ProjectRiskPatchResponse {
    status: string;
    new_status?: ProjectRiskAlertStatus;
    resolved_at?: string | null;
    message?: string;
}

function normalizeSeverity(raw: string | null | undefined): ProjectRiskAlertSeverity {
    const severity = String(raw ?? "low").toLowerCase() as ProjectRiskAlertSeverity;
    return ["critical", "high", "medium", "low"].includes(severity) ? severity : "low";
}

function normalizeStatus(raw: string | null | undefined): ProjectRiskAlertStatus {
    const s = String(raw ?? "open").toLowerCase();
    if (s === "resolved" || s === "closed" || s.includes("resolv")) return "resolved";
    if (s === "dismissed" || s === "ignored" || s === "dismiss" || s.includes("ignor")) return "dismissed";
    return "open";
}

function normalizeRisk(raw: Record<string, unknown>): ProjectRiskAlert | null {
    const id = String(raw.id ?? raw.alert_id ?? raw.risk_alert_id ?? "").trim();
    if (!id) return null;
    const status = normalizeStatus(raw.status != null ? String(raw.status) : undefined);
    return {
        id,
        risk_type: String(raw.risk_type ?? raw.category ?? ""),
        title: String(raw.title ?? ""),
        description: String(raw.description ?? ""),
        message: String(raw.message ?? raw.title ?? ""),
        severity: normalizeSeverity(raw.severity != null ? String(raw.severity) : undefined),
        status,
        risk_score: Number(raw.risk_score ?? raw.score) || 0,
        impact_area: String(raw.impact_area ?? ""),
        owner_role: String(raw.owner_role ?? ""),
        source_agent: String(raw.source_agent ?? ""),
        entity_type: String(raw.entity_type ?? ""),
        entity_id: String(raw.entity_id ?? ""),
        detected_at: String(raw.detected_at ?? raw.created_at ?? ""),
        resolved_at: raw.resolved_at != null ? String(raw.resolved_at) : null,
        updated_at: String(raw.updated_at ?? ""),
    };
}

export function mapDetailAlertToProjectRisk(alert: AlertItem | MissionControlRiskAlert): ProjectRiskAlert | null {
    return normalizeRisk(alert as unknown as Record<string, unknown>);
}

function buildCounts(risks: ProjectRiskAlert[]): ProjectRisksListResponse["counts"] {
    return {
        open: risks.filter((r) => r.status === "open").length,
        resolved: risks.filter((r) => r.status === "resolved").length,
        dismissed: risks.filter((r) => r.status === "dismissed").length,
    };
}

/** Alimente l’onglet Risques depuis `active_alerts` du détail projet (`wmp-detail-v1`). */
export function listProjectRisksFromAlerts(
    alerts: Array<AlertItem | MissionControlRiskAlert> = [],
): ProjectRisksListResponse {
    const risks = alerts.map((a) => mapDetailAlertToProjectRisk(a)).filter((r): r is ProjectRiskAlert => r != null);
    return {
        status: "success",
        risks,
        count: risks.length,
        counts: buildCounts(risks),
    };
}

/** PATCH `/webhook/wmn-alert-v3/manager/risk-alerts/:id` — `resolve` | `ignore` | `dismiss`. */
export async function patchProjectRisk(
    _projectId: string,
    riskId: string,
    action: ProjectRiskPatchAction,
): Promise<ProjectRiskPatchResponse> {
    const patchAction = action === "resolve" ? "resolve" : "ignore";
    await patchManagerRiskAlert(riskId, patchAction);
    const newStatus: ProjectRiskAlertStatus = action === "resolve" ? "resolved" : "dismissed";
    return {
        status: "success",
        new_status: newStatus,
        resolved_at: action === "resolve" ? new Date().toISOString() : null,
    };
}

/** Pas de DELETE dédié — masquage via `dismiss` sur wmn-alert-v3. */
export async function deleteProjectRisk(_projectId: string, riskId: string): Promise<void> {
    await patchManagerRiskAlert(riskId, "dismiss");
}
