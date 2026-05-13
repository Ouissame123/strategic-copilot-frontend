import { managerNotificationsApi } from "@/api/manager-notifications.api";
import { httpClient } from "@/lib/http-client";

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
    project_id: string;
    project_name: string;
    risk_type: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    risk_score: number;
    status: "open" | "resolved" | "ignored";
    detected_at: string;
}

export interface RhAction {
    id: string;
    project_id: string | null;
    project_name?: string;
    type: "skill_gap" | "reallocation" | "training" | "overload" | "recruitment";
    message: string;
    priority: "low" | "normal" | "urgent";
    status: "pending" | "accepted" | "rejected" | "in_progress" | "done" | "cancelled";
    response_message: string | null;
    created_at: string;
}

export const notificationsApi = {
    list: (params?: { severity?: string; status?: string; limit?: number }) => managerNotificationsApi.notifications(params),
    ack: (id: string) => managerNotificationsApi.ack(id),
};

export const alertsApi = {
    patch: (id: string, body: { action: "resolve" | "dismiss"; note?: string }) =>
        httpClient.patch(`/webhook/manager/risk-alerts/${id}`, body),
};

export const rhActionsApi = {
    list: (params?: { status?: string; priority?: string; type?: string; limit?: number }) =>
        httpClient.get("/webhook/manager/rh-actions", { params }),
    patch: (id: string, body: { action: "accept" | "reject" | "progress" | "done" | "cancel"; response_message?: string }) =>
        httpClient.patch(`/webhook/manager/rh-actions/${id}`, body),
};
