import { httpClient } from "../lib/http-client";
import type { ExecuteRequest, ExecuteResponse, ProposeRequest, ProposeResponse } from "../types/api.types";

export const strategistApi = {
    propose: (body: ProposeRequest) => httpClient.post<ProposeResponse>("/webhook/api/strategist/propose", body),
    execute: (body: ExecuteRequest) => httpClient.post<ExecuteResponse>("/webhook/api/strategist/execute", body),
    /** Même route `execute` : `reject` côté n8n (enterprise_id issu du JWT côté workflow). */
    executeOption: (optionId: string, action: "execute" | "reject") =>
        httpClient.post<ExecuteResponse>("/webhook/api/strategist/execute", { option_id: optionId, action }),
};
