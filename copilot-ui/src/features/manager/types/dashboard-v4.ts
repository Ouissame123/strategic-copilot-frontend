import type { ProjectStatus } from "@/types/api.types";

/** Contrat GET `/manager/dashboard` — `api_version: v4_factual` (lecture seule, zéro agent). */

export type DashboardDeadlineUrgency = "overdue" | "urgent" | "warning" | "ok" | "none";

export interface DashboardPortfolioByStatus {
    active: number;
    planned: number;
    on_hold: number;
    completed: number;
}

export interface DashboardPortfolioBudget {
    planned_total: number;
    actual_total: number;
    consumed_pct: number;
}

export interface DashboardPortfolioDeadlines {
    overdue: number;
    urgent: number;
    warning: number;
}

export interface DashboardPortfolio {
    total_projects: number;
    by_status: DashboardPortfolioByStatus;
    budget: DashboardPortfolioBudget;
    deadlines: DashboardPortfolioDeadlines;
}

/** Vivier + charge des affectés — ne pas additionner unassigned avec underloaded/balanced/overloaded. */
export interface DashboardTeamFactual {
    /** Tous les talents du scope (vivier). */
    total_pool: number;
    /** Talents avec au moins une affectation active. */
    assigned: number;
    /** Déjà calculé backend = pool − assigned. */
    unassigned: number;
    /** Charge — uniquement parmi les talents affectés. */
    underloaded: number;
    balanced: number;
    overloaded: number;
    contracts_ending_90d: number;
}

export interface DashboardTasksFactual {
    total: number;
    done: number;
    in_progress: number;
    todo: number;
    critical: number;
    completion_pct: number;
}

export interface DashboardRequirementsFactual {
    total: number;
    mandatory: number;
}

export interface DashboardProjectRow {
    id: string;
    name: string;
    status: ProjectStatus | string;
    status_label: string;
    priority: number;
    milestone_at: string | null;
    team_size: number;
    capacity_load_pct: number | null;
    deadline_urgency: DashboardDeadlineUrgency | null;
}

export interface DashboardMetaV4 {
    api_version: string;
    source_agent: string;
    computed_at: string;
}

export interface ManagerDashboardV4Response {
    status: string;
    workflow: string;
    api_version: "v4_factual" | string;
    enterprise_id: string;
    role: string;
    scope: "mine" | "enterprise" | string;
    computed_at: string;
    portfolio: DashboardPortfolio;
    team: DashboardTeamFactual;
    tasks: DashboardTasksFactual;
    requirements: DashboardRequirementsFactual;
    projects: DashboardProjectRow[];
    meta: DashboardMetaV4;
}
