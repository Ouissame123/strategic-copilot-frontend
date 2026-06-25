/**
 * WF_RH_Users_Management — endpoints prod :
 *   POST/GET  `${API_BASE}/webhook/rh/users`
 *   PATCH     `${API_BASE}/webhook/wf-rh-users-patch-v1/rh/users/:id`
 *   DELETE    `${API_BASE}/webhook/wf-rh-users-delete-v1/rh/users/:id`
 */
import { isAxiosError } from "axios";
import { ApiError } from "@/api/errors";
import {
    rhAccountsUsersDeletePath,
    rhAccountsUsersPatchPath,
    rhAccountsUsersPath,
} from "@/lib/api-config";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";
import type {
    RhUser,
    RhUserCreateInput,
    RhUserCreateResponse,
    RhUserDeleteResponse,
    RhUserPatchInput,
    RhUserPatchResponse,
    RhUsersListFilters,
    RhUsersListResponse,
    RhUsersSummary,
    UserRole,
    UserStatus,
} from "@/types/rh-users.types";
import type {
    RhCreateStaffAccountResponse,
    RhDeleteStaffAccountResponse,
    RhPatchStaffAccountResponse,
    RhStaffAccount,
    RhStaffAccountsListResponse,
    RhStaffRole,
} from "@/types/rh-accounts.types";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const AXIOS_OPTS: HttpClientRequestConfig = { skipGlobalHttpErrorToast: true };

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function parseUserRole(raw: unknown): UserRole | null {
    const s = str(raw).toLowerCase();
    if (s === "manager" || s === "rh" || s === "admin") return s;
    return null;
}

function parseUserStatus(raw: unknown): UserStatus {
    const s = str(raw).toLowerCase();
    return s === "disabled" || s === "inactive" ? "disabled" : "active";
}

function normalizeRhUser(raw: unknown): RhUser | null {
    const r = asRecord(raw);
    const id = str(r.id);
    const email = str(r.email);
    const role = parseUserRole(r.role);
    if (!id || !email || !role) return null;

    return {
        id,
        full_name: str(r.full_name ?? r.fullName ?? r.name) || email,
        email,
        role,
        status: parseUserStatus(r.status),
        managed_talents_count: num(r.managed_talents_count ?? r.managedTalentsCount),
        created_at: str(r.created_at ?? r.createdAt) || new Date().toISOString(),
        updated_at: str(r.updated_at ?? r.updatedAt) || str(r.created_at) || new Date().toISOString(),
    };
}

function normalizeListResponse(raw: unknown): RhUsersListResponse {
    const root = unwrapN8nRoot(raw);
    const listRaw = Array.isArray(root.items)
        ? root.items
        : Array.isArray(root.users)
          ? root.users
          : [];
    const items = listRaw.map(normalizeRhUser).filter((u): u is RhUser => u != null);
    const summaryRaw = asRecord(root.summary);
    const filtersRaw = asRecord(root.filters_applied ?? root.filters);

    const summary: RhUsersSummary = {
        total: num(summaryRaw.total, items.length),
        managers: num(summaryRaw.managers),
        rh: num(summaryRaw.rh),
        admins: num(summaryRaw.admins),
    };

    return {
        status: "success",
        workflow: str(root.workflow) || undefined,
        operation: "list",
        enterprise_id: str(root.enterprise_id),
        count: num(root.count, items.length),
        items,
        users: items,
        filters_applied: {
            role: parseUserRole(filtersRaw.role),
            status: parseUserStatus(filtersRaw.status ?? "active"),
            search: str(filtersRaw.search) || null,
            limit: num(filtersRaw.limit, 100),
            offset: num(filtersRaw.offset, 0),
        },
        summary,
    };
}

function throwApiError(err: unknown, fallback: string): never {
    if (isAxiosError(err)) {
        const data = err.response?.data;
        const root = data != null ? unwrapN8nRoot(data) : {};
        const errors = root.errors;
        const message =
            Array.isArray(errors) && errors.length
                ? errors.map(String).join(" · ")
                : str(root.message ?? root.error) || fallback;
        throw new ApiError(message, err.response?.status, data);
    }
    throw err instanceof ApiError ? err : new ApiError(fallback);
}

/** GET — liste managers/RH/admin */
export async function listRhUsers(filters: RhUsersListFilters = {}): Promise<RhUsersListResponse> {
    const params: Record<string, string | number> = {};
    if (filters.role) params.role = filters.role;
    if (filters.status) params.status = filters.status;
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.limit != null) params.limit = filters.limit;
    if (filters.offset != null) params.offset = filters.offset;

    try {
        const { data } = await httpClient.get<unknown>(rhAccountsUsersPath(), { params, ...AXIOS_OPTS });
        return normalizeListResponse(data);
    } catch (err) {
        throwApiError(err, "Impossible de charger les utilisateurs.");
    }
}

/** POST — créer manager ou RH uniquement */
export async function createRhUser(input: RhUserCreateInput): Promise<RhUserCreateResponse> {
    if (input.role !== "manager" && input.role !== "rh") {
        throw new ApiError("Rôle invalide — manager ou rh uniquement.", 400);
    }

    try {
        const { data } = await httpClient.post<unknown>(rhAccountsUsersPath(), input, AXIOS_OPTS);
        const root = unwrapN8nRoot(data);
        if (root.status === "error") {
            throw new ApiError(str(root.message) || "Échec de création", undefined, root);
        }
        const user = normalizeRhUser(root.user);
        if (!user) throw new ApiError("Réponse création invalide.", 500, data);

        return {
            status: "success",
            operation: "create",
            user: {
                ...user,
                enterprise_id: str(asRecord(root.user).enterprise_id ?? asRecord(root.user).enterpriseId),
            },
            message: str(root.message) || "Compte créé",
        };
    } catch (err) {
        throwApiError(err, "Échec de création du compte.");
    }
}

/** PATCH — change_password | toggle_status */
export async function patchRhUser(id: string, input: RhUserPatchInput): Promise<RhUserPatchResponse> {
    const userId = id.trim();
    if (!userId) throw new ApiError("Identifiant utilisateur invalide.", 400);

    try {
        const { data } = await httpClient.patch<unknown>(rhAccountsUsersPatchPath(userId), input, AXIOS_OPTS);
        const root = unwrapN8nRoot(data);
        if (root.status === "error") {
            throw new ApiError(str(root.message) || "Échec de la mise à jour", undefined, root);
        }
        const user = asRecord(root.user);
        const role = parseUserRole(user.role) ?? "manager";

        return {
            status: "success",
            operation: str(root.operation) === "change_password" ? "change_password" : "toggle_status",
            user: {
                id: str(user.id ?? userId),
                full_name: str(user.full_name ?? user.fullName),
                email: str(user.email),
                role,
                status: parseUserStatus(user.status),
                updated_at: str(user.updated_at ?? user.updatedAt),
            },
            sessions_revoked: num(root.sessions_revoked),
            message: str(root.message) || "Mis à jour",
        };
    } catch (err) {
        throwApiError(err, "Échec de la mise à jour du compte.");
    }
}

/** DELETE — soft delete + cascade */
export async function deleteRhUser(id: string): Promise<RhUserDeleteResponse> {
    const userId = id.trim();
    if (!userId) throw new ApiError("Identifiant utilisateur invalide.", 400);

    try {
        const { data } = await httpClient.delete<unknown>(rhAccountsUsersDeletePath(userId), AXIOS_OPTS);
        const root = unwrapN8nRoot(data);
        if (root.status === "error") {
            throw new ApiError(str(root.message) || "Échec de la suppression", undefined, root);
        }
        const user = asRecord(root.user);
        const cascade = asRecord(root.cascade);
        const role = parseUserRole(user.role) ?? "manager";

        return {
            status: "success",
            operation: "delete",
            already_disabled: root.already_disabled === true,
            user: {
                id: str(user.id ?? userId),
                full_name: str(user.full_name ?? user.fullName),
                email: str(user.email),
                role,
                new_status: "disabled",
            },
            cascade: {
                sessions_revoked: num(cascade.sessions_revoked),
                talents_unassigned: num(cascade.talents_unassigned),
            },
            message: str(root.message) || "Compte désactivé",
        };
    } catch (err) {
        throwApiError(err, "Échec de la suppression du compte.");
    }
}

/** Adaptateurs legacy rh-accounts */
export function toLegacyStaffAccount(u: RhUser): RhStaffAccount {
    return {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.role as RhStaffRole,
        status: u.status,
        managed_talents_count: u.managed_talents_count,
        created_at: u.created_at,
        updated_at: u.updated_at,
    };
}

export function toLegacyStaffListResponse(data: RhUsersListResponse): RhStaffAccountsListResponse {
    return {
        status: data.status,
        count: data.count,
        users: data.items.map(toLegacyStaffAccount),
        summary: data.summary,
    };
}

export function toLegacyCreateStaffResponse(data: RhUserCreateResponse): RhCreateStaffAccountResponse {
    return {
        status: data.status,
        user: toLegacyStaffAccount(data.user),
        message: data.message,
    };
}

export function toLegacyPatchStaffResponse(data: RhUserPatchResponse): RhPatchStaffAccountResponse {
    return {
        status: data.status,
        user: {
            id: data.user.id,
            full_name: data.user.full_name,
            email: data.user.email,
            role: data.user.role as RhStaffRole,
            status: data.user.status,
            managed_talents_count: 0,
            updated_at: data.user.updated_at,
        },
        message: data.message,
    };
}

export function toLegacyDeleteStaffResponse(data: RhUserDeleteResponse): RhDeleteStaffAccountResponse {
    return {
        status: data.status,
        user: {
            id: data.user.id,
            full_name: data.user.full_name,
            email: data.user.email,
            role: data.user.role as RhStaffRole,
            status: "disabled",
            managed_talents_count: 0,
        },
        cascade: data.cascade,
        message: data.message,
    };
}
