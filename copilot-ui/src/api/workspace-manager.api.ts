/**
 * Workflows n8n manager : préfixe `GET/POST …/api/workspace/manager/…` + `VITE_API_BASE_URL`.
 */
import type {
    ProjectDetailsResponse,
    ProjectRisksResponse,
    ProjectTalentsResponse,
    ProjectViabilityResponse,
} from "@/api/project-by-id.api";
import type { ProjectsMonitoringResponse } from "@/api/projects.api";
import { apiGet, apiPost, type ApiClientOptions } from "@/utils/apiClient";
import { assertEnterpriseId, assertUuid } from "@/api/manager-api-contract";

const MANAGER_PREFIX = "/webhook/api/workspace/manager";

export type DecisionType = "Continue" | "Adjust" | "Stop";
export type Severity = "critical" | "high" | "medium" | "low";

export interface ProjectViability {
    id: string;
    decision: DecisionType;
    viability_score: number;
    score_skills_fit: number;
    score_capacity: number;
    score_budget: number;
    score_risk: number;
    explanation: string | null;
    computed_at: string | null;
    generated_at?: string | null;
    analysis_version: number;
    weighted_scores?: Record<string, number | null>;
}

export interface ProjectAnalysis {
    id: string;
    delay_days: number | null;
    progress_pct: number | null;
    capacity_load_pct: number | null;
    project_health_score: number | null;
    strategic_alignment_score: number | null;
    time_to_impact_days: number | null;
    alerts: Array<{
        code: string;
        type: string;
        severity: Severity;
        description: string;
    }>;
    kpi_json: Record<string, unknown>;
    computed_at: string | null;
    analyzed_at?: string | null;
}

export interface ProjectRiskScore {
    id: string;
    fragility_score: number | null;
    anxiety_pulse: number | null;
    chronic_overload_score: number | null;
    critical_skills_gap_score: number | null;
    key_talent_dependency_score: number | null;
    computed_at: string | null;
    calculated_at?: string | null;
    analysis_run_id?: string | null;
    drivers?: {
        anxiety_pulse?: number | null;
        chronic_overload?: number | null;
        skills_gap?: number | null;
        talent_dependency?: number | null;
    } | null;
}

export interface ProjectRisk {
    id: string;
    status: "open" | "acknowledged" | "resolved" | "dismissed" | "closed";
    severity: Severity;
    risk_type: string;
    message: string;
    risk_score: number | null;
    detected_at: string | null;
    source_agent: string | null;
    source_workflow?: string | null;
    analysis_run_id?: string | null;
}

export interface ProjectTalent {
    assignment_id: string;
    talent_id: string;
    talent_name: string;
    talent_email: string;
    role: string | null;
    role_on_project: string | null;
    allocation_pct: number;
    start_date: string | null;
    end_date: string | null;
    status: "active" | "removed" | string;
    matched_at?: string | null;
}

export interface ProjectRecommendation {
    id: string;
    action_type: string | null;
    description: string | null;
    priority: number | null;
    created_at: string | null;
}

export interface ProjectDetail {
    id: string;
    name: string;
    status: string;
    priority: number;
    description: string | null;
    start_date: string | null;
    milestone_at: string | null;
    created_at: string;
    updated_at: string;
    enterprise_id: string;
    budget_rh_planned: number | null;
    budget_rh_actual: number | null;
    viability: ProjectViability | null;
    analysis: ProjectAnalysis | null;
    risk_score: ProjectRiskScore | null;
    risks: ProjectRisk[];
    talents: ProjectTalent[];
    recommendations: ProjectRecommendation[];
}

export interface ProjectDetailResponse {
    status: "success";
    project: ProjectDetail;
}

export interface GetManagerWorkspaceProjectsParams {
    enterprise_id: string;
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}

export async function getManagerWorkspaceProjects(
    params: GetManagerWorkspaceProjectsParams,
    opts?: ApiClientOptions,
): Promise<unknown> {
    const qs = new URLSearchParams();
    qs.set("enterprise_id", assertEnterpriseId(params.enterprise_id));
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.status?.trim()) qs.set("status", params.status.trim());
    if (params.search?.trim()) qs.set("search", params.search.trim());
    const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
    return apiGet<unknown>(`${MANAGER_PREFIX}/projects${suffix}`, opts);
}

export async function getManagerOverview(
    params: { enterprise_id: string; manager_id?: string },
    opts?: ApiClientOptions,
): Promise<unknown> {
    const qs = new URLSearchParams();
    qs.set("enterprise_id", assertEnterpriseId(params.enterprise_id));
    if (params.manager_id?.trim()) qs.set("manager_id", assertUuid(params.manager_id, "manager_id"));
    const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
    return apiGet<unknown>(`${MANAGER_PREFIX}/overview${suffix}`, opts);
}

export interface ManagerWorkspaceProjectsPagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

export type ManagerWorkspaceProjectsSummary = {
    total_projects?: number;
    active_projects?: number;
    attention_projects?: number;
    high_risk_projects?: number;
    /** Réponse manager projects (alignement backend). */
    at_risk_projects?: number;
    /** Nombre de projets dont la décision est « Adjust » — à calculer côté serveur (n8n). */
    adjust_decisions?: number;
    /** Nombre de projets dont la décision est « Stop » — à calculer côté serveur (n8n). */
    stop_decisions?: number;
    /** Dernière analyse agrégée (périmètre) — ISO 8601, optionnel. */
    last_analysis_at?: string;
};

export type ManagerWorkspaceProjectsMeta = {
    page_label?: string;
    scope?: string;
    /** Conservé pour usage interne / debug ; ne pas afficher en UI si `enterprise_name` est absent. */
    enterprise_id?: string;
    /** Libellé entreprise affiché à la place de l’UUID. */
    enterprise_name?: string;
};

/**
 * GET /api/workspace/manager/projects — corps **à la racine** : status, summary, items, pagination
 * (pas de `response.data.items` ni `response.projects`).
 *
 * **Synthèse KPI (summary)** — à produire côté n8n, sans agrégation côté SPA :
 * - `total_projects`, `active_projects`
 * - `adjust_decisions` : compte des projets avec `decision === "Adjust"`
 * - `stop_decisions` : compte des projets avec `decision === "Stop"`
 *
 * **Contexte** : renvoyer `enterprise_name` (racine ou `meta`) pour l’en-tête ; ne pas s’appuyer sur l’UI pour dériver ces compteurs.
 */
export function parseManagerWorkspaceProjectsResponse(raw: unknown): {
    summary: ManagerWorkspaceProjectsSummary;
    items: Record<string, unknown>[];
    pagination: ManagerWorkspaceProjectsPagination | null;
    meta: ManagerWorkspaceProjectsMeta;
} {
    const payload = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

    if (payload.status !== "success") {
        const msg =
            typeof payload.message === "string" && payload.message.trim()
                ? payload.message.trim()
                : "Failed to load manager projects";
        throw new Error(msg);
    }

    const summaryRaw = payload.summary && typeof payload.summary === "object" ? (payload.summary as Record<string, unknown>) : {};
    const summary: ManagerWorkspaceProjectsSummary = {
        total_projects: typeof summaryRaw.total_projects === "number" ? summaryRaw.total_projects : undefined,
        active_projects: typeof summaryRaw.active_projects === "number" ? summaryRaw.active_projects : undefined,
        attention_projects: typeof summaryRaw.attention_projects === "number" ? summaryRaw.attention_projects : undefined,
        high_risk_projects: typeof summaryRaw.high_risk_projects === "number" ? summaryRaw.high_risk_projects : undefined,
        at_risk_projects: typeof summaryRaw.at_risk_projects === "number" ? summaryRaw.at_risk_projects : undefined,
        adjust_decisions: typeof summaryRaw.adjust_decisions === "number" ? summaryRaw.adjust_decisions : undefined,
        stop_decisions: typeof summaryRaw.stop_decisions === "number" ? summaryRaw.stop_decisions : undefined,
        last_analysis_at:
            typeof summaryRaw.last_analysis_at === "string" && summaryRaw.last_analysis_at.trim()
                ? summaryRaw.last_analysis_at.trim()
                : undefined,
    };
    if (
        !summary.last_analysis_at &&
        typeof payload.last_analysis_at === "string" &&
        payload.last_analysis_at.trim()
    ) {
        summary.last_analysis_at = payload.last_analysis_at.trim();
    }

    const itemsRaw = Array.isArray(payload.items) ? payload.items : [];
    const items = itemsRaw.map((i) => (i && typeof i === "object" ? { ...(i as Record<string, unknown>) } : {}));

    const p = payload.pagination && typeof payload.pagination === "object" ? (payload.pagination as Record<string, unknown>) : null;
    let pagination: ManagerWorkspaceProjectsPagination | null = null;
    if (p) {
        const page = typeof p.page === "number" ? p.page : undefined;
        const limit =
            typeof p.limit === "number" ? p.limit : typeof p.per_page === "number" ? p.per_page : undefined;
        const total =
            typeof p.total === "number" ? p.total : typeof p.total_items === "number" ? p.total_items : undefined;
        const total_pages = typeof p.total_pages === "number" ? p.total_pages : undefined;
        if (page != null && limit != null && total != null && total_pages != null) {
            pagination = { page, limit, total, total_pages };
        }
    }

    const metaNested = payload.meta && typeof payload.meta === "object" && !Array.isArray(payload.meta) ? (payload.meta as Record<string, unknown>) : {};
    const pickMetaString = (k: string, root: Record<string, unknown>): string | undefined => {
        const v = root[k];
        return typeof v === "string" && v.trim() ? v.trim() : undefined;
    };
    const enterprise_name =
        pickMetaString("enterprise_name", payload) ??
        pickMetaString("enterprise_name", metaNested) ??
        (typeof summaryRaw.enterprise_name === "string" && summaryRaw.enterprise_name.trim()
            ? summaryRaw.enterprise_name.trim()
            : undefined);

    const meta: ManagerWorkspaceProjectsMeta = {
        page_label: typeof payload.page_label === "string" ? payload.page_label : undefined,
        scope: typeof payload.scope === "string" ? payload.scope : undefined,
        enterprise_id: typeof payload.enterprise_id === "string" ? payload.enterprise_id : undefined,
        enterprise_name,
    };

    return { summary, items, pagination, meta };
}

/**
 * Synthèse KPI overview : même forme que `summary` liste, ou champs numériques à la racine / `data`.
 */
export function parseManagerOverviewSummary(raw: unknown): ManagerWorkspaceProjectsSummary {
    const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const payload = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
    const summaryRaw = payload.summary && typeof payload.summary === "object" ? (payload.summary as Record<string, unknown>) : {};
    const fromSummary: ManagerWorkspaceProjectsSummary = {
        total_projects: typeof summaryRaw.total_projects === "number" ? summaryRaw.total_projects : undefined,
        active_projects: typeof summaryRaw.active_projects === "number" ? summaryRaw.active_projects : undefined,
        attention_projects: typeof summaryRaw.attention_projects === "number" ? summaryRaw.attention_projects : undefined,
        high_risk_projects: typeof summaryRaw.high_risk_projects === "number" ? summaryRaw.high_risk_projects : undefined,
    };
    if (
        fromSummary.total_projects != null ||
        fromSummary.active_projects != null ||
        fromSummary.attention_projects != null ||
        fromSummary.high_risk_projects != null
    ) {
        return fromSummary;
    }
    const pick = (k: keyof ManagerWorkspaceProjectsSummary): number | undefined =>
        typeof payload[k] === "number" ? (payload[k] as number) : undefined;
    return {
        total_projects: pick("total_projects"),
        active_projects: pick("active_projects"),
        attention_projects: pick("attention_projects"),
        high_risk_projects: pick("high_risk_projects"),
    };
}

/** Sans `enterprise_id` en query si absent — aligné workflows v3 (tenant via JWT Bearer). */
export async function getManagerProjectDetail(
    projectId: string,
    _enterpriseId?: string,
    opts?: ApiClientOptions,
): Promise<ProjectDetail> {
    const response = await apiGet<ProjectDetailResponse>(
        `${MANAGER_PREFIX}/project-detail?project_id=${encodeURIComponent(assertUuid(projectId, "project_id"))}`,
        opts,
    );
    return response.project;
}

/**
 * Découpe la réponse n8n sans calcul métier : clés optionnelles `details` | `detail`, `talents`, `risks`, `viability`.
 */
export function parseManagerProjectDetailPayload(raw: unknown): {
    details: ProjectDetailsResponse;
    talents: ProjectTalentsResponse;
    risks: ProjectRisksResponse;
    viability: ProjectViabilityResponse;
} {
    const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const payload = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
    const pick = (k: string): Record<string, unknown> => {
        const v = payload[k];
        return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    };
    const details = pick("details");
    const detailAlt = pick("detail");
    const talents = pick("talents");
    const risks = pick("risks");
    const viability = pick("viability");
    const detailsOut = Object.keys(details).length > 0 ? details : Object.keys(detailAlt).length > 0 ? detailAlt : (payload as ProjectDetailsResponse);
    return {
        details: detailsOut,
        talents,
        risks,
        viability,
    };
}

export interface ManagerMonitoringFilters {
    status?: string;
    enterprise_id: string;
}

/** Même structure d’affichage que `getProjectsMonitoring` (summary + items). */
export async function getManagerMonitoring(
    filters?: ManagerMonitoringFilters,
    opts?: ApiClientOptions,
): Promise<ProjectsMonitoringResponse> {
    const query = new URLSearchParams();
    if (filters?.status?.trim()) query.set("status", filters.status.trim());
    query.set("enterprise_id", assertEnterpriseId(filters.enterprise_id));
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const raw = await apiGet<unknown>(`${MANAGER_PREFIX}/monitoring${suffix}`, opts);

    const payload = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const summary =
        payload.summary && typeof payload.summary === "object" ? { ...(payload.summary as Record<string, unknown>) } : {};
    const itemsRaw = Array.isArray(payload.items) ? payload.items : [];

    return {
        raw,
        summary,
        items: itemsRaw.map((item) => (item && typeof item === "object" ? { ...(item as Record<string, unknown>) } : {})),
    };
}

export async function postManagerProjectWhatIf(
    body: { enterprise_id: string; project_id: string; modifications: Record<string, unknown>; manager_id?: string },
    opts?: ApiClientOptions,
): Promise<unknown> {
    const payload = {
        ...body,
        enterprise_id: assertEnterpriseId(body.enterprise_id),
        project_id: assertUuid(body.project_id, "project_id"),
        manager_id: body.manager_id?.trim() ? assertUuid(body.manager_id, "manager_id") : undefined,
    };
    return apiPost<unknown>(`${MANAGER_PREFIX}/project-what-if`, payload, opts);
}

export async function getManagerProjectMonitoring(
    projectId: string,
    params: { enterprise_id?: string; range?: "7d" | "30d" | "90d" },
    opts?: ApiClientOptions,
): Promise<unknown> {
    const qs = new URLSearchParams();
    const e = params.enterprise_id?.trim();
    if (e) qs.set("enterprise_id", assertEnterpriseId(e));
    if (params.range?.trim()) qs.set("range", params.range.trim());
    const suffix = qs.toString();
    const q = suffix ? `?${suffix}` : "";
    return apiGet<unknown>(
        `${MANAGER_PREFIX}/projects/${encodeURIComponent(assertUuid(projectId, "project_id"))}/monitoring${q}`,
        opts,
    );
}

/** v3 Bearer: GET /webhook/api/workspace/manager/team (sans enterprise_id en query). */
export async function getManagerTeam(opts?: ApiClientOptions): Promise<unknown> {
    return apiGet<unknown>(`${MANAGER_PREFIX}/team`, opts);
}
