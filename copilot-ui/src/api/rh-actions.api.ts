/**
 * File d’actions RH — POST création, GET liste (même ressource REST).
 * v3 (Bearer JWT) : pas de `enterprise_id` en query/body — tenant et manager issus du token.
 */
import type { ApiClientOptions } from "@/utils/apiClient";
import { ApiError, apiGet, apiPost, getApiAuthToken } from "@/utils/apiClient";
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

/** PATCH — corps sans enterprise_id (tenant via JWT). */
export async function patchRhAction(id: string, body: Record<string, unknown>, options?: ApiClientOptions): Promise<unknown> {
    const actionId = assertUuid(id, "action_id");
    const { enterprise_id: _e, ...rest } = body;
    const token = getApiAuthToken();
    const timeoutMs = options?.timeout ?? 30_000;
    const timeoutController = new AbortController();
    const timer = window.setTimeout(() => timeoutController.abort(), timeoutMs);
    const signal = options?.signal ?? timeoutController.signal;

    const request = async (url: string): Promise<unknown> => {
        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(rest),
            credentials: "include",
            signal,
        });
        const text = await response.text();
        let payload: unknown = text;
        if (text.trim()) {
            try {
                payload = JSON.parse(text);
            } catch {
                payload = text;
            }
        }
        if (!response.ok) throw new ApiError(`Échec ${response.status} ${response.statusText}`, response.status, payload);
        return payload;
    };

    const primaryUrl = `${window.location.origin}/webhook/api/rh/actions/${encodeURIComponent(actionId)}`;
    const fallbackUrl = `${window.location.origin}/api/rh/actions/${encodeURIComponent(actionId)}`;
    try {
        return await request(primaryUrl);
    } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 500) throw e;
        return request(fallbackUrl);
    } finally {
        window.clearTimeout(timer);
    }
}

/** Plan de formation — POST dédié si le workflow l’expose (corps minimal). */
export async function postRhTrainingPlan(body: Record<string, unknown> = {}, options?: ApiClientOptions): Promise<unknown> {
    const fromEnv = (import.meta.env as Record<string, string | undefined>).VITE_RH_TRAINING_PLAN_URL?.trim();
    const path = fromEnv || "/webhook/api/rh/training-plan";
    return apiPost<unknown>(path, body, options);
}
