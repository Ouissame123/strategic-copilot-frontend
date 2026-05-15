import { isAxiosError } from "axios";
import { httpClient } from "../lib/http-client";
import { getManagerProjectDetailGetUrl, getManagerProjectsBaseUrl, getManagerProjectsPatchUrl } from "@/config/manager-projects-api.config";
import { getWmpAssignPostUrl, getWmpUnassignDeleteUrl } from "@/config/wmp-assignments-webhook.config";
import { readEnv, trimUrl } from "@/config/resolve-api-url";
import type {
    AssignTalentRequest,
    AssignmentResponse,
    CreateProjectRequest,
    DecisionLabel,
    ManagerProjectDetailResponse,
    ManagerProjectsListResponse,
    ProjectCreatedResponse,
    ProjectDetailResponse,
    ProjectStatus,
    ProjectsListResponse,
    ProjectUpdatedResponse,
    UnassignmentResponse,
    WmpAssignmentType,
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

/**
 * Corps JSON strict pour `PATCH …/wmp-update-v1/manager/projects/:id` :
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

function logPatchProjectDev(projectId: string, url: string, body: WmpUpdateProjectPatchBody): void {
    if (!import.meta.env.DEV) return;
    const base = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    const enc = encodeURIComponent(projectId);
    const expectedDefault = base ? `${base}/wmp-update-v1/manager/projects/${enc}` : `/webhook/wmp-update-v1/manager/projects/${enc}`;
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

function normalizeProjectsList(data: ProjectsListResponse | ManagerProjectsListResponse): ProjectsListResponse {
    if ("items" in data && Array.isArray(data.items)) {
        return data;
    }
    return {
        items: data.projects ?? [],
        total: data.count ?? data.projects?.length ?? 0,
    };
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

function normalizeProjectDetail(data: ProjectDetailResponse | ManagerProjectDetailResponse): ProjectDetailResponse {
    return {
        project: data.project,
        assignments: data.assignments ?? [],
        requirements: data.requirements ?? [],
        active_alerts: data.active_alerts ?? [],
        latest_viability: normalizeLatestViability(data.latest_viability),
        latest_kpi: data.latest_kpi ?? null,
        arbitrage_options: data.arbitrage_options ?? [],
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
                data: normalizeProjectDetail(r.data),
            })),
    create: (body: CreateProjectRequest) => httpClient.post<ProjectCreatedResponse>(managerProjectsRoot(), body),
    /**
     * PATCH `wmp-update-v1` — URL via `getManagerProjectsPatchUrl` (défaut : `…/wmp-update-v1/manager/projects/{id}`).
     * Corps strict `{ status, priority, milestone_at }`. En dev : logs console. Une seule requête à la fois par `projectId`.
     */
    update: (id: string, body: WmpUpdateProjectPatchBody) => {
        const normalized = buildStrictUpdateProjectPatchBody(body);
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
