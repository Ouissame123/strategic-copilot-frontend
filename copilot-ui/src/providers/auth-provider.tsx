import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setOnAuthFailure } from "@/api/api";
import {
    login as authLogin,
    logout as authLogout,
    me as authMe,
    persistTokensFromPayload,
    refresh as authRefresh,
} from "@/api/authService";
import { ApiError, setApiAuthToken } from "@/utils/apiClient";
import { getStoredRefreshToken, setStoredRefreshToken } from "@/utils/session-tokens";
import type { AuthUser, Permission, Role, UserStatus } from "@/types/auth";

const PERMISSIONS_BY_ROLE: Record<Role, Permission[]> = {
    rh: [
        "view_global_dashboard",
        "view_all_users",
        "assign_roles",
        "change_user_role",
        "disable_user",
        "view_all_sessions",
        "revoke_session",
        "view_system_activity",
    ],
    manager: ["view_manager_dashboard", "view_scope_data", "manage_scope_actions"],
    talent: ["view_own_dashboard", "view_own_profile", "update_own_profile", "view_own_assignments"],
};

function mapRawToAuthUser(raw: unknown): AuthUser | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const id = String(r.id ?? r.user_id ?? "");
    const email = String(r.email ?? "");
    if (!id && !email) return null;
    const fullName = String(r.fullName ?? r.full_name ?? r.name ?? "").trim();
    const roleStr = String(r.role ?? "").toLowerCase();
    let role: AuthUser["role"] = null;
    if (roleStr === "rh" || roleStr === "hr") role = "rh";
    else if (roleStr === "manager") role = "manager";
    else if (roleStr === "talent") role = "talent";
    const statusStr = String(r.status ?? "active").toLowerCase();
    let status: UserStatus = "active";
    if (statusStr === "pending") status = "pending";
    else if (statusStr === "disabled" || statusStr === "inactive") status = "disabled";
    const mustChangePassword =
        typeof r.mustChangePassword === "boolean"
            ? r.mustChangePassword
            : r.must_change_password === true
              ? true
              : undefined;
    const passwordExpiresAt =
        r.passwordExpiresAt != null
            ? String(r.passwordExpiresAt)
            : r.password_expires_at != null
              ? String(r.password_expires_at)
              : undefined;
    return {
        id: id || email,
        fullName,
        email,
        role,
        status,
        mustChangePassword,
        passwordExpiresAt: passwordExpiresAt ?? null,
    };
}

function unwrapData(payload: unknown): unknown {
    if (!payload || typeof payload !== "object") return payload;
    const o = payload as Record<string, unknown>;
    if (o.data !== undefined && typeof o.data === "object") return o.data;
    return payload;
}

function pickUserFromAuthPayload(payload: unknown): AuthUser | null {
    const raw = unwrapData(payload);
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    if (o.user) return mapRawToAuthUser(o.user);
    return mapRawToAuthUser(raw);
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: AuthUser | null;
    isPendingApproval: boolean;
    isDisabled: boolean;
    mustChangePassword: boolean;
    permissions: Permission[];
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    syncSession: () => Promise<void>;
    refreshSession: () => Promise<void>;
    hasRole: (...roles: Role[]) => boolean;
    hasPermission: (...permissions: Permission[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearSessionState(setUser: (value: AuthUser | null) => void) {
    setApiAuthToken(null);
    setStoredRefreshToken(null);
    setUser(null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setOnAuthFailure(() => {
            setApiAuthToken(null);
            setStoredRefreshToken(null);
            setUser(null);
        });
        return () => setOnAuthFailure(null);
    }, []);

    const syncSession = useCallback(async () => {
        try {
            const payload = await authMe();
            const u = pickUserFromAuthPayload(payload);
            if (u) setUser(u);
            else clearSessionState(setUser);
        } catch {
            clearSessionState(setUser);
        }
    }, []);

    const refreshSession = useCallback(async () => {
        const rt = getStoredRefreshToken();
        if (!rt) {
            clearSessionState(setUser);
            return;
        }
        try {
            const payload = await authRefresh();
            persistTokensFromPayload(payload);
            await syncSession();
        } catch {
            clearSessionState(setUser);
        }
    }, [syncSession]);

    useEffect(() => {
        void (async () => {
            try {
                const rt = getStoredRefreshToken();
                if (rt) {
                    const payload = await authRefresh();
                    persistTokensFromPayload(payload);
                }
                await syncSession();
            } catch {
                clearSessionState(setUser);
            } finally {
                setHydrated(true);
            }
        })();
    }, [syncSession]);

    const login = useCallback(async (email: string, password: string) => {
        const payload = await authLogin({
            email: email.trim(),
            password,
        });
        if (!persistTokensFromPayload(payload)) {
            throw new Error("Réponse de connexion invalide (accessToken manquant).");
        }
        const u = pickUserFromAuthPayload(payload);
        if (!u) {
            throw new Error("Réponse de connexion invalide (utilisateur manquant).");
        }
        setUser(u);
    }, []);

    const logout = useCallback(async () => {
        try {
            await authLogout();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                // Session déjà invalide côté serveur.
            }
        } finally {
            clearSessionState(setUser);
        }
    }, []);

    const permissions = useMemo<Permission[]>(() => {
        if (!user?.role || user.status !== "active") return [];
        return PERMISSIONS_BY_ROLE[user.role];
    }, [user?.role, user?.status]);

    const hasRole = useCallback(
        (...roles: Role[]) => {
            if (!user?.role) return false;
            return roles.includes(user.role);
        },
        [user?.role],
    );

    const hasPermission = useCallback(
        (...required: Permission[]) => {
            if (!required.length) return true;
            return required.every((p) => permissions.includes(p));
        },
        [permissions],
    );

    const mustChangePassword = !!user?.mustChangePassword && user.status === "active";

    const value: AuthContextType = {
        isAuthenticated: !!user,
        user,
        isPendingApproval: user?.status === "pending",
        isDisabled: user?.status === "disabled",
        mustChangePassword,
        permissions,
        login,
        logout,
        syncSession,
        refreshSession,
        hasRole,
        hasPermission,
    };

    if (!hydrated) return null;
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
