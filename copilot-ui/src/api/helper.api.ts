import { httpClient } from "../lib/http-client";
import type { HelperChatRequest, HelperChatResponse, ValidationsRequest, ValidationsResponse } from "../types/api.types";

export const helperApi = {
    chat: (body: HelperChatRequest) => httpClient.post<HelperChatResponse>("/webhook/api/helper/chat", body),
    validations: (body: ValidationsRequest = {}) =>
        httpClient.post<ValidationsResponse>("/webhook/api/helper/validations", body),
};
