/**
 * WF_RH_Conversations + WF_RH_Helper_Chat_v2 — client HTTP (Authorization: Bearer via apiClient).
 */
import { createRhChatSession, sendRhMessage } from "@/api/rh-copilot.api";
import { buildRhChatUrl, RH_CHAT_ENDPOINTS } from "@/services/rh-chat/rh-chat.constants";
import type { RhChatConversationsListParams, RhChatPostBody } from "@/types/rh-chat";
import type { ApiClientOptions } from "@/utils/apiClient";
import { apiGet, apiPatch } from "@/utils/apiClient";

export { RH_CHAT_ENDPOINTS, buildRhChatUrl } from "@/services/rh-chat/rh-chat.constants";

function buildListQuery(params: RhChatConversationsListParams): string {
    const q = new URLSearchParams();
    if (params.status?.trim() && params.status !== "all") {
        q.set("status", params.status.trim());
    }
    if (params.search?.trim()) q.set("search", params.search.trim());
    if (params.limit != null) q.set("limit", String(params.limit));
    const qs = q.toString();
    return qs ? `?${qs}` : "";
}

/** GET WF_RH_Conversations — liste */
export async function fetchRhChatConversations(
    params: RhChatConversationsListParams = {},
    options?: ApiClientOptions,
): Promise<unknown> {
    return apiGet<unknown>(`${buildRhChatUrl("list")}${buildListQuery(params)}`, options);
}

/** GET WF_RH_Conversations — détail + messages */
export async function fetchRhChatConversationById(
    conversationId: string,
    options?: ApiClientOptions,
): Promise<unknown> {
    return apiGet<unknown>(buildRhChatUrl("detail", conversationId), options);
}

/** PATCH WF_RH_Conversations — archiver / restaurer */
export async function patchRhChatConversationArchive(
    conversationId: string,
    restore: boolean,
    options?: ApiClientOptions,
): Promise<unknown> {
    return apiPatch<unknown>(
        buildRhChatUrl("archive", conversationId),
        restore ? { restore: true } : {},
        options,
    );
}

/** POST WF_RH_Helper_Chat_v2 — création session si besoin, puis envoi message */
export async function postRhChatMessage(body: RhChatPostBody, _options?: ApiClientOptions): Promise<unknown> {
    const res = await sendRhMessage({
        message: body.message,
        conversation_id: body.conversation_id?.trim() || undefined,
    });

    return {
        status: "success",
        operation: "send_message",
        session_id: res.conversation_id,
        conversation_id: res.conversation_id,
        user_message: res.user_message,
        assistant_message: res.assistant_message,
        reply: res.reply,
        intent: res.intent,
        suggested_actions: res.suggested_actions,
        sources: res.sources,
        confidence: res.confidence,
        quick_replies: res.quick_replies,
        details: res.analyse ? [{ label: res.analyse }] : undefined,
    };
}

/** POST /rh/chat/sessions — nouvelle conversation */
export async function postRhChatSession(
    title?: string,
    _options?: ApiClientOptions,
): Promise<unknown> {
    const res = await createRhChatSession(title?.trim() ? { title: title.trim() } : {});
    return res;
}
