import { isAxiosError } from "axios";
import { httpClient } from "../lib/http-client";
import {
    getManagerProjectDetailGetUrl,
    getManagerProjectsBaseUrl,
    getManagerProjectsDeleteUrl,
    getManagerProjectsPatchUrl,
} from "@/config/manager-projects-api.config";
import { getWmpAssignPostUrl, getWmpUnassignDeleteUrl } from "@/config/wmp-assignments-webhook.config";
import { readEnv, trimUrl } from "@/config/resolve-api-url";
import { readMissionControlHttpErrorMessage } from "@/lib/user-facing-api-error";
import { normalizeProgressPctValue } from "@/utils/format";
import type {
    AlertItem,
    ArbitrageImpactJson,
    ArbitrageOption,
    ArbitrageOptionStatus,
    ArbitrageOptionType,
    AssignTalentRequest,
    AssignmentResponse,
    CreateProjectRequest,
    DecisionLabel,
    ManagerProjectDetailResponse,
    ManagerProjectsListResponse,
    ProjectCreatedResponse,
    ProjectDeleteResponse,
    ProjectDetailResponse,
    ProjectFull,
    ProjectKpiFull,
    ProjectListItem,
    ProjectRiskItem,
    ProjectStatus,
    ProjectsListResponse,
    ProjectUpdatedResponse,
    UnassignmentResponse,
    WmpAssignmentType,
    ManagerProjectPatchBody,
    WmpUpdateProjectPatchBody,
} from "../types/api.types";

const managerProjectsRoot = () => getManagerProjectsBaseUrl();

/** Chaîne de PATCH par `projectId` : une requête à la fois par projet (pas de courses / doubles envois). */
const patchTailByProjectId = new Map<string, Promise<unknown>>();

function enqueueProjectPatch<T>(projectId: string, run: () => Promise<T>): Promise<T> {
    const prev = patchTailByProjectId.get(projectId) ?? Promise.resolve();
    const tail = prev.catch(() => {}).then(() => run()) as Promise<T>;
    patchTailByProjectId.set(projectId, tail);
    void tail.finally(() => {
        if (patchTailByProjectId.get(projectId) === tail) patchTailByProjectId.delete(projectId);
    });
    return tail;
}

/** `milestone_at` attendu par n8n : `YYYY-MM-DD` uniquement. */
export function milestoneAtToYYYYMMDD(value: string | number | null | undefined): string | undefined {
    if (value == null) return undefined;
    const s = String(value).trim();
    if (!s) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(s)) return s.slice(0, 10);
    const t = Date.parse(s);
    if (Number.isNaN(t)) return undefined;
    return new Date(t).toISOString().slice(0, 10);
}

const WMP_UPDATE_STATUSES: readonly ProjectStatus[] = ["planned", "active", "on_hold", "completed", "cancelled"];

export function isDescriptionOnlyProjectPatch(body: ManagerProjectPatchBody): body is { description: string } {
    return "description" in body && !("status" in body);
}

/**
 * Corps PATCH envoyé au backend — description seule `{ description }` ou triplet statut modal.
 */
export function normalizeManagerProjectPatchBody(body: ManagerProjectPatchBody): WmpUpdateProjectPatchBody | { description: string } {
    if (isDescriptionOnlyProjectPatch(body)) {
        return { description: String(body.description) };
    }
    return buildStrictUpdateProjectPatchBody(body);
}

/**
 * Corps JSON strict pour la modal « Modifier le projet » :
 * `{ status, priority, milestone_at }` uniquement (`milestone_at` : `YYYY-MM-DD` ou `null`).
 */
export function buildStrictUpdateProjectPatchBody(input: WmpUpdateProjectPatchBody): WmpUpdateProjectPatchBody {
    const status = input.status;
    if (!WMP_UPDATE_STATUSES.includes(status)) throw new Error("Invalid project status");
    const rawPri = Number(input.priority);
    if (!Number.isFinite(rawPri)) throw new Error("Invalid priority");
    const priority = Math.round(rawPri);

    let milestone_at: string | null = null;
    if (input.milestone_at != null && String(input.milestone_at).trim() !== "") {
        const ymd = milestoneAtToYYYYMMDD(input.milestone_at as string);
        milestone_at = ymd ?? null;
    }
    return { status, priority, milestone_at };
}

function logPatchProjectDev(projectId: string, url: string, body: WmpUpdateProjectPatchBody | { description: string }): void {
    if (!import.meta.env.DEV) return;
    const enc = encodeURIComponent(projectId);
    const expectedDefault = `/webhook/wmp-update-v1/manager/projects/${enc}`;
    const hasOverride = Boolean(readEnv("VITE_MANAGER_PROJECTS_UPDATE_URL") || readEnv("VITE_WMP_UPDATE_PROJECTS_PREFIX"));
    // eslint-disable-next-line no-console
    console.groupCollapsed(`[manager-projects] PATCH project ${projectId}`);
    // eslint-disable-next-line no-console
    console.log("method", "PATCH");
    // eslint-disable-next-line no-console
    console.log("url", url);
    // eslint-disable-next-line no-console
    console.log("body", body);
    // eslint-disable-next-line no-console
    console.log("expectedUrlIfDefault (wmp-update-v1)", expectedDefault);
    // eslint-disable-next-line no-console
    console.log("urlMatchesExpectedDefault", !hasOverride && url === expectedDefault);
    if (hasOverride) {
        // eslint-disable-next-line no-console
        console.log("note", "Surcharge PATCH (VITE_MANAGER_PROJECTS_UPDATE_URL ou VITE_WMP_UPDATE_PROJECTS_PREFIX).");
    }
    // eslint-disable-next-line no-console
    console.groupEnd();
}

function toOptionalFiniteNumber(value: unknown): number | null | undefined {
    if (value == null || value === "") return value === null ? null : undefined;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : undefined;
}

function requiredFiniteNumber(value: unknown): number | null {
    const valueAsNumber = toOptionalFiniteNumber(value);
    return typeof valueAsNumber === "number" ? valueAsNumber : null;
}

/** Normalisation liste v2.0 — champs factuels uniquement, aucun mapping agent. */
function normalizeProjectListItem(raw: ProjectListItem & Record<string, unknown>): ProjectListItem | null {
    const id = String(raw.id ?? "").trim();
    const name = String(raw.name ?? "").trim();
    const priority = requiredFiniteNumber(raw.priority);
    const teamSize = requiredFiniteNumber(raw.team_size);
    const validStatus = WMP_UPDATE_STATUSES.includes(raw.status);
    if (!id || !name || priority == null || teamSize == null || !validStatus) return null;

    const deadlineRaw = raw.deadline_urgency == null ? null : String(raw.deadline_urgency).trim().toLowerCase();
    const deadlineUrgency =
        deadlineRaw === "overdue" || deadlineRaw === "urgent" || deadlineRaw === "warning" || deadlineRaw === "ok"
            ? deadlineRaw
            : null;
    return {
        id,
        name,
        status: raw.status,
        status_label: String(raw.status_label ?? "").trim(),
        priority,
        milestone_at: raw.milestone_at == null ? null : String(raw.milestone_at),
        start_date: raw.start_date == null ? null : String(raw.start_date),
        budget_rh_planned: requiredFiniteNumber(raw.budget_rh_planned),
        budget_rh_actual: requiredFiniteNumber(raw.budget_rh_actual),
        description: raw.description == null ? null : String(raw.description),
        created_at: String(raw.created_at ?? ""),
        updated_at: String(raw.updated_at ?? ""),
        team_size: teamSize,
        capacity_load_pct: requiredFiniteNumber(raw.capacity_load_pct),
        deadline_urgency: deadlineUrgency,
    };
}

function normalizeProjectsList(data: ProjectsListResponse | ManagerProjectsListResponse): ProjectsListResponse {
    if ("items" in data && Array.isArray(data.items)) {
        return {
            items: data.items
                .map((item) => normalizeProjectListItem(item as ProjectListItem & Record<string, unknown>))
                .filter((item): item is ProjectListItem => item != null),
            total: data.total,
            enterprise_id: data.enterprise_id,
            filters_applied: data.filters_applied,
            meta: data.meta,
        };
    }
    const managerData = data as ManagerProjectsListResponse;
    const projects = (managerData.projects ?? [])
        .map((item: ProjectListItem) => normalizeProjectListItem(item as ProjectListItem & Record<string, unknown>))
        .filter((item): item is ProjectListItem => item != null);
    return {
        items: projects,
        total: managerData.count ?? projects.length,
        enterprise_id: managerData.enterprise_id,
        filters_applied: managerData.filters_applied,
        meta: managerData.meta,
    };
}

function toFiniteKpiNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizeLatestViability(raw: unknown): ProjectDetailResponse["latest_viability"] {
    if (raw == null || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const n = o.viability_score ?? o.score;
    const score = typeof n === "number" && Number.isFinite(n) ? n : Number(n);
    if (!Number.isFinite(score)) return null;
    const decision = (o.decision != null ? String(o.decision) : "Continue") as DecisionLabel;
    return {
        score,
        decision,
        computed_at: String(o.computed_at ?? ""),
        explanation: o.explanation == null ? null : String(o.explanation),
    };
}

function normalizeLatestKpi(raw: unknown): ProjectKpiFull | null {
    if (raw == null || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const hasProgressField = "progress_pct" in o || "progress_percent" in o || "progress" in o;
    const progressRaw = hasProgressField
        ? toFiniteKpiNumber(o.progress_pct ?? o.progress_percent ?? o.progress)
        : null;
    const progress_pct = progressRaw != null ? normalizeProgressPctValue(progressRaw) : null;
    const project_health_score = toFiniteKpiNumber(o.project_health_score ?? o.health_score ?? o.project_health);
    const capacity_load_pct = toFiniteKpiNumber(o.capacity_load_pct ?? o.load_pct ?? o.capacity_load);
    const delay_days = toFiniteKpiNumber(o.delay_days);
    if (
        progress_pct == null &&
        project_health_score == null &&
        capacity_load_pct == null &&
        delay_days == null
    ) {
        return null;
    }
    return {
        ...(hasProgressField && progress_pct != null ? { progress_pct } : {}),
        ...(project_health_score != null ? { project_health_score } : {}),
        ...(capacity_load_pct != null ? { capacity_load_pct } : {}),
        ...(delay_days != null ? { delay_days } : {}),
        ...(o.computed_at != null ? { computed_at: String(o.computed_at) } : {}),
    } as ProjectKpiFull;
}

const WMP_ASSIGNMENT_TYPES: readonly WmpAssignmentType[] = ["full_time", "part_time", "backup", "temporary"];

function trimToNull(v: string | null | undefined): string | null {
    if (v == null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
}

/**
 * Corps POST strict pour `wmp-assign-v1` (talent_id, allocation_pct, dates/rôle nullables, assignment_type).
 */
export function buildStrictAssignTalentPayload(input: {
    talent_id: string;
    allocation_pct: number;
    assignment_type: WmpAssignmentType;
    start_date?: string | null;
    end_date?: string | null;
    role_on_project?: string | null;
}): AssignTalentRequest {
    const talent_id = String(input.talent_id ?? "").trim();
    if (!talent_id) throw new Error("Missing talent_id");
    const lowerT = talent_id.toLowerCase();
    if (lowerT === ":talentid" || lowerT === ":id") throw new Error("Invalid talent_id");

    const raw = Number(input.allocation_pct);
    if (!Number.isFinite(raw)) throw new Error("Invalid allocation_pct");
    const allocation_pct = Math.min(100, Math.max(0, Math.round(raw)));

    const assignment_type = input.assignment_type;
    if (!WMP_ASSIGNMENT_TYPES.includes(assignment_type)) throw new Error("Invalid assignment_type");

    return {
        talent_id,
        allocation_pct,
        start_date: trimToNull(input.start_date),
        end_date: trimToNull(input.end_date),
        role_on_project: trimToNull(input.role_on_project),
        assignment_type,
    };
}

function unwrapProjectDetailPayload(
    data: ProjectDetailResponse | ManagerProjectDetailResponse,
): ProjectDetailResponse | ManagerProjectDetailResponse {
    const r = data as Record<string, unknown>;
    if (r.project != null && typeof r.project === "object") {
        return data;
    }
    const nested = r.data;
    if (nested != null && typeof nested === "object" && (nested as Record<string, unknown>).project != null) {
        return nested as ProjectDetailResponse | ManagerProjectDetailResponse;
    }
    return data;
}

const ARBITRAGE_TYPE_LABELS: Record<ArbitrageOptionType, string> = {
    reallocation: "Réallocation",
    delay: "Report",
    reinforce: "Renforcer",
    stop_scope: "Stop / Scope",
};

function asRecord(value: unknown): Record<string, unknown> | null {
    return value != null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeArbitrageOptionType(raw: unknown): ArbitrageOptionType {
    const key = String(raw ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
    if (key === "reallocation" || key === "re_allocate") return "reallocation";
    if (key === "delay" || key === "report") return "delay";
    if (key === "reinforce" || key === "reinforcement") return "reinforce";
    if (key === "stop_scope" || key === "stop" || key === "scope" || key === "stop/scope") return "stop_scope";
    return "reallocation";
}

function normalizeArbitrageStatus(raw: unknown): ArbitrageOptionStatus {
    const key = String(raw ?? "proposed")
        .trim()
        .toLowerCase();
    if (key === "selected" || key === "executed" || key === "rejected" || key === "expired") return key;
    return "proposed";
}

function normalizeArbitrageConfidence(raw: unknown): number {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    if (n > 1) return Math.min(1, Math.max(0, n / 100));
    return Math.min(1, Math.max(0, n));
}

function parseArbitrageImpactJson(raw: unknown): ArbitrageImpactJson | null {
    let source: unknown = raw;
    if (typeof raw === "string") {
        try {
            source = JSON.parse(raw) as unknown;
        } catch {
            return null;
        }
    }
    const bag = asRecord(source);
    if (!bag) return null;
    const out: ArbitrageImpactJson = {};
    const score = Number(bag.score_delta);
    if (Number.isFinite(score)) out.score_delta = score;
    const capacity = Number(bag.capacity_delta);
    if (Number.isFinite(capacity)) out.capacity_delta = capacity;
    const alerts = Number(bag.alerts_impact);
    if (Number.isFinite(alerts)) out.alerts_impact = alerts;
    const budget = Number(bag.budget_impact);
    if (Number.isFinite(budget)) out.budget_impact = budget;
    const timeline = Number(bag.timeline_days);
    if (Number.isFinite(timeline)) out.timeline_days = timeline;
    return Object.keys(out).length > 0 ? out : null;
}

function normalizeArbitrageOption(raw: unknown): ArbitrageOption | null {
    const bag = asRecord(raw);
    if (!bag) return null;
    const id = String(bag.id ?? "").trim();
    if (!id) return null;
    const option_type = normalizeArbitrageOptionType(bag.option_type ?? bag.type);
    const impact_json = parseArbitrageImpactJson(bag.impact_json ?? bag.impact);
    const impact_score = Number(bag.impact_score ?? impact_json?.score_delta ?? 0);
    const labelRaw = String(bag.label ?? "").trim();
    return {
        id,
        option_type,
        label: labelRaw || ARBITRAGE_TYPE_LABELS[option_type],
        rationale: String(bag.rationale ?? bag.description ?? "").trim(),
        impact_score: Number.isFinite(impact_score) ? impact_score : 0,
        impact_json,
        confidence: normalizeArbitrageConfidence(bag.confidence),
        status: normalizeArbitrageStatus(bag.status),
        created_at: bag.created_at != null ? String(bag.created_at) : undefined,
    };
}

function normalizeArbitrageOptions(raw: unknown): ArbitrageOption[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeArbitrageOption).filter((o): o is ArbitrageOption => o != null);
}

function normalizeProjectRisk(raw: unknown, index: number): ProjectRiskItem | null {
    const bag = asRecord(raw);
    if (!bag) return null;

    const risk_code = String(bag.risk_code ?? bag.code ?? bag.category ?? bag.risk_type ?? "").trim();
    const id = String(bag.id ?? bag.risk_id ?? risk_code ?? `risk-${index}`).trim();
    if (!id && !risk_code) return null;

    const titleRaw = bag.title ?? bag.label ?? bag.name;
    const title = titleRaw != null && String(titleRaw).trim() !== "" ? String(titleRaw).trim() : null;

    const descRaw = bag.description ?? bag.message ?? bag.rationale ?? bag.detail;
    const description = descRaw != null && String(descRaw).trim() !== "" ? String(descRaw).trim() : null;

    const scoreRaw = bag.score ?? bag.risk_score;
    const scoreNum = scoreRaw != null ? Number(scoreRaw) : NaN;
    const score = Number.isFinite(scoreNum) ? scoreNum : null;

    const severity = String(bag.severity ?? "medium").trim().toLowerCase();

    return {
        id: id || `risk-${index}`,
        severity,
        risk_code: risk_code || id,
        title,
        description,
        score,
    };
}

function normalizeProjectRisks(raw: unknown, activeAlerts: AlertItem[]): ProjectRiskItem[] {
    if (Array.isArray(raw) && raw.length > 0) {
        return raw
            .map((item, index) => normalizeProjectRisk(item, index))
            .filter((r): r is ProjectRiskItem => r != null);
    }

    if (!activeAlerts.length) return [];

    return activeAlerts
        .map((alert, index) =>
            normalizeProjectRisk(
                {
                    id: alert.id,
                    severity: alert.severity,
                    risk_code: alert.category ?? alert.risk_type ?? alert.impact_area ?? alert.id,
                    title: alert.title,
                    description: alert.message,
                    score: alert.risk_score,
                },
                index,
            ),
        )
        .filter((r): r is ProjectRiskItem => r != null);
}

function resolveProjectFromDetailBag(bag: Record<string, unknown>, projectIdHint?: string): ProjectFull | undefined {
    const nested = bag.project;
    if (nested != null && typeof nested === "object" && !Array.isArray(nested)) {
        return nested as ProjectFull;
    }

    const id = String(bag.id ?? bag.project_id ?? projectIdHint ?? "").trim();
    const name = String(bag.name ?? bag.project_name ?? "").trim();
    if (!id && !name) return undefined;

    return {
        id: id || projectIdHint || "",
        name: name || id || projectIdHint || "",
        status: String(bag.status ?? "active").trim() as ProjectStatus,
        priority: Number(bag.priority ?? 5) || 5,
        milestone_at: bag.milestone_at != null ? String(bag.milestone_at) : undefined,
        progress_pct: bag.progress_pct != null ? Number(bag.progress_pct) : undefined,
        description: bag.description != null ? String(bag.description) : undefined,
        start_date: bag.start_date != null ? String(bag.start_date) : undefined,
        capacity_load_pct:
            bag.capacity_load_pct != null && Number.isFinite(Number(bag.capacity_load_pct))
                ? Number(bag.capacity_load_pct)
                : undefined,
        budget_rh_planned:
            bag.budget_rh_planned != null && Number.isFinite(Number(bag.budget_rh_planned))
                ? Number(bag.budget_rh_planned)
                : undefined,
        budget_rh_actual:
            bag.budget_rh_actual != null && Number.isFinite(Number(bag.budget_rh_actual))
                ? Number(bag.budget_rh_actual)
                : undefined,
    };
}

export function normalizeProjectDetail(
    data: ProjectDetailResponse | ManagerProjectDetailResponse,
    projectIdHint?: string,
): ProjectDetailResponse {
    const root = unwrapProjectDetailPayload(data);
    const bag = root as Record<string, unknown>;
    const resolvedProject = resolveProjectFromDetailBag(bag, projectIdHint);
    const projectObj = resolvedProject ?? bag.project;
    const projectKpi =
        projectObj != null && typeof projectObj === "object"
            ? (projectObj as Record<string, unknown>).latest_kpi
            : undefined;

    const active_alerts = root.active_alerts ?? [];

    const riskScoresRaw = bag.risk_scores ?? bag.project_risk_scores ?? root.risk_scores ?? root.project_risk_scores;
    const riskScoresSnapshot =
        riskScoresRaw != null && typeof riskScoresRaw === "object" && !Array.isArray(riskScoresRaw)
            ? (riskScoresRaw as ProjectDetailResponse["risk_scores"])
            : undefined;

    const riskKpiRaw = bag.risk_kpi ?? root.risk_kpi;
    const riskKpi =
        riskKpiRaw != null && typeof riskKpiRaw === "object" && !Array.isArray(riskKpiRaw)
            ? (riskKpiRaw as ProjectDetailResponse["risk_kpi"])
            : undefined;

    return {
        project: resolvedProject ?? root.project,
        assignments: root.assignments ?? [],
        requirements: root.requirements ?? [],
        active_alerts,
        latest_viability: normalizeLatestViability(root.latest_viability ?? bag.viability),
        latest_kpi: normalizeLatestKpi(root.latest_kpi ?? projectKpi),
        arbitrage_options: normalizeArbitrageOptions(root.arbitrage_options),
        risks: normalizeProjectRisks(bag.risks ?? bag.project_risks, active_alerts),
        risk_kpi: riskKpi ?? null,
        risk_scores: riskScoresSnapshot ?? null,
        project_risk_scores: riskScoresSnapshot ?? null,
    };
}

export const managerProjectsApi = {
    list: (params?: { status?: string; search?: string; limit?: number }) =>
        httpClient.get<ProjectsListResponse | ManagerProjectsListResponse>(managerProjectsRoot(), { params }).then((r) => ({
            ...r,
            data: normalizeProjectsList(r.data),
        })),
    /** GET détail — URL via `getManagerProjectDetailGetUrl` (défaut `wmp-detail-v1`, surcharges env possibles). */
    detail: (id: string) =>
        httpClient
            .get<ProjectDetailResponse | ManagerProjectDetailResponse>(getManagerProjectDetailGetUrl(id), {
                skipGlobalHttpErrorToast: true,
            })
            .then((r) => ({
                ...r,
                data: normalizeProjectDetail(r.data, id),
            })),
    create: (body: CreateProjectRequest) =>
        httpClient.post<ProjectCreatedResponse>(managerProjectsRoot(), body, {
            skipGlobalHttpErrorToast: true,
        }),
    /** DELETE `wmp-delete-v1` — WF_Manager_Project_Delete_v1. */
    delete: (projectId: string) =>
        httpClient.delete<ProjectDeleteResponse>(getManagerProjectsDeleteUrl(projectId), {
            skipGlobalHttpErrorToast: true,
        }),
    /**
     * PATCH `…/manager/projects/{id}` — corps partiel (`{ description }` ou `{ status, priority, milestone_at }`).
     * En dev : logs console. Une seule requête à la fois par `projectId`.
     */
    update: (id: string, body: ManagerProjectPatchBody) => {
        const normalized = normalizeManagerProjectPatchBody(body);
        const url = getManagerProjectsPatchUrl(id);
        return enqueueProjectPatch(id, async () => {
            logPatchProjectDev(id, url, normalized);
            try {
                const res = await httpClient.patch<ProjectUpdatedResponse>(url, normalized, {
                    skipGlobalHttpErrorToast: true,
                });
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.log("[manager-projects] PATCH response", res.status, res.data);
                }
                return res;
            } catch (err) {
                if (import.meta.env.DEV && isAxiosError(err)) {
                    // eslint-disable-next-line no-console
                    console.warn("[manager-projects] PATCH error", err.response?.status, err.response?.data);
                }
                throw err;
            }
        });
    },
    /** POST n8n `wmp-assign-v1` — URL via `getWmpAssignPostUrl` (jamais `:id` littéral). */
    assign: (projectId: string, body: AssignTalentRequest) =>
        httpClient.post<AssignmentResponse>(getWmpAssignPostUrl(projectId), body, {
            skipGlobalHttpErrorToast: true,
        }),
    /** DELETE n8n `wmp-unassign-v1` — URL via `getWmpUnassignDeleteUrl`. */
    unassign: (projectId: string, talentId: string) =>
        httpClient.delete<UnassignmentResponse>(getWmpUnassignDeleteUrl(projectId, talentId), {
            skipGlobalHttpErrorToast: true,
        }),
};

export function isManagerProjectNotDeletableError(err: unknown): boolean {
    if (!isAxiosError(err)) return false;
    if (err.response?.status === 409) return true;
    const data = err.response?.data;
    if (data && typeof data === "object") {
        const record = data as Record<string, unknown>;
        const code = String(record.code ?? record.error_code ?? record.__code ?? record.status ?? "").toUpperCase();
        return code === "NOT_DELETABLE";
    }
    return false;
}

export type ManagerProjectCreateField = "name" | "status" | "priority" | "form";

/** Erreurs 400 create — message backend tel quel, mappé au champ via `__code`. */
export function parseManagerProjectCreateError(err: unknown): {
    field: ManagerProjectCreateField;
    message: string;
} | null {
    if (!isAxiosError(err) || err.response?.status !== 400) return null;
    const data = err.response?.data;
    if (!data || typeof data !== "object") return null;
    const record = data as Record<string, unknown>;
    const message = String(record.message ?? "").trim();
    if (!message) return null;
    const code = String(record.__code ?? record.code ?? record.error_code ?? "").toUpperCase();
    if (code === "INVALID_NAME") return { field: "name", message };
    if (code === "INVALID_STATUS") return { field: "status", message };
    if (code === "INVALID_PRIORITY") return { field: "priority", message };
    return { field: "form", message };
}

export type ManagerProjectDeleteErrorKind = "forbidden" | "not_deletable" | "not_found" | "other";

export function classifyManagerProjectDeleteError(err: unknown): {
    kind: ManagerProjectDeleteErrorKind;
    message: string;
    httpStatus: number | null;
} {
    const httpStatus = isAxiosError(err) ? (err.response?.status ?? null) : null;
    const data = isAxiosError(err) && err.response?.data && typeof err.response.data === "object"
        ? (err.response.data as Record<string, unknown>)
        : null;
    const code = String(data?.code ?? data?.error_code ?? data?.__code ?? data?.status ?? "").toUpperCase();
    const message =
        (typeof data?.message === "string" && data.message.trim()) ||
        readMissionControlHttpErrorMessage(err);

    if (httpStatus === 404 || code === "PROJECT_NOT_FOUND") {
        return { kind: "not_found", message, httpStatus };
    }
    if (httpStatus === 403 || code === "NOT_PROJECT_OWNER") {
        return { kind: "forbidden", message, httpStatus };
    }
    if (httpStatus === 409 || code === "NOT_DELETABLE") {
        return { kind: "not_deletable", message, httpStatus };
    }
    return { kind: "other", message, httpStatus };
}
