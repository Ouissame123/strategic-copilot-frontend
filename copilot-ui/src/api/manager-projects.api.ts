import { isAxiosError } from "axios";
import { httpClient } from "../lib/http-client";
import { getManagerProjectsBaseUrl, getManagerProjectsPatchUrl } from "@/config/manager-projects-api.config";
import { readEnv, trimUrl } from "@/config/resolve-api-url";
import type {
    AssignTalentRequest, AssignmentResponse, CreateProjectRequest, DecisionLabel, ProjectCreatedResponse, ProjectDetailResponse,
    ProjectsListResponse, ProjectUpdatedResponse, UnassignmentResponse, UpdateProjectRequest, ManagerProjectDetailResponse, ManagerProjectsListResponse,
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

function normalizeUpdateProjectBody(body: UpdateProjectRequest): UpdateProjectRequest {
    const out = { ...(body as Record<string, unknown>) };
    if ("milestone_at" in out) {
        const ma = out.milestone_at;
        if (ma == null || String(ma).trim() === "") {
            delete out.milestone_at;
        } else {
            const ymd = milestoneAtToYYYYMMDD(ma as string);
            if (ymd) out.milestone_at = ymd;
            else delete out.milestone_at;
        }
    }
    if ("priority" in out && out.priority != null) {
        const n = Number(out.priority);
        if (Number.isFinite(n)) out.priority = n;
    }
    return out as UpdateProjectRequest;
}

function logPatchProjectDev(projectId: string, url: string, body: UpdateProjectRequest): void {
    if (!import.meta.env.DEV) return;
    const base = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    const enc = encodeURIComponent(projectId);
    const expectedWhenApiBase = base ? `${base}/manager/projects/${enc}` : `/webhook/manager/projects/${enc}`;
    const hasOverride = Boolean(readEnv("VITE_MANAGER_PROJECTS_UPDATE_URL"));
    // eslint-disable-next-line no-console
    console.groupCollapsed(`[manager-projects] PATCH project ${projectId}`);
    // eslint-disable-next-line no-console
    console.log("method", "PATCH");
    // eslint-disable-next-line no-console
    console.log("url", url);
    // eslint-disable-next-line no-console
    console.log("body", body);
    // eslint-disable-next-line no-console
    console.log("expectedUrlIfDefault (VITE_API_BASE_URL + /manager/projects/:id, ou proxy /webhook)", expectedWhenApiBase);
    // eslint-disable-next-line no-console
    console.log("urlMatchesExpectedDefault", !hasOverride && url === expectedWhenApiBase);
    if (hasOverride) {
        // eslint-disable-next-line no-console
        console.log("note", "VITE_MANAGER_PROJECTS_UPDATE_URL est défini — l’URL peut différer du défaut.");
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
    detail: (id: string) =>
        httpClient
            .get<ProjectDetailResponse | ManagerProjectDetailResponse>(`${managerProjectsRoot()}/${encodeURIComponent(id)}`, {
                skipGlobalHttpErrorToast: true,
            })
            .then((r) => ({
                ...r,
                data: normalizeProjectDetail(r.data),
            })),
    create: (body: CreateProjectRequest) => httpClient.post<ProjectCreatedResponse>(managerProjectsRoot(), body),
    /**
     * PATCH `WF_Manager_Projects` — URL résolue via `getManagerProjectsPatchUrl` (défaut : `{VITE_API_BASE_URL}/manager/projects/:id`).
     * Corps normalisé (`milestone_at` → `YYYY-MM-DD`). En dev : logs console (URL, méthode, body, réponse / erreur).
     * Une seule requête PATCH à la fois par `projectId` (file d’attente).
     */
    update: (id: string, body: UpdateProjectRequest) => {
        const normalized = normalizeUpdateProjectBody(body);
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
    assign: (id: string, body: AssignTalentRequest) =>
        httpClient.post<AssignmentResponse>(`${managerProjectsRoot()}/${encodeURIComponent(id)}/assignments`, body, {
            skipGlobalHttpErrorToast: true,
        }),
    unassign: (id: string, talentId: string) =>
        httpClient.delete<UnassignmentResponse>(
            `${managerProjectsRoot()}/${encodeURIComponent(id)}/assignments/${encodeURIComponent(talentId)}`,
            {
                skipGlobalHttpErrorToast: true,
            },
        ),
};
