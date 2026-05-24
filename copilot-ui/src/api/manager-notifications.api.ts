import { managerRiskAlertsApi } from "./manager-risk-alerts.api";
import { httpClient } from "../lib/http-client";
import { isAxiosError, type AxiosResponse } from "axios";
import type {
    AckNotificationResponse, CopilotDecisionsResponse, DashboardResponse, NotificationsResponse, RhActionPatchRequest, RhActionPatchResponse,
    RhActionsResponse, RiskAlertActionRequest, RiskAlertActionResponse,
} from "../types/api.types";

/** Aligné sur webhookIds n8n WMN v3 (sans modifier les workflows). */
const NOTIF_LIST = "/webhook/wmn-list-notif-v3/manager/notifications";
const NOTIF_LIST_LEGACY = "/webhook/manager/notifications";
const NOTIF_ACK_BASE = "/webhook/wmn-ack-v3/manager/notifications";
const NOTIF_ACK_LEGACY = "/webhook/manager/notifications";

function isNotifListRetryable(status: number): boolean {
    return status === 404 || status >= 500;
}

function applyNotificationQueryFilters(
    items: NotificationsResponse["items"],
    params?: { severity?: string; status?: string; limit?: number },
): NotificationsResponse["items"] {
    let out = items;
    const sev = params?.severity?.trim().toLowerCase();
    if (sev) out = out.filter((n) => (n.severity ?? "").toLowerCase() === sev);
    const st = params?.status?.trim().toLowerCase();
    if (st) out = out.filter((n) => (n.status ?? "").toLowerCase() === st);
    const lim = params?.limit;
    if (typeof lim === "number" && lim > 0) out = out.slice(0, lim);
    return out;
}

function syntheticNotificationsResponse(payload: NotificationsResponse): AxiosResponse<NotificationsResponse> {
    return {
        data: payload,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as AxiosResponse<NotificationsResponse>["config"],
    };
}

export const managerNotificationsApi = {
    notifications: async (params?: { severity?: string; status?: string; limit?: number }) => {
        const cfg = { params, skipGlobalHttpErrorToast: true as const };
        try {
            return await httpClient.get<NotificationsResponse>(NOTIF_LIST, cfg);
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 404) {
                return await httpClient.get<NotificationsResponse>(NOTIF_LIST_LEGACY, cfg);
            }
            if (!isAxiosError(error) || !isNotifListRetryable(error.response?.status ?? 0)) throw error;
        }
        const dash = await httpClient.get<DashboardResponse>("/webhook/manager/dashboard", {
            params: { scope: "mine" },
            skipGlobalHttpErrorToast: true,
        });
        const raw = dash.data.widgets?.recent_notifications ?? [];
        const filtered = applyNotificationQueryFilters(raw, params);
        return syntheticNotificationsResponse({ items: filtered, total: filtered.length });
    },
    ack: async (id: string) => {
        const cfg = { skipGlobalHttpErrorToast: true as const };
        const path = `${NOTIF_ACK_BASE}/${encodeURIComponent(id)}/ack`;
        try {
            return await httpClient.patch<AckNotificationResponse>(path, {}, cfg);
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 404) {
                return await httpClient.patch<AckNotificationResponse>(
                    `${NOTIF_ACK_LEGACY}/${encodeURIComponent(id)}/ack`,
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
