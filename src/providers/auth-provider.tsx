import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AUTH_KEY = "strategic-copilot-auth";
const USERS_KEY = "strategic-copilot-users";
const ADMIN_EMAIL_KEY = "strategic-copilot-admin-email";

function getAdminEmail(): string | null {
    const rawEnv =
        typeof import.meta !== "undefined" ? (import.meta.env?.VITE_ADMIN_EMAIL as string | undefined) : undefined;
    const fromEnv = typeof rawEnv === "string" ? rawEnv.trim().toLowerCase() : undefined;
    if (fromEnv) return fromEnv;
    try {
        const fromStorage = localStorage.getItem(ADMIN_EMAIL_KEY)?.trim().toLowerCase();
        return fromStorage || null;
    } catch {
        return null;
    }
}

function isAdminEmail(email: string): boolean {
    const admin = getAdminEmail();
    return !!admin && email.trim().toLowerCase() === admin;
}

export type UserRole = "admin" | "user";

export interface RegisteredUser {
    email: string;
    role: UserRole;
}

interface AuthUser {
    email: string;
    role: UserRole;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: AuthUser | null;
    registeredUsers: RegisteredUser[];
    login: (email: string) => boolean;
    register: (email: string) => void;
    logout: () => void;
    removeCurrentUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredAuth(): AuthUser | null {
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as AuthUser;
        if (!data?.email) return null;
        if (data.role !== "admin" && data.role !== "user") data.role = "user";
        return data;
    } catch {
        return null;
    }
}

function readRegisteredUsers(): RegisteredUser[] {
    try {
        const raw = localStorage.getItem(USERS_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw) as unknown[];
        if (!Array.isArray(arr)) return [];
        return arr.filter((u): u is RegisteredUser =>
            Boolean(u && typeof u === "object" && typeof (u as RegisteredUser).email === "string"),
        );
    } catch {
        return [];
    }
}

function writeRegisteredUsers(users: RegisteredUser[]) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setUser(readStoredAuth());
        setRegisteredUsers(readRegisteredUsers());
        setHydrated(true);
    }, []);

    useEffect(() => {
        const onPageShow = (e: PageTransitionEvent) => {
            if (e.persisted) {
                setUser(readStoredAuth());
                setRegisteredUsers(readRegisteredUsers());
            }
        };
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, []);

    const login = useCallback((email: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        const users = readRegisteredUsers();
        const found = users.find((u) => u.email.toLowerCase() === normalizedEmail);
        if (!found) return false;
        const role: UserRole = isAdminEmail(normalizedEmail) ? "admin" : found.role;
        const u: AuthUser = { email: normalizedEmail, role };
        setUser(u);
        localStorage.setItem(AUTH_KEY, JSON.stringify(u));
        return true;
    }, []);

    const register = useCallback((email: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        const users = readRegisteredUsers();
        if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
            login(normalizedEmail);
            return;
        }
        const role: UserRole = isAdminEmail(normalizedEmail) || users.length === 0 ? "admin" : "user";
        const newUsers = [...users, { email: normalizedEmail, role }];
        writeRegisteredUsers(newUsers);
        setRegisteredUsers(newUsers);
        const u: AuthUser = { email: normalizedEmail, role };
        setUser(u);
        localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    }, [login]);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(AUTH_KEY);
    }, []);

    const removeCurrentUser = useCallback(() => {
        if (!user?.email) return;
        const users = readRegisteredUsers().filter((u) => u.email.toLowerCase() !== user.email.toLowerCase());
        writeRegisteredUsers(users);
        setRegisteredUsers(users);
        setUser(null);
        localStorage.removeItem(AUTH_KEY);
    }, [user?.email]);

    const value: AuthContextType = {
        isAuthenticated: !!user?.email,
        user,
        registeredUsers,
        login,
        register,
        logout,
        removeCurrentUser,
    };

    if (!hydrated) {
        return null;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
