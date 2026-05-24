import { HELPER_CHAT_PATH, webhookPath } from "../lib/n8n-webhook-path";
import { httpClient } from "../lib/http-client";
import type { HelperChatRequest, HelperChatResponse, ValidationsRequest, ValidationsResponse } from "../types/api.types";

export const helperApi = {
    chat: (body: HelperChatRequest) => httpClient.post<HelperChatResponse>(webhookPath(HELPER_CHAT_PATH), body),
    validations: (body: ValidationsRequest = {}) =>
        httpClient.post<ValidationsResponse>("/webhook/api/helper/validations", body),
};
