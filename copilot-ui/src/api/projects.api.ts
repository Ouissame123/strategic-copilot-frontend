import { buildQuery, normalizeListPayload, parseMutationResult, unwrapEntity } from "@/api/crud/parse-response";
import { crudApi } from "@/config/crud-api";
import { readEnv, resolveApiUrl } from "@/config/resolve-api-url";
import type { CrudMutationResult, Project, ProjectCreateDTO, ProjectUpdateDTO } from "@/types/crud-domain";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiClientOptions } from "@/utils/apiClient";

/** Réponse monitoring : corps brut + extractions pour affichage (sans transformation métier). */
export interface ProjectsMonitoringResponse {
    raw: unknown;
    summary: Record<string, unknown>;
    items: Record<string, unknown>[];
}

export interface ProjectsMonitoringFilters {
    status?: string;
    enterprise_id?: string;
}

function mapRowToProject(row: Record<string, unknown>, index: number, idFallback?: string): Project {
    const id = row.project_id ?? row.id ?? idFallback ?? `project-${index + 1}`;
    const desc =
        row.description != null
            ? String(row.description)
            : row.summary != null
              ? String(row.summary)
              : null;
    return {
        ...row,
        id: String(id),
        name: String(row.name ?? ""),
        description: desc,
        decision: row.decision != null ? String(row.decision) : null,
        viability_score: typeof row.viability_score === "number" ? row.viability_score : null,
        confidence: typeof row.confidence === "number" ? row.confidence : null,
    } as Project;
}

/** Liste et détail : CRUD / webhook (`VITE_CRUD_PROJECTS_*`), pas Copilot. */
export async function list(
    query?: Record<string, string | number | undefined | null>,
    opts?: ApiClientOptions,
): Promise<Project[]> {
    const path = `${crudApi.projects.collection()}${buildQuery(query ?? {})}`;
    const raw = await apiGet<unknown>(path, opts);
    const items = normalizeListPayload(raw);
    return items.map((item, index) => mapRowToProject((item ?? {}) as Record<string, unknown>, index));
}

export async function getById(id: string, opts?: ApiClientOptions): Promise<Project> {
    const raw = await apiGet<unknown>(crudApi.projects.one(id), opts);
    const unwrapped = unwrapEntity<Record<string, unknown>>(raw);
    const row = unwrapped && typeof unwrapped === "object" ? unwrapped : {};
    return mapRowToProject(row, 0, id);
}

export async function create(body: ProjectCreateDTO, opts?: ApiClientOptions): Promise<CrudMutationResult<Project>> {
    const raw = await apiPost<unknown>(crudApi.projects.collection(), body, opts);
    return parseMutationResult<Project>(raw);
}

export async function update(
    id: string,
    body: ProjectUpdateDTO,
    opts?: ApiClientOptions,
): Promise<CrudMutationResult<Project>> {
    /** Beaucoup de webhooks n8n attendent aussi l’identifiant dans le corps (en plus de l’URL). */
    const raw = await apiPatch<unknown>(crudApi.projects.update(id), { id, ...body }, opts);
    return parseMutationResult<Project>(raw);
}

export async function remove(id: string, opts?: ApiClientOptions): Promise<CrudMutationResult<unknown>> {
    const raw = await apiPost<unknown>(crudApi.projects.cancel(id), {}, opts);
    return parseMutationResult<unknown>(raw);
}

export async function removeHard(id: string, opts?: ApiClientOptions): Promise<CrudMutationResult<unknown>> {
    const raw = await apiDelete<unknown>(crudApi.projects.one(id), opts);
    return parseMutationResult<unknown>(raw);
}

function getProjectsMonitoringUrl(): string {
    return resolveApiUrl(readEnv("VITE_PROJECTS_MONITORING_URL"), "/webhook/api-projects-monitoring/api/projects/monitoring");
}

/**
 * Monitoring projets (backend réel) avec filtres optionnels.
 * Aucune logique métier ajoutée côté front : copie des objets `summary` et `items` tels quels.
 */
export async function getProjectsMonitoring(
    filters?: ProjectsMonitoringFilters,
    opts?: ApiClientOptions,
): Promise<ProjectsMonitoringResponse> {
    const query = new URLSearchParams();
    if (filters?.status?.trim()) query.set("status", filters.status.trim());
    if (filters?.enterprise_id?.trim()) query.set("enterprise_id", filters.enterprise_id.trim());
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const raw = await apiGet<unknown>(`${getProjectsMonitoringUrl()}${suffix}`, opts);

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
