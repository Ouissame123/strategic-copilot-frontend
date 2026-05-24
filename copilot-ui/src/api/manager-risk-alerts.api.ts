import { httpClient } from "@/lib/http-client";
import type { RiskAlertActionRequest, RiskAlertActionResponse } from "@/types/api.types";

/** WMN Alert v3 — PATCH resolve | ignore | reopen sur `public.risk_alerts.id`. */
export const MANAGER_RISK_ALERTS_PATH = "/webhook/wmn-alert-v3/manager/risk-alerts";

export type ManagerRiskAlertPatchAction = RiskAlertActionRequest["action"];

export function buildRiskAlertPatchPath(alertId: string): string {
    return `${MANAGER_RISK_ALERTS_PATH}/${encodeURIComponent(alertId)}`;
}

export function patchManagerRiskAlert(id: string, action: ManagerRiskAlertPatchAction, note?: string) {
    const body: RiskAlertActionRequest = note ? { action, note } : { action };
    return httpClient.patch<RiskAlertActionResponse>(buildRiskAlertPatchPath(id), body, { skipGlobalHttpErrorToast: true });
}

/** @deprecated Préférer `patchManagerRiskAlert`. */
export const managerRiskAlertsApi = {
    patch: (id: string, body: RiskAlertActionRequest) => patchManagerRiskAlert(id, body.action, body.note),
};
