/**
 * WF_Manager_RH_Actions — GET/POST `/webhook/api/rh/actions`, PATCH `/webhook/{webhookId}/api/rh/actions/:id`.
 */
import {
    RH_ACTIONS_LIST_POST_PATH,
    RH_ACTIONS_PATCH_PATH,
} from "@/api/rh-actions.constants";
import type { ApiClientOptions } from "@/utils/apiClient";
import { apiGet, apiPatch, apiPost } from "@/utils/apiClient";
import { assertUuid } from "@/api/manager-api-contract";
import type {
    PatchRhActionBody,
    PostRhActionBody,
    RhActionCreateResponse,
    RhActionsListResponse,
} from "@/types/manager-rh-actions.types";
import { parseRhActionsListResponse } from "@/utils/rh-actions-workflow";

function listPostBasePath(): string {
    const fromEnv = (import.meta.env as Record<string, string | undefined>).VITE_RH_ACTIONS_URL?.trim();
    return (fromEnv || RH_ACTIONS_LIST_POST_PATH).replace(/\/$/, "");
}

function patchBasePath(): string {
    const fromEnv = (import.meta.env as Record<string, string | undefined>).VITE_RH_ACTIONS_PATCH_URL?.trim();
    return (fromEnv || RH_ACTIONS_PATCH_PATH).replace(/\/$/, "");
}

export type { PostRhActionBody, PatchRhActionBody, RhActionItem, RhActionsListResponse } from "@/types/manager-rh-actions.types";
export type RhActionRequestType = PostRhActionBody["type"];

export {
    RH_ACTIONS_LIST_POST_PATH,
    RH_ACTIONS_PATCH_PATH,
    RH_ACTIONS_LIST_POST_URL_PRODUCTION,
    RH_ACTIONS_PATCH_URL_PRODUCTION,
} from "@/api/rh-actions.constants";

export function rhActionsPatchPath(id: string): string {
    const raw = String(id ?? "").trim();
    const base = patchBasePath();
    if (!raw) return base;
    return `${base}/${encodeURIComponent(raw)}`;
}

export async function fetchRhActionsList(
    params: { status?: string; project_id?: string },
    options?: ApiClientOptions,
): Promise<RhActionsListResponse> {
    const query = new URLSearchParams();
    if (params.status?.trim()) query.set("status", params.status.trim());
    if (params.project_id?.trim()) query.set("project_id", assertUuid(params.project_id, "project_id"));
    const qs = query.toString();
    const path = qs ? `${listPostBasePath()}?${qs}` : listPostBasePath();
    if (import.meta.env.DEV) {
        console.log("[RH Actions GET]", path);
    }
    const raw = await apiGet<unknown>(path, options);
    return parseRhActionsListResponse(raw);
}

export async function postRhAction(
    body: PostRhActionBody,
    options?: ApiClientOptions,
): Promise<RhActionCreateResponse> {
    const payload: Record<string, unknown> = {
        type: body.type,
        message: body.message.trim(),
        priority: body.priority,
    };
    if (body.project_id?.trim()) payload.project_id = assertUuid(body.project_id, "project_id");
    if (body.assigned_to?.trim()) payload.assigned_to = assertUuid(body.assigned_to, "assigned_to");
    const path = listPostBasePath();
    if (import.meta.env.DEV) {
        console.log("[RH Actions POST]", path, payload);
    }
    return apiPost<RhActionCreateResponse>(path, payload, options);
}

export async function patchRhAction(
    id: string,
    body: PatchRhActionBody,
    options?: ApiClientOptions,
): Promise<unknown> {
    const rawId = String(id ?? "").trim();
    if (!rawId) throw new Error("action_id requis.");
    const payload: Record<string, unknown> = {};
    if (body.status) payload.status = body.status;
    if (body.response_message?.trim()) payload.response_message = body.response_message.trim();
    if (body.assigned_to?.trim()) payload.assigned_to = assertUuid(body.assigned_to, "assigned_to");
    const path = rhActionsPatchPath(rawId);
    if (import.meta.env.DEV) {
        console.log("[RH Actions PATCH]", path, payload);
    }
    return apiPatch<unknown>(path, payload, { ...options, acceptNonJson200: true });
}
