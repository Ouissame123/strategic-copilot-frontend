/**
 * WF_RH_Requests_Decision — client HTTP RH (`/webhook/rh/requests`).
 * Authorization: Bearer via `apiGet` / `apiPatch` (`getApiAuthToken`).
 */
import {
    rhRequestDecisionUrl,
    RH_REQUESTS_BASE_PATH,
    RH_REQUESTS_URL_PRODUCTION,
    type RhRequestPatchStatus,
} from "@/api/rh-requests-decision.constants";
import type { RhActionItem } from "@/types/manager-rh-actions.types";
import { ApiError } from "@/api/errors";
import { authStorage } from "@/lib/auth-storage";
import type { ApiClientOptions } from "@/utils/apiClient";
import { apiGet, getApiAuthToken } from "@/utils/apiClient";
import { assertUuid } from "@/api/manager-api-contract";

export { RH_REQUESTS_BASE_PATH, RH_REQUESTS_URL_PRODUCTION };

function basePath(): string {
    const fromEnv = (import.meta.env as Record<string, string | undefined>).VITE_RH_REQUESTS_URL?.trim();
    return (fromEnv || RH_REQUESTS_BASE_PATH).replace(/\/$/, "");
}

function itemPath(id: string): string {
    return `${basePath()}/${encodeURIComponent(id)}`;
}

export type RhRequestsListFilters = {
    status?: string;
    type?: string;
    priority?: string;
    project_id?: string;
};

export type RhRequestsListResponse = {
    status: string;
    workflow: string;
    action: string;
    count: number;
    items: RhActionItem[];
};

export type RhRequestGetResponse = {
    status: string;
    workflow: string;
    action: string;
    data: RhActionItem;
};

/** Corps PATCH décision RH — `status` (EN) + `reason` uniquement. */
export type RhRequestPatchBody = {
    status: RhRequestPatchStatus;
    reason: string;
};

export type RhRequestPatchResponse = {
    status: string;
    workflow: string;
    action: string;
    data: RhActionItem;
};

export type RhRequestHistoryEntry = {
    status: string | null;
    response_message?: string | null;
    reason?: string | null;
    created_at: string | null;
    updated_at: string | null;
    completed_at: string | null;
};

export type RhRequestHistoryResponse = {
    status: string;
    workflow: string;
    action: string;
    items: RhRequestHistoryEntry[];
};

export async function fetchRhRequestsList(
    filters: RhRequestsListFilters = {},
    options?: ApiClientOptions,
): Promise<RhRequestsListResponse> {
    const query = new URLSearchParams();
    if (filters.status?.trim()) query.set("status", filters.status.trim());
    if (filters.type?.trim()) query.set("type", filters.type.trim());
    if (filters.priority?.trim()) query.set("priority", filters.priority.trim());
    if (filters.project_id?.trim()) query.set("project_id", assertUuid(filters.project_id, "project_id"));
    const qs = query.toString();
    const path = qs ? `${basePath()}?${qs}` : basePath();
    return apiGet<RhRequestsListResponse>(path, options);
}

export async function fetchRhRequestById(id: string, options?: ApiClientOptions): Promise<RhRequestGetResponse> {
    return apiGet<RhRequestGetResponse>(itemPath(id), options);
}

/** PATCH direct n8nprod — évite baseURL localhost / chemins relatifs (Failed to fetch). */
export async function patchRhRequestDecision(
    id: string,
    body: RhRequestPatchBody,
    options?: ApiClientOptions,
): Promise<RhRequestPatchResponse> {
    const requestId = String(id ?? "").trim();
    if (!requestId) {
        throw new ApiError("Identifiant de demande RH invalide", 400);
    }

    const token = getApiAuthToken()?.trim() || authStorage.getAccessToken()?.trim() || "";
    if (!token) {
        throw new ApiError("Session expirée ou token manquant. Reconnectez-vous.", 401);
    }

    const url = rhRequestDecisionUrl(requestId);
    const payload = { status: body.status, reason: body.reason.trim() };

    let response: Response;
    try {
        response = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
            signal: options?.signal,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to fetch";
        throw new ApiError(msg.includes("fetch") ? "Échec réseau vers n8n (CORS ou connexion)." : msg);
    }

    const text = await response.text();
    if (!response.ok) {
        let errorPayload: unknown = text;
        if (text.trim()) {
            try {
                errorPayload = JSON.parse(text) as unknown;
            } catch {
                /* texte brut */
            }
        }
        throw new ApiError(`Échec ${response.status} ${response.statusText}`, response.status, errorPayload);
    }

    if (!text.trim()) return {} as RhRequestPatchResponse;
    try {
        return JSON.parse(text) as RhRequestPatchResponse;
    } catch {
        return {} as RhRequestPatchResponse;
    }
}

/** GET `…/webhook/rh/requests/{id}/actions` */
export async function fetchRhRequestHistory(id: string, options?: ApiClientOptions): Promise<RhRequestHistoryResponse> {
    return apiGet<RhRequestHistoryResponse>(`${itemPath(id)}/actions`, options);
}
