import { useCallback, useEffect, useMemo, useState } from "react";
import { listRhSessions } from "@/api/rhService";
import { ApiError } from "@/utils/apiClient";
import type { SessionStatus } from "@/types/auth";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export type UseRhSessionsOptions = {
    page?: number;
    pageSize?: number;
};

export interface RhSessionRow {
    id: string;
    userName: string;
    email: string;
    role: string;
    loginAt: string;
    lastActivityAt: string;
    expiresAt: string;
    status: SessionStatus;
}

function mapSession(raw: unknown, index: number): RhSessionRow {
    const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return {
        id: String(r.id ?? `s-${index}`),
        userName: String(
            r.userFullName ?? r.user_full_name ?? r.user_name ?? r.userName ?? r.full_name ?? "",
        ),
        email: String(r.email ?? ""),
        role: String(r.role ?? ""),
        loginAt: String(r.login_at ?? r.loginAt ?? ""),
        lastActivityAt: String(r.last_activity_at ?? r.lastActivityAt ?? ""),
        expiresAt: String(r.expires_at ?? r.expiresAt ?? ""),
        status: String(r.status ?? "active") as SessionStatus,
    };
}

function extractSessions(response: unknown): unknown[] {
    if (Array.isArray(response)) return response;
    if (!response || typeof response !== "object") return [];
    const o = response as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items;
    if (Array.isArray(o.sessions)) return o.sessions;
    if (Array.isArray(o.data)) return o.data;
    return [];
}

export function useRhSessions(options?: UseRhSessionsOptions) {
    const page = options?.page ?? DEFAULT_PAGE;
    const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
    const [items, setItems] = useState<RhSessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await listRhSessions(page, pageSize);
            const list = extractSessions(response).map(mapSession);
            setItems(list);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Erreur de chargement des sessions");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return useMemo(() => ({ items, loading, error, refresh }), [items, loading, error, refresh]);
}
