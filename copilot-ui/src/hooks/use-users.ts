import { useCallback, useEffect, useMemo, useState } from "react";
import { backendApi } from "@/config/backend-api";
import { ApiError, apiGet, apiPatch, apiPost } from "@/utils/apiClient";

export type UserRole = "rh" | "manager" | "talent";
export type UserStatus = "pending" | "active" | "disabled";

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserInput {
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
}

export interface CreateUserInput extends UserInput {
    initialPassword: string;
    mustChangePassword?: boolean;
    passwordValidityMonths?: number;
}

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_PAGE_SIZE = 10;

export type UseUsersOptions = {
    /** Defaults to 10. Use a larger value for admin directory views. */
    pageSize?: number;
};

const normalizeRole = (v: unknown): UserRole => {
    const s = String(v ?? "").toLowerCase();
    if (s === "rh") return "rh";
    if (s === "manager") return "manager";
    return "talent";
};

const normalizeStatus = (v: unknown): UserStatus => {
    const s = String(v ?? "").toLowerCase();
    if (s === "pending") return "pending";
    if (s === "disabled" || s === "inactive") return "disabled";
    return "active";
};

const mapUser = (raw: unknown, index: number): User => {
    const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const id = r.id != null ? String(r.id) : `user-${index}`;
    const full = String(r.fullName ?? r.full_name ?? "").trim();
    const parts = full ? full.split(/\s+/) : [];
    return {
        id,
        firstName: String(r.firstName ?? r.first_name ?? (parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "")),
        lastName: String(r.lastName ?? r.last_name ?? (parts.length > 1 ? parts[parts.length - 1]! : "")),
        email: String(r.email ?? ""),
        role: normalizeRole(r.role),
        status: normalizeStatus(r.status),
        createdAt: r.createdAt != null ? String(r.createdAt) : r.created_at != null ? String(r.created_at) : undefined,
        updatedAt: r.updatedAt != null ? String(r.updatedAt) : r.updated_at != null ? String(r.updated_at) : undefined,
    };
};

/** Corps attendu par le backend (cf. docs/BRIEF-BACKEND-COLLEGUE.md). */
function buildCreateUserBody(input: CreateUserInput): Record<string, unknown> {
    const fullName = `${input.firstName} ${input.lastName}`.trim() || input.email.trim();
    return {
        fullName,
        email: input.email.trim(),
        role: input.role,
        password: input.initialPassword,
        mustChangePassword: input.mustChangePassword ?? true,
    };
}

const extractList = (payload: unknown): unknown[] => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items;
    if (Array.isArray(o.users)) return o.users;
    if (Array.isArray(o.data)) return o.data;
    if (o.data && typeof o.data === "object") {
        const d = o.data as Record<string, unknown>;
        if (Array.isArray(d.items)) return d.items;
        if (Array.isArray(d.users)) return d.users;
    }
    return [];
};

const extractTotal = (payload: unknown, fallback: number): number => {
    if (!payload || typeof payload !== "object") return fallback;
    const o = payload as Record<string, unknown>;
    const t = o.total ?? o.totalCount ?? (o.meta && typeof o.meta === "object" ? (o.meta as Record<string, unknown>).total : undefined);
    const n = Number(t);
    return Number.isFinite(n) ? n : fallback;
};

export function useUsers(options?: UseUsersOptions) {
    const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(id);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, roleFilter, statusFilter]);

    const fetchUsers = useCallback(
        async (signal?: AbortSignal) => {
            setIsLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams();
                params.set("page", String(page));
                params.set("pageSize", String(pageSize));
                if (debouncedSearch) params.set("search", debouncedSearch);
                if (roleFilter !== "all") params.set("role", roleFilter);
                if (statusFilter !== "all") params.set("status", statusFilter);
                const q = params.toString();
                const payload = await apiGet<unknown>(`${backendApi.rhUsersList}${q ? `?${q}` : ""}`, { timeout: DEFAULT_TIMEOUT, signal });
                const list = extractList(payload).map(mapUser);
                setUsers(list);
                setTotal(extractTotal(payload, list.length));
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") return;
                setUsers([]);
                setTotal(0);
                setError(err instanceof ApiError ? err.message : "Erreur de connexion");
            } finally {
                setIsLoading(false);
            }
        },
        [page, pageSize, debouncedSearch, roleFilter, statusFilter],
    );

    useEffect(() => {
        const c = new AbortController();
        void fetchUsers(c.signal);
        return () => c.abort();
    }, [fetchUsers]);

    const createUser = useCallback(
        async (input: CreateUserInput) => {
            setSaving(true);
            setError(null);
            try {
                await apiPost<unknown>(backendApi.rhUsersCreate, buildCreateUserBody(input), { timeout: DEFAULT_TIMEOUT });
                await fetchUsers();
            } catch (err) {
                const msg = err instanceof ApiError ? err.message : "Erreur de connexion";
                setError(msg);
                throw err;
            } finally {
                setSaving(false);
            }
        },
        [fetchUsers],
    );

    const resetUserPassword = useCallback(
        async (id: string, initialPassword: string, mustChangePassword = true) => {
            setSaving(true);
            setError(null);
            try {
                await apiPatch<unknown>(
                    backendApi.rhUserPasswordReset(id),
                    { newPassword: initialPassword, mustChangePassword },
                    { timeout: DEFAULT_TIMEOUT },
                );
                await fetchUsers();
            } catch (err) {
                const msg = err instanceof ApiError ? err.message : "Erreur de connexion";
                setError(msg);
                throw err;
            } finally {
                setSaving(false);
            }
        },
        [fetchUsers],
    );

    /** Mise à jour : PATCH rôle puis statut (body minimal : `id` + champ ciblé — cf. brief backend). */
    const updateUser = useCallback(
        async (id: string, input: UserInput) => {
            setSaving(true);
            setError(null);
            try {
                await apiPatch<unknown>(backendApi.rhUsersRole, { id, role: input.role }, { timeout: DEFAULT_TIMEOUT });
                await apiPatch<unknown>(backendApi.rhUsersStatus, { id, status: input.status }, { timeout: DEFAULT_TIMEOUT });
                await fetchUsers();
            } catch (err) {
                const msg = err instanceof ApiError ? err.message : "Erreur de connexion";
                setError(msg);
                throw err;
            } finally {
                setSaving(false);
            }
        },
        [fetchUsers],
    );

    const setUserStatus = useCallback(
        async (id: string, status: UserStatus) => {
            setSaving(true);
            setError(null);
            try {
                await apiPatch<unknown>(backendApi.rhUsersStatus, { id, status }, { timeout: DEFAULT_TIMEOUT });
                await fetchUsers();
            } catch (err) {
                const msg = err instanceof ApiError ? err.message : "Erreur de connexion";
                setError(msg);
                throw err;
            } finally {
                setSaving(false);
            }
        },
        [fetchUsers],
    );

    const retry = useCallback(() => void fetchUsers(), [fetchUsers]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

    return useMemo(
        () => ({
            users,
            total,
            page,
            setPage,
            pageSize,
            totalPages,
            search,
            setSearch,
            roleFilter,
            setRoleFilter,
            statusFilter,
            setStatusFilter,
            isLoading,
            error,
            saving,
            retry,
            createUser,
            updateUser,
            setUserStatus,
            resetUserPassword,
        }),
        [
            users,
            total,
            page,
            pageSize,
            totalPages,
            search,
            roleFilter,
            statusFilter,
            isLoading,
            error,
            saving,
            retry,
            createUser,
            updateUser,
            setUserStatus,
            resetUserPassword,
        ],
    );
}
