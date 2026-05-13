import { managerDashboardApi } from "./manager-dashboard.api";
import { managerProjectsApi } from "./manager-projects.api";
import { managerTeamApi } from "./manager-team.api";
import type { ProjectDetailResponse } from "@/types/api.types";

export type Severity = "critical" | "high" | "medium" | "low";

export interface ProjectDetail {
    id: string;
    name: string;
    status: string;
    viability?: {
        viability_score?: number | null;
        score_budget?: number | null;
        decision?: "Continue" | "Adjust" | "Stop" | null;
        explanation?: string | null;
    } | null;
    analysis?: {
        progress_pct?: number | null;
        project_health_score?: number | null;
        capacity_load_pct?: number | null;
        delay_days?: number | null;
        alerts?: Array<{ code: string; type: string; description: string }>;
    } | null;
    recommendations: Array<{ description: string }>;
    risks: Array<{ id: string; severity: Severity; message: string; risk_type: string }>;
    risk_score?: {
        fragility_score?: number | null;
        drivers?: {
            anxiety_pulse?: number | null;
            chronic_overload?: number | null;
            skills_gap?: number | null;
            talent_dependency?: number | null;
        };
    } | null;
    talents: Array<{
        assignment_id: string;
        talent_name: string;
        role_on_project?: string | null;
        role?: string | null;
        allocation_pct: number;
    }>;
}

export async function getManagerWorkspaceProjects(params?: {
    status?: string;
    search?: string;
    limit?: number;
    page?: number;
    enterprise_id?: string;
}) {
    return managerProjectsApi.list(params).then((r) => r.data);
}

export async function getManagerProjectDetail(id: string): Promise<ProjectDetail> {
    return managerProjectsApi.detail(id).then((r) => mapProjectDetail(r.data));
}

export async function getManagerOverview() {
    return managerDashboardApi.get("mine").then((r) => r.data);
}

export async function getManagerMonitoring() {
    return managerDashboardApi.get("mine").then((r) => r.data);
}

export async function getManagerTeam(params?: { scope?: "mine" | "enterprise"; search?: string; contract_ending?: boolean; limit?: number }) {
    return managerTeamApi.list(params).then((r) => r.data);
}

export function parseManagerWorkspaceProjectsResponse(raw: unknown) {
    const payload = raw as { items?: unknown[]; total?: number };
    return {
        items: (payload.items ?? []) as Array<Record<string, unknown>>,
        summary: { total_projects: payload.total ?? 0, active_projects: 0, adjust_decisions: 0, stop_decisions: 0 },
        pagination: { page: 1, total_pages: 1, total: payload.total ?? 0 },
        meta: { enterprise_name: "" },
    };
}

function mapProjectDetail(payload: ProjectDetailResponse): ProjectDetail {
    return {
        id: payload.project.id,
        name: payload.project.name,
        status: payload.project.status,
        viability: payload.latest_viability
            ? {
                  viability_score: payload.latest_viability.score,
                  decision: payload.latest_viability.decision,
                  explanation: undefined,
              }
            : null,
        analysis: payload.latest_kpi
            ? {
                  progress_pct: payload.latest_kpi.progress_pct,
                  project_health_score: payload.latest_kpi.project_health_score,
                  capacity_load_pct: payload.latest_kpi.capacity_load_pct,
                  alerts: [],
              }
            : null,
        recommendations: payload.arbitrage_options.map((option) => ({ description: option.rationale })),
        risks: payload.active_alerts.map((alert) => ({
            id: alert.id,
            severity: (alert.severity as Severity) ?? "low",
            message: alert.title,
            risk_type: alert.status ?? "risk",
        })),
        risk_score: {
            fragility_score: payload.latest_viability?.score ?? null,
            drivers: {},
        },
        talents: payload.assignments.map((assignment) => ({
            assignment_id: `${payload.project.id}-${assignment.talent_id}`,
            talent_name: assignment.talent_id,
            role_on_project: assignment.role_on_project,
            role: assignment.assignment_type,
            allocation_pct: assignment.allocation_pct,
        })),
    };
}
