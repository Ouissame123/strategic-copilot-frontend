import { useCallback, useEffect, useMemo, useState } from "react";
import {
    createRhUser,
    listRhUsers,
    patchRhUserPasswordReset,
    patchRhUserRole,
    patchRhUserStatus,
    type RhCreateUserBody,
} from "@/api/rhService";
import { ApiError } from "@/utils/apiClient";

export type UserRole = "rh" | "manager" | "talent";
export type UserStatus = "pending" | "active" | "disabled" | "expired";

/** Rôles autorisés pour POST /rh/users (contrat API : pas de création RH via cette route). */
export type CreateUserRole = "manager" | "talent";

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    enterpriseId?: string;
    enterpriseName?: string;
    onlineStatus?: "online" | "offline" | "unknown";
    lastActivityAt?: string;
    expiresAt?: string;
    invitationPending?: boolean;
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

export interface CreateUserInput extends Omit<UserInput, "role"> {
    role: CreateUserRole;
    initialPassword: string;
    mustChangePassword?: boolean;
    passwordValidityMonths?: number;
}

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_PAGE_SIZE = 10;

export type UseUsersOptions = {
    /** Defaults to 10. Use a larger value for RH directory views. */
    pageSize?: number;
};

const normalizeRole = (v: unknown): UserRole => {
    const s = String(v ?? "").toLowerCase();
    if (s === "rh") return "rh";
    if (s === "hr") return "rh";
    if (s === "manager") return "manager";
    if (s === "talent") return "talent";
    throw new ApiError("Role utilisateur manquant ou invalide.");
};

const normalizeStatus = (v: unknown): UserStatus => {
    const s = String(v ?? "").toLowerCase();
    if (s === "pending") return "pending";
    if (s === "disabled" || s === "inactive") return "disabled";
    if (s === "active") return "active";
    if (s === "expired") return "expired";
    throw new ApiError("Status utilisateur manquant ou invalide.");
};

const mapUser = (raw: unknown): User | null => {
    const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    if (r.id == null || r.email == null) return null;
    const full = String(r.fullName ?? r.full_name ?? "").trim();
    const parts = full ? full.split(/\s+/) : [];
    const roleCandidate = r.role ?? r.claims_role ?? r.scope_role ?? r.user_role ?? r.account_role;
    const statusCandidate = r.status ?? r.account_status ?? r.user_status;
    const onlineCandidate = r.online ?? r.is_online ?? r.connection_status ?? r.session_state;
    const onlineStr = String(onlineCandidate ?? "").toLowerCase();
    const onlineStatus: User["onlineStatus"] =
        onlineStr === "online" || onlineStr === "true" || onlineStr === "1" || onlineCandidate === true
            ? "online"
            : onlineStr === "offline" || onlineStr === "false" || onlineStr === "0" || onlineCandidate === false
              ? "offline"
              : "unknown";
    return {
        id: String(r.id),
        firstName: String(r.firstName ?? r.first_name ?? (parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "")),
        lastName: String(r.lastName ?? r.last_name ?? (parts.length > 1 ? parts[parts.length - 1]! : "")),
        email: String(r.email),
        role: normalizeRole(roleCandidate),
        status: normalizeStatus(statusCandidate),
        enterpriseId:
            r.enterprise_id != null
                ? String(r.enterprise_id)
                : r.enterpriseId != null
                  ? String(r.enterpriseId)
                  : undefined,
        enterpriseName:
            r.enterprise_name != null
                ? String(r.enterprise_name)
                : r.enterpriseName != null
                  ? String(r.enterpriseName)
                  : r.company_name != null
                    ? String(r.company_name)
                    : undefined,
        onlineStatus,
        lastActivityAt:
            r.last_seen_at != null
                ? String(r.last_seen_at)
                : r.last_activity_at != null
                  ? String(r.last_activity_at)
                  : r.lastSeenAt != null
                    ? String(r.lastSeenAt)
                    : undefined,
        expiresAt:
            r.expires_at != null
                ? String(r.expires_at)
                : r.expiration_date != null
                  ? String(r.expiration_date)
                  : r.account_expires_at != null
                    ? String(r.account_expires_at)
                    : undefined,
        invitationPending:
            typeof r.invitation_pending === "boolean"
                ? r.invitation_pending
                : typeof r.invitationPending === "boolean"
                  ? r.invitationPending
                  : undefined,
        createdAt: r.createdAt != null ? String(r.createdAt) : r.created_at != null ? String(r.created_at) : undefined,
        updatedAt: r.updatedAt != null ? String(r.updatedAt) : r.updated_at != null ? String(r.updated_at) : undefined,
    };
};

/** Corps attendu par le backend (POST /rh/users). */
function buildCreateUserBody(input: CreateUserInput): RhCreateUserBody {
    const fullName = `${input.firstName} ${input.lastName}`.trim() || input.email.trim();
    return {
        fullName,
        email: input.email.trim(),
        role: input.role,
        password: input.initialPassword,
        mustChangePassword: input.mustChangePassword ?? true,
    };
}

/** PATCH /rh/users/status : uniquement active | disabled (pending → active). */
function statusForApiPatch(status: UserStatus): "active" | "disabled" {
    return status === "disabled" ? "disabled" : "active";
}

/** PATCH /rh/users/role : uniquement manager | talent ; RH ne passe pas par ce PATCH. */
function roleForApiPatch(role: UserRole): "manager" | "talent" | null {
    if (role === "manager" || role === "talent") return role;
    return null;
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
    if (Array.isArray(o.results)) return o.results;
    return [];
};

const extractTotal = (payload: unknown, fallback: number): number => {
    if (!payload || typeof payload !== "object") return fallback;
    const o = payload as Record<string, unknown>;
    const t =
        o.total ??
        o.totalCount ??
        o.count ??
        (o.meta && typeof o.meta === "object" ? (o.meta as Record<string, unknown>).total : undefined);
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
                const payload = await listRhUsers(
                    {
                        page,
                        pageSize,
                        search: debouncedSearch || undefined,
                        role: roleFilter !== "all" ? roleFilter : undefined,
                        status: statusFilter !== "all" ? statusFilter : undefined,
                    },
                    { timeout: DEFAULT_TIMEOUT, signal },
                );
                const list = extractList(payload).map(mapUser).filter((u): u is User => u != null);
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
                await createRhUser(buildCreateUserBody(input), { timeout: DEFAULT_TIMEOUT });
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
                await patchRhUserPasswordReset(
                    id,
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

    /** Mise à jour : PATCH rôle (query `id`) puis statut — body sans `id`. */
    const updateUser = useCallback(
        async (id: string, input: UserInput) => {
            setSaving(true);
            setError(null);
            try {
                const rolePatch = roleForApiPatch(input.role);
                if (rolePatch) {
                    await patchRhUserRole(id, { role: rolePatch }, { timeout: DEFAULT_TIMEOUT });
                }
                await patchRhUserStatus(id, { status: statusForApiPatch(input.status) }, { timeout: DEFAULT_TIMEOUT });
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
                await patchRhUserStatus(id, { status: statusForApiPatch(status) }, { timeout: DEFAULT_TIMEOUT });
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
