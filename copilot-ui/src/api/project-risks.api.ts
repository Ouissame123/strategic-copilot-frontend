import { httpClient } from "@/lib/http-client";
import { apiGet, type ApiClientOptions } from "@/utils/apiClient";
import type { Severity } from "@/api/workspace-manager.api";
import { assertUuid } from "@/api/manager-api-contract";

export type PostProjectRiskKpiBody = {
    project_id?: string | null;
    use_ai?: boolean;
    force_refresh?: boolean;
    trigger_source?: string;
};

export type WatchdogScanBody = {
    project_id?: string;
    talent_id?: string;
    use_ai?: boolean;
    force_refresh?: boolean;
    trigger_source?: string;
};

export type WatchdogScanResult = {
    status?: string;
    items: unknown[];
};

function buildProjectRiskKpiPayload(body: PostProjectRiskKpiBody): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        use_ai: body.use_ai ?? true,
        force_refresh: body.force_refresh ?? true,
    };
    if (body.trigger_source) payload.trigger_source = body.trigger_source;
    const pid = body.project_id?.trim();
    if (pid) payload.project_id = assertUuid(pid, "project_id");
    return payload;
}

function normalizeWatchdogScanResponse(data: unknown): WatchdogScanResult {
    if (!data || typeof data !== "object") return { items: [] };
    const root = data as Record<string, unknown>;
    const rawItems = root.items ?? root.alerts ?? root.risk_alerts ?? root.active_alerts;
    return {
        status: root.status != null ? String(root.status) : undefined,
        items: Array.isArray(rawItems) ? rawItems : [],
    };
}

export type RiskLevel = "critical" | "high" | "medium" | "low";

export interface RisksSummary {
    total_alerts: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    projects_tracked: number;
    avg_risk_score: number | null;
    at_risk_projects: number;
}

export interface ProjectRiskRow {
    project_id: string;
    project_name: string | null;
    project_status: string | null;
    risk_score: number | null;
    risk_level: RiskLevel | null;
    trend: string | null;
    computed_at: string | null;
    drivers: {
        fragility_score: number | null;
        anxiety_pulse: number | null;
        chronic_overload_score: number | null;
        critical_skills_gap_score: number | null;
        key_talent_dependency_score: number | null;
    } | null;
}

export interface RiskAlertItem {
    alert_id: string;
    project_id: string;
    project_name: string | null;
    project_status: string | null;
    severity: Severity | null;
    category: string | null;
    title: string | null;
    message: string | null;
    status: string | null;
    detected_at: string | null;
    resolved_at: string | null;
    created_at: string | null;
    risk_score: number | null;
    source_agent: string | null;
}

export interface RisksResponse {
    status: "success";
    scope: "manager";
    page_label: string;
    enterprise_id: string;
    filter: { project_id: string | null };
    summary: RisksSummary;
    projects: ProjectRiskRow[];
    items: RiskAlertItem[];
}

export async function getProjectRisks(projectId?: string, opts?: ApiClientOptions): Promise<RisksResponse> {
    const pid = projectId?.trim();
    const suffix = pid ? `?project_id=${encodeURIComponent(assertUuid(pid, "project_id"))}` : "";
    return apiGet<RisksResponse>(`/webhook/api/project/risks${suffix}`, opts);
}

/** POST Risk_KPI projet (`WF_Risk_KPI_Senior_v3_1`) — exige `project_id` UUID. */
export async function postProjectRiskKpi(body: PostProjectRiskKpiBody) {
    const payload = buildProjectRiskKpiPayload(body);
    if (!payload.project_id) {
        throw new Error("project_id requis pour POST /webhook/api/project/risks");
    }
    const { data } = await httpClient.post<RisksResponse>("/webhook/api/project/risks", payload, {
        skipGlobalHttpErrorToast: true,
    });
    return data;
}

/**
 * Scan Watchdog — route selon le contexte :
 * - `project_id` → POST `/webhook/api/project/risks` (Risk_KPI v3.1)
 * - talent / scan global → POST `/webhook/api/watchdog/scan` (WF_Watchdog — talent_id optionnel)
 */
export async function postWatchdogScan(body: WatchdogScanBody): Promise<WatchdogScanResult> {
    const projectId = body.project_id?.trim();
    if (projectId) {
        const data = await postProjectRiskKpi({
            project_id: projectId,
            use_ai: body.use_ai,
            force_refresh: body.force_refresh,
            trigger_source: body.trigger_source ?? "manual_scan_button",
        });
        return { status: data.status, items: data.items ?? [] };
    }

    const scanPayload: Record<string, unknown> = {
        use_ai: body.use_ai ?? true,
    };
    const talentId = body.talent_id?.trim();
    if (talentId) {
        scanPayload.talent_id = assertUuid(talentId, "talent_id");
    }

    const { data } = await httpClient.post<unknown>("/webhook/api/watchdog/scan", scanPayload, {
        skipGlobalHttpErrorToast: true,
    });
    return normalizeWatchdogScanResponse(data);
}

/** Re-déclenche Risk_KPI après action manager — fire-and-forget, non bloquant. */
export function cascadeRiskKpiAfterAlertAction(projectId: string): void {
    const id = projectId.trim();
    if (!id) return;
    void postProjectRiskKpi({
        project_id: id,
        use_ai: false,
        force_refresh: true,
        trigger_source: "manual_alert_action_cascade",
    }).catch(() => {
        /* silent */
    });
}
