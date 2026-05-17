import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateManagerRiskQueries } from "./use-manager-risk-data";
import { isAxiosError } from "axios";
import { managerNotificationsApi } from "../api/manager-notifications.api";
import { alertsApi, notificationsApi, rhActionsApi } from "@/services/notifications.api";
import type { NotificationItem, NotificationsResponse, RhActionPatchRequest, RiskAlertActionRequest } from "../types/api.types";

/** Tolère les réponses n8n enveloppées ou alias de tableau sans changer l’URL. */
function normalizeNotificationsPayload(raw: unknown): NotificationsResponse {
    if (raw == null || typeof raw !== "object") return { items: [], total: 0 };
    const o = raw as Record<string, unknown>;
    const asItemList = (x: unknown): NotificationItem[] => {
        if (!Array.isArray(x)) return [];
        const out: NotificationItem[] = [];
        for (const row of x) {
            if (!row || typeof row !== "object") continue;
            const r = row as Record<string, unknown>;
            const id = r.id != null ? String(r.id) : "";
            if (!id) continue;
            const riskScoreRaw = r.risk_score;
            const ageHoursRaw = r.age_hours;
            out.push({
                id,
                severity: String(r.severity ?? ""),
                status: String(r.status ?? ""),
                title: String(r.title ?? ""),
                message: String(r.message ?? ""),
                created_at: String(r.created_at ?? r.createdAt ?? ""),
                project_name: r.project_name != null ? String(r.project_name) : undefined,
                risk_type: r.risk_type != null ? String(r.risk_type) : undefined,
                risk_score: typeof riskScoreRaw === "number" && Number.isFinite(riskScoreRaw) ? riskScoreRaw : undefined,
                age_hours: typeof ageHoursRaw === "number" && Number.isFinite(ageHoursRaw) ? ageHoursRaw : undefined,
            });
        }
        return out;
    };
    let items = asItemList(o.items);
    if (!items.length && o.data && typeof o.data === "object") {
        const d = o.data as Record<string, unknown>;
        const nested = asItemList(d.items);
        items = nested.length ? nested : asItemList(d.notifications);
    }
    if (!items.length) items = asItemList(o.notifications);
    const total = typeof o.total === "number" && !Number.isNaN(o.total) ? o.total : items.length;
    return { items, total };
}

export const useNotifications = (params?: { severity?: string; status?: string; limit?: number }) =>
    useQuery({
        queryKey: ["notifications", params],
        queryFn: async () => {
            try {
                const r = await managerNotificationsApi.notifications(params);
                return normalizeNotificationsPayload(r.data);
            } catch (e) {
                /** 401 : session refusée par n8n ; ne pas faire échouer la cloche (liste vide, pas d’erreur bloquante). */
                if (isAxiosError(e) && e.response?.status === 401) return { items: [], total: 0 };
                throw e;
            }
        },
        staleTime: 60_000,
        retry: (failureCount, error) => {
            if (isAxiosError(error) && error.response?.status === 401) return false;
            return failureCount < 1;
        },
    });

export const useNotificationsList = (filters?: { severity?: string; status?: string }) =>
    useQuery({
        queryKey: ["notifications", filters],
        queryFn: async () => {
            try {
                const r = await notificationsApi.list({ ...filters, limit: 100 });
                return normalizeNotificationsPayload(r.data);
            } catch (e) {
                if (isAxiosError(e) && e.response?.status === 401) return { items: [], total: 0 };
                throw e;
            }
        },
        staleTime: 30_000,
        retry: (failureCount, error) => {
            if (isAxiosError(error) && error.response?.status === 401) return false;
            return failureCount < 1;
        },
    });

export const useAckNotification = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => notificationsApi.ack(id),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["notifications"] });
            void qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
    });
};

export const usePatchAlert = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, action, note }: { id: string; action: "resolve" | "dismiss"; note?: string }) =>
            alertsApi.patch(id, { action, note }).then((r) => r.data),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["notifications"] });
            void qc.invalidateQueries({ queryKey: ["dashboard"] });
            void qc.invalidateQueries({ queryKey: ["risks"] });
            void qc.invalidateQueries({ queryKey: ["manager", "project-risks"] });
        },
    });
};

export const useDecisionLog = (params?: { project_id?: string; scope?: string; limit?: number; enabled?: boolean }) => {
    const enabled = params?.enabled ?? true;
    const { enabled: _omit, ...rest } = params ?? {};
    return useQuery({
        queryKey: ["decision-log", rest],
        queryFn: () => managerNotificationsApi.decisions(rest).then((r) => r.data),
        enabled,
    });
};

export const useRhActions = (filters?: { status?: string; priority?: string; type?: string; limit?: number }) =>
    useQuery({
        queryKey: ["rh-actions", filters],
        queryFn: () => rhActionsApi.list(filters).then((r) => r.data),
        staleTime: 30_000,
    });

export const usePatchRhAction = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: RhActionPatchRequest }) => rhActionsApi.patch(id, body).then((r) => r.data),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["rh-actions"] });
            void qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
    });
};

export const useRiskAlertAction = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: RiskAlertActionRequest }) => managerNotificationsApi.riskAction(id, body),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["notifications"] });
            await qc.invalidateQueries({ queryKey: ["projects"] });
            await invalidateManagerRiskQueries(qc);
        },
    });
};
