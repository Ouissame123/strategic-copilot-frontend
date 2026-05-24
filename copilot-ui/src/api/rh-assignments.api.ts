/**
 * WF_RH_Assignments — GET/POST `{base}/rh/assignments`.
 */
import { resolveRhWebhookBase } from "@/api/rh-dashboard.api";
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import type {
    CreateRhAssignmentPayload,
    RhAssignmentMutationResponse,
    RhAssignmentRow,
    RhAssignmentsListParams,
    RhAssignmentsListResponse,
} from "@/types/rh-assignments.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export type RhAssignmentsFetchOptions = ApiClientOptions & {
    token?: string | null;
    apiBase?: string;
};

export class RhAssignmentsApiError extends Error {
    readonly code?: string;
    readonly httpStatus: number;

    constructor(message: string, options?: { code?: string; httpStatus?: number }) {
        super(message);
        this.name = "RhAssignmentsApiError";
        this.code = options?.code;
        this.httpStatus = options?.httpStatus ?? 0;
    }
}

export const RH_ASSIGNMENTS_OVERLOAD_CODE = "OVERLOAD_PREVENTED";

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function bool(v: unknown): boolean | null {
    if (v === true || v === "true" || v === 1 || v === "1") return true;
    if (v === false || v === "false" || v === 0 || v === "0") return false;
    return null;
}

function messageFromBody(raw: unknown, fallback: string): string {
    const root = unwrapN8nRoot(raw);
    return str(root.message ?? root.error ?? root.detail) || fallback;
}

function codeFromBody(raw: unknown): string | undefined {
    const root = unwrapN8nRoot(raw);
    const code = str(root.code ?? root.error_code);
    return code || undefined;
}

function parseAssignmentRow(raw: unknown): RhAssignmentRow | null {
    const r = asRecord(raw);
    const talent_id = str(r.talent_id);
    const id = str(r.id ?? r.assignment_id) || talent_id;
    if (!id) return null;

    const manager_user_id = str(r.manager_user_id ?? r.manager_id) || null;
    const manager_name = str(r.manager_name) || null;
    const has_managerRaw = bool(r.has_manager);
    const has_manager =
        has_managerRaw ??
        Boolean(manager_user_id || manager_name);

    return {
        id,
        talent_id: talent_id || id,
        talent_name: str(r.talent_name) || null,
        talent_email: str(r.talent_email) || null,
        job_title: str(r.job_title) || null,
        manager_user_id,
        manager_name,
        manager_email: str(r.manager_email) || null,
        has_manager,
        updated_at: str(r.updated_at ?? r.updatedAt) || null,
    };
}

export function normalizeRhAssignmentsList(raw: unknown): RhAssignmentsListResponse | null {
    if (raw == null) return null;
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") return null;

    const data = asRecord(root.data);
    const assignmentsRaw = root.assignments ?? data.assignments ?? root.items;

    const assignments = Array.isArray(assignmentsRaw)
        ? assignmentsRaw.map(parseAssignmentRow).filter((x): x is RhAssignmentRow => x != null)
        : [];

    if (!assignments.length && root.status !== "success" && !Array.isArray(assignmentsRaw)) {
        return null;
    }

    return {
        status: str(root.status) || undefined,
        assignments,
        message: str(root.message) || null,
    };
}

function normalizeMutation(raw: unknown): RhAssignmentMutationResponse {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") {
        throw new RhAssignmentsApiError(messageFromBody(raw, "Opération affectation refusée"), {
            code: codeFromBody(raw),
            httpStatus: 400,
        });
    }
    const assignmentRaw = root.assignment ?? asRecord(root.data).assignment ?? root;
    const assignment = assignmentRaw ? parseAssignmentRow(assignmentRaw) : null;
    return {
        status: str(root.status) || undefined,
        assignment,
        message: str(root.message) || null,
    };
}

function buildListQuery(params: RhAssignmentsListParams): string {
    const q = new URLSearchParams({
        status: params.status?.trim() || "all",
        limit: String(Math.min(Math.max(params.limit ?? 200, 1), 500)),
    });
    return q.toString();
}

export function rhAssignmentsBaseUrl(apiBase?: string): string {
    const base = resolveRhWebhookBase(apiBase);
    return `${base}/rh/assignments`;
}

export function rhAssignmentsCollectionUrl(apiBase?: string, params?: RhAssignmentsListParams): string {
    const query = buildListQuery(params ?? { status: "all", limit: 200 });
    return `${rhAssignmentsBaseUrl(apiBase)}?${query}`;
}

export function rhAssignmentItemUrl(id: string, apiBase?: string): string {
    const base = resolveRhWebhookBase(apiBase);
    return `${base}/rh/assignments/${encodeURIComponent(id.trim())}`;
}

export function mapRhAssignmentsError(err: unknown): string {
    if (err instanceof RhAssignmentsApiError) {
        if (err.code === RH_ASSIGNMENTS_OVERLOAD_CODE) {
            return "Affectation refusée : surcharge détectée.";
        }
        return err.message;
    }
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.toLowerCase().includes("overload_prevented")) {
        return "Affectation refusée : surcharge détectée.";
    }
    return raw || "Erreur affectations RH";
}

async function parseJsonResponse(res: Response): Promise<unknown> {
    try {
        return await res.json();
    } catch {
        return {};
    }
}

function throwIfRhError(res: Response, json: unknown, fallback: string): void {
    if (res.ok) return;
    const code = codeFromBody(json);
    throw new RhAssignmentsApiError(messageFromBody(json, `${fallback} : HTTP ${res.status}`), {
        code,
        httpStatus: res.status,
    });
}

export async function fetchRhAssignmentsList(
    params: RhAssignmentsListParams,
    options?: RhAssignmentsFetchOptions,
): Promise<RhAssignmentsListResponse> {
    const url = rhAssignmentsCollectionUrl(options?.apiBase, params);
    const res = await fetch(url, {
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });

    const json = await parseJsonResponse(res);
    throwIfRhError(res, json, "Liste affectations");

    const normalized = normalizeRhAssignmentsList(json);
    if (normalized) return normalized;

    const root = unwrapN8nRoot(json);
    if (root.status === "error") {
        throw new RhAssignmentsApiError(messageFromBody(json, "Liste affectations refusée"), {
            code: codeFromBody(json),
            httpStatus: res.status,
        });
    }
    throw new RhAssignmentsApiError(messageFromBody(json, "Réponse affectations invalide"), {
        httpStatus: res.status,
    });
}

export async function createRhAssignment(
    body: CreateRhAssignmentPayload,
    options?: RhAssignmentsFetchOptions,
): Promise<RhAssignmentMutationResponse> {
    const url = rhAssignmentsBaseUrl(options?.apiBase);
    const res = await fetch(url, {
        method: "POST",
        headers: {
            ...buildRhTalentsAuthHeaders(options?.token),
            "Content-Type": "application/json",
        },
        credentials: "omit",
        signal: options?.signal,
        body: JSON.stringify({
            talent_id: body.talent_id.trim(),
            manager_user_id: body.manager_user_id.trim(),
        }),
    });

    const json = await parseJsonResponse(res);
    if (!res.ok) {
        const code = codeFromBody(json);
        throw new RhAssignmentsApiError(messageFromBody(json, `Création affectation : HTTP ${res.status}`), {
            code,
            httpStatus: res.status,
        });
    }
    return normalizeMutation(json);
}

export async function deleteRhAssignment(
    id: string,
    options?: RhAssignmentsFetchOptions,
): Promise<{ message?: string | null }> {
    const url = rhAssignmentItemUrl(id, options?.apiBase);
    const res = await fetch(url, {
        method: "DELETE",
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });

    const json = await parseJsonResponse(res);
    if (!res.ok) {
        throw new RhAssignmentsApiError(messageFromBody(json, `Suppression affectation : HTTP ${res.status}`), {
            code: codeFromBody(json),
            httpStatus: res.status,
        });
    }
    const root = unwrapN8nRoot(json);
    if (root.status === "error") {
        throw new RhAssignmentsApiError(messageFromBody(json, "Suppression affectation refusée"), {
            code: codeFromBody(json),
            httpStatus: res.status,
        });
    }
    return { message: str(root.message) || null };
}
