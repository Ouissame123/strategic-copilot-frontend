import {
    buildRiskAlertPatchPath,
    MANAGER_RISK_ALERTS_PATH,
    managerRiskAlertsApi,
    patchManagerRiskAlert,
    type ManagerRiskAlertPatchAction,
} from "@/api/manager-risk-alerts.api";
import { managerNotificationsApi } from "@/api/manager-notifications.api";
import { httpClient } from "@/lib/http-client";

export { buildRiskAlertPatchPath, MANAGER_RISK_ALERTS_PATH, type ManagerRiskAlertPatchAction };

export interface Notification {
    id: string;
    project_id: string | null;
    project_name?: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    message: string;
    status: "pending" | "sent" | "failed" | "ack" | "skipped";
    created_at: string;
}

export interface RiskAlert {
    id: string;
    project_id?: string;
    project_name?: string;
    risk_type?: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    risk_score?: number;
    status: "open" | "resolved" | "ignored";
    detected_at?: string;
    risk_alert_id?: string;
}

export const notificationsApi = {
    list: (params?: { severity?: string; status?: string; limit?: number }) => managerNotificationsApi.notifications(params),
    ack: (id: string) => managerNotificationsApi.ack(id),
};

export const alertsApi = {
    patch: (id: string, body: { action: ManagerRiskAlertPatchAction; note?: string }) => managerRiskAlertsApi.patch(id, body),
};

/** PATCH `/webhook/wmn-alert-v3/manager/risk-alerts/:id` — body `{ action: "resolve" | "ignore" | "reopen" }`. */
export async function patchRiskAlert(alertId: string, action: ManagerRiskAlertPatchAction, note?: string) {
    if (import.meta.env.DEV) {
        console.log("PATCH alert", alertId, action);
    }
    const response = await patchManagerRiskAlert(alertId, action, note);
    return response.data;
}

export const notificationsService = {
    patchAlert: (alertId: string, action: ManagerRiskAlertPatchAction) => patchRiskAlert(alertId, action),
    /** Alias historique */
    updateRiskAlert: (alertId: string, payload: { action: ManagerRiskAlertPatchAction; note?: string }) =>
        patchRiskAlert(alertId, payload.action, payload.note),
};

export const rhActionsApi = {
    list: (params?: { status?: string; priority?: string; type?: string; limit?: number }) =>
        httpClient.get("/webhook/manager/rh-actions", { params }),
    patch: (id: string, body: { action: "accept" | "reject" | "progress" | "done" | "cancel"; response_message?: string }) =>
        httpClient.patch(`/webhook/manager/rh-actions/${id}`, body),
};
