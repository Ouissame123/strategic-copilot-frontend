import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/utils/apiClient";

export type UserRole = "admin" | "manager" | "viewer";
export type UserStatus = "active" | "inactive";

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

const DEFAULT_TIMEOUT = 15000;
const PAGE_SIZE = 10;

const normalizeRole = (v: unknown): UserRole => {
    const s = String(v ?? "").toLowerCase();
    if (s === "admin") return "admin";
    if (s === "viewer") return "viewer";
    return "manager";
};

const normalizeStatus = (v: unknown): UserStatus => {
    const s = String(v ?? "").toLowerCase();
    if (s === "inactive" || s === "disabled") return "inactive";
    return "active";
};

const mapUser = (raw: unknown, index: number): User => {
    const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const id = r.id != null ? String(r.id) : `user-${index}`;
    return {
        id,
        firstName: String(r.firstName ?? r.first_name ?? ""),
        lastName: String(r.lastName ?? r.last_name ?? ""),
        email: String(r.email ?? ""),
        role: normalizeRole(r.role),
        status: normalizeStatus(r.status),
        createdAt: r.createdAt != null ? String(r.createdAt) : r.created_at != null ? String(r.created_at) : undefined,
        updatedAt: r.updatedAt != null ? String(r.updatedAt) : r.updated_at != null ? String(r.updated_at) : undefined,
    };
};

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

export function useUsers() {
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
                params.set("pageSize", String(PAGE_SIZE));
                if (debouncedSearch) params.set("search", debouncedSearch);
                if (roleFilter !== "all") params.set("role", roleFilter);
                if (statusFilter !== "all") params.set("status", statusFilter);
                const payload = await apiGet<unknown>(`/api/users?${params.toString()}`, { timeout: DEFAULT_TIMEOUT, signal });
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
        [page, debouncedSearch, roleFilter, statusFilter],
    );

    useEffect(() => {
        const c = new AbortController();
        void fetchUsers(c.signal);
        return () => c.abort();
    }, [fetchUsers]);

    const createUser = useCallback(
        async (input: UserInput) => {
            setSaving(true);
            setError(null);
            try {
                await apiPost<unknown>("/api/users", input, { timeout: DEFAULT_TIMEOUT });
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

    const updateUser = useCallback(
        async (id: string, input: UserInput) => {
            setSaving(true);
            setError(null);
            try {
                await apiPut<unknown>(`/api/users/${encodeURIComponent(id)}`, input, { timeout: DEFAULT_TIMEOUT });
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

    const deleteUser = useCallback(
        async (id: string) => {
            setSaving(true);
            setError(null);
            try {
                await apiDelete<unknown>(`/api/users/${encodeURIComponent(id)}`, { timeout: DEFAULT_TIMEOUT });
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
                await apiPatch<unknown>(`/api/users/${encodeURIComponent(id)}`, { status }, { timeout: DEFAULT_TIMEOUT });
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

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);

    return useMemo(
        () => ({
            users,
            total,
            page,
            setPage,
            pageSize: PAGE_SIZE,
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
            deleteUser,
            setUserStatus,
        }),
        [
            users,
            total,
            page,
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
            deleteUser,
            setUserStatus,
        ],
    );
}
