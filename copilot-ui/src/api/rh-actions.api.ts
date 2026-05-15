/**
 * Actions RH : POST/GET liste sur webhook métier ; PATCH sur `/api/rh/actions/:id`.
 * En dev, Vite proxy réécrit vers le webhook n8n :
 * `https://n8nprod.aphelionxinnovations.com/webhook/c8bae94d-8de1-4f06-bb0a-a1e90eb6a80d/api/rh/actions/:id`
 * (voir `vite.config.ts` — entrée `/api/rh/actions`).
 */
import type { ApiClientOptions } from "@/utils/apiClient";
import { apiGet, apiPatch, apiPost } from "@/utils/apiClient";
import { assertUuid } from "@/api/manager-api-contract";

function basePath(): string {
    const fromEnv = (import.meta.env as Record<string, string | undefined>).VITE_RH_ACTIONS_URL?.trim();
    if (!fromEnv) return "/webhook/api/rh/actions";
    const normalized = fromEnv.toLowerCase();
    const looksLikeRhActionsResource =
        normalized.includes("/api/rh/actions") || normalized.endsWith("/rh/actions") || normalized.endsWith("/api/rh/actions");
    return looksLikeRhActionsResource ? fromEnv : "/webhook/api/rh/actions";
}

export type RhActionRequestType =
    | "skill_gap"
    | "reallocation"
    | "training"
    | "overload"
    | "recruitment";

export type PostRhActionBody = {
    project_id?: string;
    type: RhActionRequestType;
    message: string;
    priority?: "urgent" | "normal" | "low";
    payload?: Record<string, unknown>;
};

export async function postRhAction(body: PostRhActionBody, options?: ApiClientOptions): Promise<unknown> {
    const payload: Record<string, unknown> = { ...body };
    if (body.project_id?.trim()) payload.project_id = assertUuid(body.project_id, "project_id");
    else delete payload.project_id;
    return apiPost<unknown>(basePath(), payload, options);
}

/** Liste : même source qu’avant refactor (`/webhook/api/rh/actions` ou `VITE_RH_ACTIONS_URL`) — payload n8n `{ status, items[] }`. */
const RH_ACTIONS_PATCH_PATH = "/api/rh/actions";

const RH_ACTIONS_PATCH_KEYS = ["status", "response_message", "assigned_to"] as const;

/** Corps PATCH strictement limité aux champs acceptés par le webhook n8n. */
function slimRhActionPatchBody(body: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const k of RH_ACTIONS_PATCH_KEYS) {
        if (Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined) {
            out[k] = body[k];
        }
    }
    return out;
}

/** Chemin relatif utilisé pour le PATCH (logs / tests). */
export function rhActionsPatchPath(id: string): string {
    const raw = String(id ?? "").trim();
    if (!raw) return RH_ACTIONS_PATCH_PATH;
    return `${RH_ACTIONS_PATCH_PATH}/${encodeURIComponent(raw)}`;
}

export async function fetchRhActionsList(
    params: { status?: string; project_id?: string; limit?: number },
    options?: ApiClientOptions,
): Promise<unknown> {
    const query = new URLSearchParams();
    if (params.status?.trim()) query.set("status", params.status.trim());
    if (params.project_id?.trim()) query.set("project_id", assertUuid(params.project_id, "project_id"));
    if (params.limit != null) query.set("limit", String(params.limit));
    const qs = query.toString();
    return apiGet<unknown>(qs ? `${basePath()}?${qs}` : basePath(), options);
}

/**
 * PATCH workflow RH — uniquement `status`, `response_message`, `assigned_to`.
 * Réponses 200 avec corps non-JSON (ex. texte « OK ») traitées comme succès.
 */
export async function patchRhAction(id: string, body: Record<string, unknown>, options?: ApiClientOptions): Promise<unknown> {
    const rawId = String(id ?? "").trim();
    if (!rawId) {
        throw new Error("action_id requis.");
    }
    const path = rhActionsPatchPath(rawId);
    const payload = slimRhActionPatchBody(body);
    return apiPatch<unknown>(path, payload, { ...options, acceptNonJson200: true });
}

/** Plan de formation — POST dédié si le workflow l’expose (corps minimal). */
export async function postRhTrainingPlan(body: Record<string, unknown> = {}, options?: ApiClientOptions): Promise<unknown> {
    const fromEnv = (import.meta.env as Record<string, string | undefined>).VITE_RH_TRAINING_PLAN_URL?.trim();
    const path = fromEnv || "/webhook/api/rh/training-plan";
    return apiPost<unknown>(path, body, options);
}
