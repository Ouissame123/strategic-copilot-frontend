/**
 * WF_RH — GET `{base}/rh/managers` (liste managers pour affectation talent).
 */
import { resolveRhWebhookBase } from "@/api/rh-dashboard.api";
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import type { RhManagerListItem, RhManagersListResponse } from "@/types/rh-assignments.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export type RhManagersFetchOptions = ApiClientOptions & {
    token?: string | null;
    apiBase?: string;
};

export class RhManagersApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, options?: { httpStatus?: number }) {
        super(message);
        this.name = "RhManagersApiError";
        this.httpStatus = options?.httpStatus ?? 0;
    }
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function messageFromBody(raw: unknown, fallback: string): string {
    const root = unwrapN8nRoot(raw);
    return str(root.message ?? root.error ?? root.detail) || fallback;
}

function parseManagerItem(raw: unknown): RhManagerListItem | null {
    const r = asRecord(raw);
    const id = str(r.id ?? r.user_id ?? r.manager_user_id);
    if (!id) return null;
    const full_name = str(r.full_name ?? r.fullName ?? r.name ?? r.display_name);
    const email = str(r.email ?? r.manager_email);
    return {
        id,
        full_name: full_name || email || id,
        email: email || "",
    };
}

export function normalizeRhManagersList(raw: unknown): RhManagersListResponse | null {
    if (raw == null) return null;
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") return null;

    const data = asRecord(root.data);
    const managersRaw = root.managers ?? data.managers ?? root.items ?? root.users;
    const managers = Array.isArray(managersRaw)
        ? managersRaw.map(parseManagerItem).filter((x): x is RhManagerListItem => x != null)
        : [];

    if (!managers.length && root.status !== "success" && !Array.isArray(managersRaw)) {
        return null;
    }

    return {
        status: str(root.status) || undefined,
        managers,
        message: str(root.message) || null,
    };
}

export function rhManagersListUrl(apiBase?: string): string {
    const base = resolveRhWebhookBase(apiBase);
    return `${base}/rh/managers`;
}

export function mapRhManagersError(err: unknown): string {
    if (err instanceof RhManagersApiError) return err.message;
    return err instanceof Error ? err.message : "Erreur chargement managers";
}

export async function fetchRhManagersList(options?: RhManagersFetchOptions): Promise<RhManagersListResponse> {
    const url = rhManagersListUrl(options?.apiBase);
    const res = await fetch(url, {
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });

    let json: unknown;
    try {
        json = await res.json();
    } catch {
        json = {};
    }

    if (!res.ok) {
        throw new RhManagersApiError(messageFromBody(json, `Liste managers : HTTP ${res.status}`), {
            httpStatus: res.status,
        });
    }

    const normalized = normalizeRhManagersList(json);
    if (normalized) return normalized;

    const root = unwrapN8nRoot(json);
    if (root.status === "error") {
        throw new RhManagersApiError(messageFromBody(json, "Liste managers refusée"), {
            httpStatus: res.status,
        });
    }
    throw new RhManagersApiError(messageFromBody(json, "Réponse managers invalide"), {
        httpStatus: res.status,
    });
}
