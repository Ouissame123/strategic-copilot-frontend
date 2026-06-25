import type { RisksResponse, RiskAlertItem, RisksSummary } from "@/api/project-risks.api";
import type { DashboardResponse, TopAlert } from "@/types/api.types";
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

function topAlertToRiskItem(alert: TopAlert): RiskAlertItem {
    const alertId = String(alert.alert_id ?? alert.risk_alert_id ?? alert.id ?? "").trim();
    return {
        alert_id: alertId,
        project_id: String(alert.project_id ?? "").trim(),
        project_name: alert.project_name ?? null,
        project_status: null,
        severity: (alert.severity as RiskAlertItem["severity"]) ?? null,
        category: alert.category ?? alert.risk_type ?? null,
        title: alert.title ?? null,
        message: alert.message ?? alert.description ?? alert.rationale ?? null,
        status: alert.status ?? null,
        detected_at: alert.created_at ?? null,
        resolved_at: null,
        created_at: alert.created_at ?? null,
        risk_score: typeof alert.risk_score === "number" ? alert.risk_score : null,
        source_agent: null,
    };
}

function buildSummaryFromItems(items: RiskAlertItem[], dashboard: DashboardResponse): RisksSummary {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const item of items) {
        const s = String(item.severity ?? "").toLowerCase();
        if (s === "critical" || s === "critique") critical += 1;
        else if (s === "high" || s === "élevé" || s === "eleve") high += 1;
        else if (s === "medium" || s === "moyen") medium += 1;
        else low += 1;
    }

    const kpi = dashboard.kpi_cards?.alerts;

    return {
        total_alerts: items.length || kpi?.total_open || 0,
        critical: critical || (typeof kpi?.critical_or_high === "number" ? kpi.critical_or_high : 0),
        high,
        medium,
        low,
        projects_tracked: new Set(items.map((i) => i.project_id).filter(Boolean)).size,
        avg_risk_score: dashboard.health?.avg_viability ?? null,
        at_risk_projects: 0,
    };
}

/** Mappe `GET /webhook/manager/dashboard` → forme RisksResponse (lecture seule, PDF §7.6). */
export function mapDashboardToRisksResponse(
    dashboard: DashboardResponse,
    projectId: string | null,
): RisksResponse {
    let alerts = dashboard.widgets?.top_alerts ?? [];
    if (projectId) {
        alerts = alerts.filter((a) => String(a.project_id ?? "").trim() === projectId);
    }

    const items = alerts.map(topAlertToRiskItem).filter((i) => i.alert_id);

    return {
        status: "success",
        scope: "manager",
        page_label: "dashboard",
        enterprise_id: String((dashboard.meta as Record<string, unknown> | undefined)?.enterprise_id ?? ""),
        filter: { project_id: projectId },
        summary: buildSummaryFromItems(items, dashboard),
        projects: [],
        items,
    };
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
        message:
            r.message != null
                ? String(r.message)
                : r.description != null
                  ? String(r.description)
                  : r.rationale != null
                    ? String(r.rationale)
                    : null,
        status: r.status != null ? String(r.status) : null,
        detected_at: r.detected_at != null ? String(r.detected_at) : r.created_at != null ? String(r.created_at) : null,
        resolved_at: r.resolved_at != null ? String(r.resolved_at) : null,
        created_at: r.created_at != null ? String(r.created_at) : null,
        risk_score: typeof r.risk_score === "number" && Number.isFinite(r.risk_score) ? r.risk_score : null,
        source_agent: r.source_agent != null ? String(r.source_agent) : null,
    };
}

function buildSummaryFromStats(
    items: RiskAlertItem[],
    stats?: { total?: number; critical?: number; high?: number; medium?: number; low?: number },
): RisksSummary {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const item of items) {
        const s = String(item.severity ?? "").toLowerCase();
        if (s === "critical" || s === "critique") critical += 1;
        else if (s === "high" || s === "élevé" || s === "eleve") high += 1;
        else if (s === "medium" || s === "moyen") medium += 1;
        else low += 1;
    }
    return {
        total_alerts: stats?.total ?? items.length,
        critical: stats?.critical ?? critical,
        high: stats?.high ?? high,
        medium: stats?.medium ?? medium,
        low: stats?.low ?? low,
        projects_tracked: new Set(items.map((i) => i.project_id).filter(Boolean)).size,
        avg_risk_score: null,
        at_risk_projects: 0,
    };
}

/** Mappe `GET /webhook/manager/risks` → RisksResponse + pagination. */
export function mapManagerRisksApiResponse(raw: unknown, projectId?: string | null): ManagerRisksQueryResult {
    const root = asRecord(raw);
    const list = root.items ?? root.risk_alerts ?? root.alerts;
    const items = (Array.isArray(list) ? list : []).map(apiRowToRiskItem).filter((i): i is RiskAlertItem => i != null);
    const statsRaw = asRecord(root.stats);
    const stats = {
        total: Number(statsRaw.total) || Number(root.pagination && asRecord(root.pagination).total) || items.length,
        critical: Number(statsRaw.critical) || 0,
        high: Number(statsRaw.high) || 0,
        medium: Number(statsRaw.medium) || 0,
        low: Number(statsRaw.low) || 0,
    };
    const pageSize = Number(asRecord(root.pagination).page_size) || items.length || 20;
    const pagination = parsePaginationMeta(root.pagination, stats.total, pageSize);
    const pid = projectId?.trim() || null;

    return {
        status: "success",
        scope: "manager",
        page_label: "risks",
        enterprise_id: String(root.enterprise_id ?? ""),
        filter: { project_id: pid },
        summary: buildSummaryFromStats(items, stats),
        projects: [],
        items,
        pagination,
        stats,
    };
}
