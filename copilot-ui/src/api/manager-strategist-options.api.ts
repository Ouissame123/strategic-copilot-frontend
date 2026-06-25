import { isAxiosError } from "axios";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";

export type StrategistAction = "execute" | "reject";

export type StrategistOptionType = "delay" | "reallocation" | "reinforce" | "stop_scope";

export type StrategistExecuteResponse = {
    status: "success";
    workflow: "WF_Strategist";
    endpoint?: string;
    action: StrategistAction;
    option_id: string;
    option_type: StrategistOptionType;
    project_id: string;
    analysis_run_id?: string;
    decision_executed: {
        action: string;
        impact: {
            delay_days: number;
            dropped_requirements_count: number;
            project_paused: boolean;
        };
        summary: string;
        business_effect: string;
        status: "executed" | "rejected" | "logged_only";
    };
    effect: "applied_delay" | "logged_only" | "rejected" | string;
    effect_payload?: Record<string, unknown> | null;
    db_result: {
        project_updated: { id: string; milestone_at: string | null } | null;
        rh_action_id: string | null;
        rh_action_type: string | null;
        copilot_decision_id: string | null;
        notification_id: string | null;
    };
    ui?: { badges: Array<{ label: string; tone: string }>; highlights: string[] };
};

const EXECUTE_PATH = "/webhook/api/strategist/execute";
const silent: HttpClientRequestConfig = { skipGlobalHttpErrorToast: true };

export function getStrategistExecuteErrorCode(err: unknown): string | undefined {
    if (!isAxiosError(err)) return undefined;
    const data = err.response?.data;
    if (data && typeof data === "object") {
        const o = data as Record<string, unknown>;
        const code = o.code ?? o.error;
        if (code != null) return String(code).trim().toUpperCase();
    }
    return undefined;
}

export const managerStrategistApi = {
    execute: (optionId: string, action: StrategistAction = "execute") =>
        httpClient.post<StrategistExecuteResponse>(
            EXECUTE_PATH,
            {
                option_id: optionId.trim(),
                action,
            },
            silent,
        ),
};
