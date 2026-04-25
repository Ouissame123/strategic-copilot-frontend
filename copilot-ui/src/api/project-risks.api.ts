import { apiGet, type ApiClientOptions } from "@/utils/apiClient";
import type { Severity } from "@/api/workspace-manager.api";
import { assertUuid } from "@/api/manager-api-contract";

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
