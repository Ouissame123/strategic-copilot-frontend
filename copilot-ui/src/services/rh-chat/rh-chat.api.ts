/**
 * WF_RH_Conversations + WF_RH_Chat — client HTTP (Authorization: Bearer via apiClient).
 */
import { buildRhChatUrl, RH_CHAT_ENDPOINTS } from "@/services/rh-chat/rh-chat.constants";
import type { RhChatConversationsListParams, RhChatPostBody } from "@/types/rh-chat";
import type { ApiClientOptions } from "@/utils/apiClient";
import { apiGet, apiPatch, apiPost } from "@/utils/apiClient";

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
    return apiPatch<unknown>(buildRhChatUrl("archive", conversationId), { restore: Boolean(restore) }, options);
}

/** POST WF_RH_Chat — envoi message */
export async function postRhChatMessage(body: RhChatPostBody, options?: ApiClientOptions): Promise<unknown> {
    return apiPost<unknown>(
        buildRhChatUrl("chat"),
        {
            message: body.message.trim(),
            conversation_id: body.conversation_id?.trim() || null,
        },
        options,
    );
}
