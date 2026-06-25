import { isAxiosError } from "axios";import { isAxiosError } from "axios";
import { FEATURES } from "@/lib/feature-flags";
import { HELPER_CHAT_V2_PATH, webhookPath } from "@/lib/n8n-webhook-path";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";
import type { HelperChatV3Request, HelperChatV3Response } from "@/api/helper-chat-v3.types";

export const HELPER_CHAT_V3_PATH = "/api/helper/chat-v3";

const silent: HttpClientRequestConfig = { skipGlobalHttpErrorToast: true };

function resolveHelperChatPath(): string {
    if (FEATURES.USE_HELPER_V3) {
        return webhookPath(HELPER_CHAT_V3_PATH);
    }
    return webhookPath(HELPER_CHAT_V2_PATH);
}

export function getHelperChatV3ErrorMessage(err: unknown): string {
    if (isAxiosError(err)) {
        const data = err.response?.data;
        if (data && typeof data === "object") {
            const message = (data as { message?: unknown }).message;
            if (typeof message === "string" && message.trim()) return message.trim();
        }
        return err.message;
    }
    return err instanceof Error ? err.message : "Erreur inconnue";
}

/** POST helper chat — v3 si `VITE_USE_HELPER_V3=true`, sinon fallback v2. */
export async function sendHelperMessageV3(req: HelperChatV3Request): Promise<HelperChatV3Response> {
    const body: HelperChatV3Request = {
        message: req.message.trim(),
    };
    const projectId = req.project_id?.trim();
    if (projectId) body.project_id = projectId;
    const conversationId = req.conversation_id?.trim();
    if (conversationId) body.conversation_id = conversationId;

    const { data } = await httpClient.post<HelperChatV3Response>(resolveHelperChatPath(), body, silent);
    return data;
}
