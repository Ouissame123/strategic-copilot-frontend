import { httpClient } from "../lib/http-client";
import type { ExecuteRequest, ExecuteResponse, ProposeRequest, ProposeResponse } from "../types/api.types";

export const strategistApi = {
    propose: (body: ProposeRequest) => httpClient.post<ProposeResponse>("/webhook/api/strategist/propose", body),
    execute: (body: ExecuteRequest) => httpClient.post<ExecuteResponse>("/webhook/api/strategist/execute", body),
};
