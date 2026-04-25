/**
 * Couche API Copilot — URLs centralisées, aucune logique métier.
 * Préférence : variables d’environnement ; sinon chemins relatifs `/api/copilot/*` (proxy Vite).
 */

import type { ApiClientOptions } from "@/utils/apiClient";
import { apiGet, apiPost } from "@/utils/apiClient";
import type { CopilotResponse, SaveCopilotDecisionPayload } from "@/types/copilot";
import { assertUuid } from "@/api/manager-api-contract";

function readEnv(key: string): string | undefined {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function getPathOrDefault(envKey: string, defaultRelative: string): string {
    return readEnv(envKey) ?? defaultRelative;
}

/** Désactiver l’UI d’enregistrement de décision (ex. backend pas prêt). */
export function isCopilotDecisionSubmitEnabled(): boolean {
    return readEnv("VITE_COPILOT_DECISION_ENABLED") !== "false";
}

/** v3 (Bearer) : pas de `enterprise_id` en query — le tenant est dans le JWT. Legacy : passer enterprise_id + manager_id. */
type ManagerScopedParams = { enterprise_id?: string; manager_id?: string };

function withManagerScope(path: string, params: ManagerScopedParams): string {
    const q = new URLSearchParams();
    if (params.enterprise_id?.trim()) {
        const eid = assertUuid(params.enterprise_id, "enterprise_id");
        q.set("enterprise_id", eid);
        if (params.manager_id?.trim()) q.set("manager_id", assertUuid(params.manager_id, "manager_id"));
    }
    if (!q.size) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}${q.toString()}`;
}

export async function getCopilotDashboard(params: ManagerScopedParams, options?: ApiClientOptions): Promise<CopilotResponse> {
    const path = getPathOrDefault("VITE_COPILOT_DASHBOARD_URL", "/webhook/api/copilot/dashboard");
    return apiGet<CopilotResponse>(withManagerScope(path, params), options);
}

export async function getCopilotProjects(
    params: ManagerScopedParams & { status?: "active" | "paused" | "completed"; limit?: number },
    options?: ApiClientOptions,
): Promise<CopilotResponse> {
    const path = getPathOrDefault("VITE_COPILOT_PROJECTS_URL", "/webhook/api/copilot/projects");
    const scoped = withManagerScope(path, params);
    const query = new URLSearchParams();
    if (params.status?.trim()) query.set("status", params.status.trim());
    if (params.limit != null) query.set("limit", String(params.limit));
    if (!query.size) return apiGet<CopilotResponse>(scoped, options);
    const joiner = scoped.includes("?") ? "&" : "?";
    return apiGet<CopilotResponse>(`${scoped}${joiner}${query.toString()}`, options);
}

export async function getCopilotProjectById(
    projectId: string,
    params: { enterprise_id?: string } = {},
    options?: ApiClientOptions,
): Promise<CopilotResponse> {
    const template = getPathOrDefault("VITE_COPILOT_PROJECT_DETAIL_URL", "/webhook/api/copilot/projects/:id");
    const path = template.includes(":id")
        ? template.replace(":id", encodeURIComponent(projectId))
        : `${template.replace(/\/$/, "")}/${encodeURIComponent(projectId)}`;
    if (!params.enterprise_id?.trim()) return apiGet<CopilotResponse>(path, options);
    const query = new URLSearchParams();
    query.set("enterprise_id", assertUuid(params.enterprise_id, "enterprise_id"));
    return apiGet<CopilotResponse>(`${path}?${query.toString()}`, options);
}

/** Alias pour imports existants (`getCopilotProjectDetail` = même appel que `getCopilotProjectById`). */
export async function getCopilotProjectDetail(
    projectId: string,
    params: { enterprise_id?: string } = {},
    options?: ApiClientOptions,
): Promise<CopilotResponse> {
    return getCopilotProjectById(projectId, params, options);
}

export async function getCopilotStaffing(params: ManagerScopedParams & { project_id?: string }, options?: ApiClientOptions): Promise<CopilotResponse> {
    const path = getPathOrDefault("VITE_COPILOT_STAFFING_URL", "/webhook/api/copilot/staffing");
    const scopedPath = withManagerScope(path, params);
    if (!params.project_id?.trim()) return apiGet<CopilotResponse>(scopedPath, options);
    const sep = scopedPath.includes("?") ? "&" : "?";
    return apiGet<CopilotResponse>(
        `${scopedPath}${sep}project_id=${encodeURIComponent(assertUuid(params.project_id, "project_id"))}`,
        options,
    );
}

export async function saveCopilotDecision(payload: SaveCopilotDecisionPayload, options?: ApiClientOptions): Promise<unknown> {
    const path = getPathOrDefault("VITE_COPILOT_DECISION_URL", "/webhook/api/copilot/decision");
    const { enterprise_id: _e, manager_id: _m, ...rest } = payload;
    const body: Record<string, unknown> = { ...rest };
    if (body.project_id && String(body.project_id).trim()) body.project_id = assertUuid(String(body.project_id), "project_id");
    return apiPost<unknown>(path, body, options);
}

/**
 * Action de décision déclenchée depuis le panneau Copilot (Manager).
 * Défaut relatif : `/api/copilot/decision` (proxy Vite → n8n).
 */
export async function postStrategicDecision(
    body: { project_id: string; decision: string; source: "copilot" },
    options?: ApiClientOptions,
): Promise<unknown> {
    const path = getPathOrDefault("VITE_COPILOT_DECISION_URL", "/api/copilot/decision");
    const payload: Record<string, unknown> = {
        project_id: assertUuid(body.project_id.trim(), "project_id"),
        decision: body.decision,
        source: body.source,
    };
    return apiPost<unknown>(path, payload, options);
}

/**
 * Simulation d’impact (what-if) — `VITE_COPILOT_WHAT_IF_URL` avec `:id` ou défaut `/api/copilot/projects/:id/what-if`.
 * Corps : payload métier tel que renvoyé par le simulateur (`modifications`, `scenario_type`, etc.).
 */
export async function postCopilotProjectWhatIf(
    projectId: string,
    payload: Record<string, unknown>,
    options?: ApiClientOptions,
): Promise<unknown> {
    const template = getPathOrDefault("VITE_COPILOT_WHAT_IF_URL", "/webhook/api/copilot/projects/:id/what-if");
    const path = template.includes(":id")
        ? template.replace(":id", encodeURIComponent(projectId))
        : `${template.replace(/\/$/, "")}/${encodeURIComponent(projectId)}/what-if`;
    return apiPost<unknown>(path, payload, options);
}
