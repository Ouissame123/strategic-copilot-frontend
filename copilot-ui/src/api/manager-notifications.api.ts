import { managerRiskAlertsApi } from "./manager-risk-alerts.api";
import { httpClient } from "../lib/http-client";
import { isAxiosError } from "axios";
import {
    normalizeManagerNotifCounts,
    normalizeManagerNotificationsList,
} from "@/lib/manager-notifications-normalize";
import type {
    ManagerNotifCounts,
    ManagerNotification,
    ManagerNotificationTimeFilter,
} from "@/types/manager-notifications.types";
import type {
    AckNotificationResponse,
    CopilotDecisionsResponse,
    NotificationsResponse,
    RhActionPatchRequest,
    RhActionPatchResponse,
    RhActionsResponse,
    RiskAlertActionRequest,
} from "../types/api.types";

/** WF_Manager_Notifications — chemins canoniques (100 % backend, pas de mock dashboard). */
export const MANAGER_NOTIFICATIONS_BASE = "/webhook/manager/notifications";

const NOTIF_LIST = "/webhook/wmn-list-notif-v3/manager/notifications";
const NOTIF_ACK_V3 = "/webhook/wmn-ack-v3/manager/notifications";

const silent = { skipGlobalHttpErrorToast: true as const };

export const managerNotificationsApi = {
    /** GET `/webhook/manager/notifications/counts` */
    fetchCounts: async (): Promise<ManagerNotifCounts> => {
        const { data } = await httpClient.get<unknown>(`${MANAGER_NOTIFICATIONS_BASE}/counts`, silent);
        return normalizeManagerNotifCounts(data);
    },

    /** GET `/webhook/manager/notifications?time_filter=…&severity=…&limit=…` */
    fetchList: async (params?: {
        time_filter?: ManagerNotificationTimeFilter;
        severity?: string;
        limit?: number;
    }): Promise<ManagerNotification[]> => {
        const query: Record<string, string> = {
            time_filter: params?.time_filter ?? "all",
            limit: String(params?.limit ?? 30),
        };
        if (params?.severity && params.severity !== "all") query.severity = params.severity;
        const { data } = await httpClient.get<unknown>(MANAGER_NOTIFICATIONS_BASE, { params: query, ...silent });
        return normalizeManagerNotificationsList(data);
    },

    /** PATCH `/webhook/manager/notifications/:id/ack` */
    ackOne: async (id: string): Promise<void> => {
        const path = `${MANAGER_NOTIFICATIONS_BASE}/${encodeURIComponent(id)}/ack`;
        try {
            await httpClient.patch<unknown>(path, {}, silent);
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 404) {
                await httpClient.patch<unknown>(`${NOTIF_ACK_V3}/${encodeURIComponent(id)}/ack`, {}, silent);
                return;
            }
            throw error;
        }
    },

    /** PATCH `/webhook/manager/notifications/ack-all` */
    ackAll: async (): Promise<void> => {
        try {
            await httpClient.patch<unknown>(`${MANAGER_NOTIFICATIONS_BASE}/ack-all`, {}, silent);
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 404) {
                await httpClient.patch<unknown>(`${NOTIF_ACK_V3}/ack-all`, {}, silent);
                return;
            }
            throw error;
        }
    },

    /** Legacy liste (NotificationsPage existante). */
    notifications: async (params?: { severity?: string; status?: string; limit?: number }) => {
        const cfg = { params, skipGlobalHttpErrorToast: true as const };
        try {
            return await httpClient.get<NotificationsResponse>(NOTIF_LIST, cfg);
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 404) {
                return await httpClient.get<NotificationsResponse>(MANAGER_NOTIFICATIONS_BASE, cfg);
            }
            throw error;
        }
    },

    ack: async (id: string) => {
        const cfg = { skipGlobalHttpErrorToast: true as const };
        const path = `${NOTIF_ACK_V3}/${encodeURIComponent(id)}/ack`;
        try {
            return await httpClient.patch<AckNotificationResponse>(path, {}, cfg);
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 404) {
                return await httpClient.patch<AckNotificationResponse>(
                    `${MANAGER_NOTIFICATIONS_BASE}/${encodeURIComponent(id)}/ack`,
                    {},
                    cfg,
                );
            }
            throw error;
        }
    },

    riskAction: (id: string, body: RiskAlertActionRequest) => managerRiskAlertsApi.patch(id, body),

    decisions: (params?: { project_id?: string; scope?: string; limit?: number }) =>
        httpClient.get<CopilotDecisionsResponse>("/webhook/manager/copilot-decisions", {
            params,
            skipGlobalHttpErrorToast: true,
        }),

    rhActions: (params?: { type?: string; status?: string; limit?: number }) =>
        httpClient.get<RhActionsResponse>("/webhook/manager/rh-actions", { params }),

    patchRhAction: (id: string, body: RhActionPatchRequest) =>
        httpClient.patch<RhActionPatchResponse>(`/webhook/manager/rh-actions/${id}`, body),
};
