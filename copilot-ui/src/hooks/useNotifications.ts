import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateManagerRiskQueries } from "./use-manager-risk-data";
import { isAxiosError } from "axios";
import { managerNotificationsApi } from "../api/manager-notifications.api";
import { notificationsApi, notificationsService, rhActionsApi } from "@/services/notifications.api";
import type { NotificationItem, NotificationsResponse, RhActionPatchRequest, RiskAlertActionRequest } from "../types/api.types";

function readPayloadField(payload: unknown, ...keys: string[]): string | undefined {
    if (payload == null) return undefined;
    let p: Record<string, unknown> | undefined;
    if (typeof payload === "string") {
        try {
            const parsed = JSON.parse(payload) as unknown;
            if (parsed && typeof parsed === "object") p = parsed as Record<string, unknown>;
        } catch {
            return undefined;
        }
    } else if (typeof payload === "object") {
        p = payload as Record<string, unknown>;
    }
    if (!p) return undefined;
    for (const key of keys) {
        const v = p[key];
        if (v != null && String(v).trim()) return String(v).trim();
    }
    return undefined;
}

/** Tolère les réponses n8n enveloppées ou alias de tableau sans changer l’URL. */
function normalizeNotificationsPayload(raw: unknown): NotificationsResponse {
    if (raw == null || typeof raw !== "object") return { items: [], total: 0 };
    const root = raw as Record<string, unknown>;
    const o =
        root.status === "success" && Array.isArray(root.notifications)
            ? root
            : root.data && typeof root.data === "object"
              ? (root.data as Record<string, unknown>)
              : root;
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
            const ageSecondsRaw = r.age_seconds;
            const payloadRiskId = readPayloadField(r.payload, "risk_alert_id", "riskAlertId", "alert_id", "alertId");
            const riskAlertIdRaw =
                r.risk_alert_id ??
                r.riskAlertId ??
                r.alert_id ??
                r.alertId ??
                payloadRiskId ??
                (r.risk_alert && typeof r.risk_alert === "object"
                    ? (r.risk_alert as Record<string, unknown>).id
                    : undefined);
            const projectIdRaw = r.project_id ?? r.projectId;
            const talentIdRaw = r.talent_id ?? r.talentId;
            const riskAlertId = riskAlertIdRaw != null ? String(riskAlertIdRaw).trim() || undefined : undefined;
            out.push({
                id,
                risk_alert_id: riskAlertId,
                alert_id: riskAlertId,
                severity: String(r.severity ?? ""),
                status: String(r.status ?? ""),
                title: String(r.title ?? ""),
                message: String(r.message ?? ""),
                created_at: String(r.created_at ?? r.createdAt ?? ""),
                project_id: projectIdRaw != null ? String(projectIdRaw).trim() || undefined : undefined,
                talent_id: talentIdRaw != null ? String(talentIdRaw).trim() || undefined : undefined,
                project_name: r.project_name != null ? String(r.project_name) : undefined,
                talent_name:
                    r.talent_name != null
                        ? String(r.talent_name)
                        : r.talent && typeof r.talent === "object"
                          ? String((r.talent as Record<string, unknown>).name ?? "").trim() || undefined
                          : undefined,
                risk_type: r.risk_type != null ? String(r.risk_type) : undefined,
                risk_score: typeof riskScoreRaw === "number" && Number.isFinite(riskScoreRaw) ? riskScoreRaw : undefined,
                age_hours:
                    typeof ageHoursRaw === "number" && Number.isFinite(ageHoursRaw)
                        ? ageHoursRaw
                        : typeof ageSecondsRaw === "number" && Number.isFinite(ageSecondsRaw)
                          ? Math.max(0, Math.round(ageSecondsRaw / 3600))
                          : undefined,
            });
        }
        return out;
    };
    let items = asItemList(o.items);
    if (!items.length) items = asItemList(o.notifications);
    if (!items.length && root.data && typeof root.data === "object") {
        const d = root.data as Record<string, unknown>;
        const nested = asItemList(d.items);
        items = nested.length ? nested : asItemList(d.notifications);
    }
    const total =
        typeof o.count === "number" && !Number.isNaN(o.count)
            ? o.count
            : typeof o.total === "number" && !Number.isNaN(o.total)
              ? o.total
              : items.length;
    return { items, total };
}

/** Liste d’alertes manager : GET manager/notifications uniquement. */
async function fetchManagerNotificationsAlerts(params?: {
    severity?: string;
    status?: string;
    limit?: number;
}): Promise<NotificationsResponse> {
    const r = await managerNotificationsApi.notifications(params);
    return normalizeNotificationsPayload(r.data);
}

export const useNotifications = (params?: { severity?: string; status?: string; limit?: number }) =>
    useQuery({
        queryKey: ["manager-notifications", "notifications", params],
        queryFn: async () => {
            try {
                return await fetchManagerNotificationsAlerts(params);
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
        mutationFn: ({ id, action }: { id: string; action: RiskAlertActionRequest["action"]; note?: string }) =>
            notificationsService.updateRiskAlert(id, { action, note }),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["manager-notifications"] });
            await qc.invalidateQueries({ queryKey: ["notifications"] });
            await qc.invalidateQueries({ queryKey: ["dashboard"] });
            await invalidateManagerRiskQueries(qc);
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
        staleTime: 120_000,
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
        mutationFn: ({ id, body }: { id: string; body: RiskAlertActionRequest }) =>
            notificationsService.updateRiskAlert(id, { action: body.action, note: body.note }),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["manager-notifications"] });
            await qc.invalidateQueries({ queryKey: ["notifications"] });
            await qc.invalidateQueries({ queryKey: ["projects"] });
            await invalidateManagerRiskQueries(qc);
        },
    });
};
