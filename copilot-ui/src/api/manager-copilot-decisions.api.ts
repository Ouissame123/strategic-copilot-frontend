import { isAxiosError } from "axios";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";

export type CopilotDecisionAction = "apply" | "dismiss" | "ignore" | "reopen";

export type PatchCopilotDecisionResponse = {
    status: "success";
    operation: "patch_copilot_decision";
    action: CopilotDecisionAction;
    decision: {
        id: string;
        status: string;
        handled_at: string;
        handled_by: string;
        project_id: string;
    };
};

const COPILOT_DECISIONS_PATH = "/webhook/manager/copilot-decisions";

export function getCopilotDecisionErrorCode(err: unknown): string | undefined {
    if (!isAxiosError(err)) return undefined;
    const data = err.response?.data;
    if (data && typeof data === "object") {
        const o = data as Record<string, unknown>;
        const code = o.error ?? o.code;
        if (code != null) return String(code).trim().toUpperCase();
    }
    return undefined;
}

const silent: HttpClientRequestConfig = { skipGlobalHttpErrorToast: true };

export const managerCopilotDecisionsApi = {
    patch: (decisionId: string, body: { action: CopilotDecisionAction; note?: string }) =>
        httpClient.patch<PatchCopilotDecisionResponse>(
            `${COPILOT_DECISIONS_PATH}/${encodeURIComponent(decisionId)}`,
            body,
            silent,
        ),
};
