import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { invalidateManagerRiskQueries } from "./use-manager-risk-data";
import { isAxiosError } from "axios";
import { cascadeRiskKpiAfterAlertAction } from "@/api/project-risks.api";
import { httpClient } from "@/lib/http-client";
import { DEFAULT_PAGE_SIZE, paginationParamsRecord, parsePaginationMeta, type PaginationMeta } from "@/lib/pagination-utils";
import { notificationsApi, notificationsService, rhActionsApi } from "@/services/notifications.api";
import { useToast } from "@/providers/toast-provider";
import { queryKeys } from "@/lib/query-keys";
import type { NotificationItem, NotificationsResponse, RhActionPatchRequest, RiskAlertActionRequest } from "../types/api.types";

export type NotificationsFilters = {
    severity?: "critical" | "high" | "medium" | "low" | string;
    status?: "pending" | "sent" | "failed" | "ack" | "skipped" | string;
    time_filter?: "unread" | "last_24h" | "all" | string;
    page?: number;
    limit?: number;
};

export type ManagerNotificationsResponse = NotificationsResponse & {
    pagination?: PaginationMeta;
    counts?: {
        critical?: number;
        high?: number;
        medium?: number;
        low?: number;
        pending?: number;
        ack?: number;
        sent?: number;
    };
    buckets?: {
        today?: NotificationItem[];
        yesterday?: NotificationItem[];
        this_week?: NotificationItem[];
        older?: NotificationItem[];
    };
};

export type RiskAlertMutationVars = {
    id: string;
    body: RiskAlertActionRequest;
    projectId?: string;
};

const RISK_ALERT_ACTION_TOAST: Record<RiskAlertActionRequest["action"], string> = {
    resolve: "Alerte résolue. Le Watchdog la ré-créera si la cause root persiste.",
    ignore: "Alerte ignorée. Action tracée dans l'audit.",
    reopen: "Alerte rouverte.",
    dismiss: "Alerte ignorée. Action tracée dans l'audit.",
};

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

/** Tolère les réponses n8n enveloppées ou alias de tableau sans changer l'URL. */
function normalizeNotificationsPayload(raw: unknown, fallbackPageSize = DEFAULT_PAGE_SIZE): ManagerNotificationsResponse {
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

    const pagination = parsePaginationMeta(
        o.pagination,
        typeof (o.pagination as Record<string, unknown> | undefined)?.total === "number"
            ? Number((o.pagination as Record<string, unknown>).total)
            : total,
        fallbackPageSize,
    );

    const countsRaw = o.counts;
    const counts =
        countsRaw && typeof countsRaw === "object"
            ? {
                  critical: Number((countsRaw as Record<string, unknown>).critical) || 0,
                  high: Number((countsRaw as Record<string, unknown>).high) || 0,
                  medium: Number((countsRaw as Record<string, unknown>).medium) || 0,
                  low: Number((countsRaw as Record<string, unknown>).low) || 0,
                  pending: Number((countsRaw as Record<string, unknown>).pending) || 0,
                  ack: Number((countsRaw as Record<string, unknown>).ack) || 0,
                  sent: Number((countsRaw as Record<string, unknown>).sent) || 0,
              }
            : undefined;

    const bucketsRaw = o.buckets;
    const buckets =
        bucketsRaw && typeof bucketsRaw === "object"
            ? {
                  today: asItemList((bucketsRaw as Record<string, unknown>).today),
                  yesterday: asItemList((bucketsRaw as Record<string, unknown>).yesterday),
                  this_week: asItemList((bucketsRaw as Record<string, unknown>).this_week),
                  older: asItemList((bucketsRaw as Record<string, unknown>).older),
              }
            : undefined;

    return { items, total, pagination, counts, buckets };
}

/** Liste d'alertes manager : GET manager/notifications (paginé). */
async function fetchManagerNotificationsAlerts(params?: NotificationsFilters): Promise<ManagerNotificationsResponse> {
    const limit = params?.limit ?? DEFAULT_PAGE_SIZE;
    const query: Record<string, string> = {
        ...paginationParamsRecord({ page: params?.page ?? 1, limit }),
    };
    if (params?.severity) query.severity = params.severity;
    if (params?.status) query.status = params.status;
    if (params?.time_filter) query.time_filter = params.time_filter;

    const r = await httpClient.get<unknown>("/webhook/manager/notifications", {
        params: query,
        skipGlobalHttpErrorToast: true,
    });
    return normalizeNotificationsPayload(r.data, limit);
}

export const useNotifications = (params?: NotificationsFilters) =>
    useQuery({
        queryKey: ["manager-notifications", "notifications", params],
        queryFn: async () => {
            try {
                return await fetchManagerNotificationsAlerts(params);
            } catch (e) {
                /** 401 : session refusée par n8n ; ne pas faire échouer la cloche (liste vide, pas d'erreur bloquante). */
                if (isAxiosError(e) && e.response?.status === 401) return { items: [], total: 0 };
                throw e;
            }
        },
        staleTime: 30_000,
        placeholderData: keepPreviousData,
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
    const { push } = useToast();

    return useMutation({
        mutationFn: ({ id, body }: RiskAlertMutationVars) =>
            notificationsService.updateRiskAlert(id, { action: body.action, note: body.note }),
        onSuccess: (data, vars) => {
            const action = vars.body.action;
            const message = RISK_ALERT_ACTION_TOAST[action] ?? "Action appliquée.";
            const durationMs = action === "resolve" ? 6000 : undefined;
            push(message, "success", durationMs);

            const projectId = vars.projectId?.trim() || data?.alert?.project_id?.trim() || "";
            if (projectId && (action === "resolve" || action === "ignore" || action === "dismiss")) {
                cascadeRiskKpiAfterAlertAction(projectId);
            }
        },
        onSettled: async (_data, _err, vars) => {
            const projectId = vars.projectId?.trim();
            await Promise.all([
                qc.invalidateQueries({ queryKey: ["manager-notifications"] }),
                qc.invalidateQueries({ queryKey: ["notifications"] }),
                qc.invalidateQueries({ queryKey: ["projects"] }),
                invalidateManagerRiskQueries(qc),
            ]);
            if (projectId) {
                await qc.invalidateQueries({ queryKey: ["project-detail", projectId] });
                await qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(projectId) });
            }
        },
    });
};
