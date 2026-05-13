import { httpClient } from "../lib/http-client";
import { isAxiosError, type AxiosResponse } from "axios";
import type {
    AckNotificationResponse, CopilotDecisionsResponse, DashboardResponse, NotificationsResponse, RhActionPatchRequest, RhActionPatchResponse,
    RhActionsResponse, RiskAlertActionRequest, RiskAlertActionResponse,
} from "../types/api.types";

const NOTIF_LIST = "/webhook/manager/notifications";

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
    ack: (id: string) => httpClient.patch<AckNotificationResponse>(`/webhook/manager/notifications/${id}/ack`, {}),
    riskAction: (id: string, body: RiskAlertActionRequest) =>
        httpClient.patch<RiskAlertActionResponse>(`/webhook/manager/risk-alerts/${id}`, body),
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
