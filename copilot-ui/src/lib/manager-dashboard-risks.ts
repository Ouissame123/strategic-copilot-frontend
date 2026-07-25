import type { RisksResponse, RiskAlertItem, RisksSummary } from "@/api/project-risks.api";
import type { DashboardRiskAlert, ManagerDashboardV3Response } from "@/features/manager/types/dashboard-v3";
import type { ManagerDashboardV4Response } from "@/features/manager/types/dashboard-v4";
import { parsePaginationMeta, type PaginationMeta } from "@/lib/pagination-utils";
import { asRecord } from "@/utils/unwrap-api-payload";

export type ManagerRisksQueryResult = RisksResponse & {
    pagination?: PaginationMeta;
    stats?: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
};

function emptySummary(): RisksSummary {
    return {
        total_alerts: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        projects_tracked: 0,
        avg_risk_score: null,
        at_risk_projects: 0,
    };
}

function v3AlertToRiskItem(alert: DashboardRiskAlert): RiskAlertItem {
    return {
        alert_id: alert.id,
        project_id: alert.project_id,
        project_name: alert.project_name || null,
        project_status: null,
        severity: alert.severity,
        category: alert.risk_type || null,
        title: alert.pdf_rule || null,
        message: alert.message || null,
        status: "open",
        detected_at: alert.detected_at || null,
        resolved_at: null,
        created_at: alert.detected_at || null,
        risk_score: Number.isFinite(alert.risk_score) ? alert.risk_score : null,
        source_agent: "watchdog",
    };
}

function buildSummaryFromV3(items: RiskAlertItem[], dashboard: ManagerDashboardV3Response): RisksSummary {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const item of items) {
        const s = String(item.severity ?? "").toLowerCase();
        if (s === "critical" || s === "critique") critical += 1;
        else if (s === "high" || s === "Ã©levÃ©" || s === "eleve") high += 1;
        else if (s === "medium" || s === "moyen") medium += 1;
        else low += 1;
    }

    const s = dashboard.risk_alerts.summary;

    return {
        total_alerts: items.length || s.total_open || 0,
        critical: critical || s.critical || 0,
        high: high || s.high || 0,
        medium: medium || s.medium || 0,
        low,
        projects_tracked: new Set(items.map((i) => i.project_id).filter(Boolean)).size,
        avg_risk_score: s.avg_risk_score || dashboard.health.avg_viability || null,
        at_risk_projects: dashboard.risk_alerts.project_fragility.length,
    };
}

function isV3Dashboard(dashboard: unknown): dashboard is ManagerDashboardV3Response {
    const row = asRecord(dashboard);
    return Boolean(row.risk_alerts && typeof row.risk_alerts === "object");
}

/**
 * Mappe une rÃ©ponse dashboard â†’ RisksResponse (lecture seule).
 * Sur v4_factual (plus dâ€™alertes dans cet endpoint) â†’ liste vide.
 */
export function mapDashboardToRisksResponse(
    dashboard: ManagerDashboardV3Response | ManagerDashboardV4Response | unknown,
    projectId: string | null,
): RisksResponse {
    if (!isV3Dashboard(dashboard)) {
        return {
            status: "success",
            scope: "manager",
            page_label: "dashboard",
            enterprise_id: strId(dashboard),
            filter: { project_id: projectId },
            summary: emptySummary(),
            projects: [],
            items: [],
        };
    }

    let alerts = dashboard.risk_alerts.alerts;
    if (projectId) {
        alerts = alerts.filter((a) => String(a.project_id ?? "").trim() === projectId);
    }

    const items = alerts.map(v3AlertToRiskItem).filter((i) => i.alert_id);

    return {
        status: "success",
        scope: "manager",
        page_label: "dashboard",
        enterprise_id: dashboard.enterprise_id,
        filter: { project_id: projectId },
        summary: buildSummaryFromV3(items, dashboard),
        projects: [],
        items,
    };
}

function strId(dashboard: unknown): string {
    return String(asRecord(dashboard).enterprise_id ?? "");
}

function apiRowToRiskItem(row: unknown): RiskAlertItem | null {
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    const alertId = String(r.alert_id ?? r.risk_alert_id ?? r.id ?? "").trim();
    if (!alertId) return null;
    return {
        alert_id: alertId,
        project_id: String(r.project_id ?? "").trim(),
        project_name: r.project_name != null ? String(r.project_name) : null,
        project_status: r.project_status != null ? String(r.project_status) : null,
        severity: (r.severity as RiskAlertItem["severity"]) ?? null,
        category: r.category != null ? String(r.category) : r.risk_type != null ? String(r.risk_type) : null,
        title: r.title != null ? String(r.title) : null,
        message: r.message != null ? String(r.message) : r.description != null ? String(r.description) : null,
        status: r.status != null ? String(r.status) : "open",
        detected_at: r.detected_at != null ? String(r.detected_at) : null,
        resolved_at: r.resolved_at != null ? String(r.resolved_at) : null,
        created_at: r.created_at != null ? String(r.created_at) : r.detected_at != null ? String(r.detected_at) : null,
        risk_score: r.risk_score != null && Number.isFinite(Number(r.risk_score)) ? Number(r.risk_score) : null,
        source_agent: r.source_agent != null ? String(r.source_agent) : null,
    };
}

/** Parse une rÃ©ponse risks API brute (hors dashboard). */
export function parseRisksApiPayload(raw: unknown): RisksResponse {
    const root = asRecord(raw);
    const itemsRaw = Array.isArray(root.items)
        ? root.items
        : Array.isArray(root.alerts)
          ? root.alerts
          : [];
    const items = itemsRaw.map(apiRowToRiskItem).filter((i): i is RiskAlertItem => i != null);
    const summaryRaw = asRecord(root.summary);
    return {
        status: "success",
        scope: "manager",
        page_label: String(root.page_label ?? "risks"),
        enterprise_id: String(root.enterprise_id ?? ""),
        filter: asRecord(root.filter) as RisksResponse["filter"],
        summary: {
            total_alerts: Number(summaryRaw.total_alerts) || items.length,
            critical: Number(summaryRaw.critical) || 0,
            high: Number(summaryRaw.high) || 0,
            medium: Number(summaryRaw.medium) || 0,
            low: Number(summaryRaw.low) || 0,
            projects_tracked: Number(summaryRaw.projects_tracked) || 0,
            avg_risk_score:
                summaryRaw.avg_risk_score != null && Number.isFinite(Number(summaryRaw.avg_risk_score))
                    ? Number(summaryRaw.avg_risk_score)
                    : null,
            at_risk_projects: Number(summaryRaw.at_risk_projects) || 0,
        },
        projects: Array.isArray(root.projects) ? (root.projects as RisksResponse["projects"]) : [],
        items,
    };
}

export function attachPaginationFromRaw(raw: unknown, result: RisksResponse): ManagerRisksQueryResult {
    const pagination = parsePaginationMeta(raw);
    return pagination ? { ...result, pagination } : result;
}
