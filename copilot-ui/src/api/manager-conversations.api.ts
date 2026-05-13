import { normalizeHelperConversationId } from "../lib/helper-conversation-id";
import { httpClient, type HttpClientRequestConfig } from "../lib/http-client";
import type {
    ArchiveConversationRequest, ArchiveConversationResponse, ConversationDetailResponse, ConversationsResponse,
} from "../types/api.types";

function archivePath(cid: string): string {
    const tpl = (import.meta.env.VITE_N8N_WEBHOOK_CONV_ARCHIVE as string | undefined)?.trim();
    if (tpl) return tpl.replaceAll("{id}", cid).replaceAll(":id", cid);
    return `/webhook/manager/conversations/${cid}/archive`;
}

export const managerConversationsApi = {
    list: (params?: { project_id?: string; status?: string; search?: string; limit?: number }) =>
        httpClient.get<ConversationsResponse>("/webhook/manager/conversations", { params }),
    detail: (id: string, messages_limit?: number) => {
        const cid = normalizeHelperConversationId(id);
        return httpClient.get<ConversationDetailResponse>(`/webhook/manager/conversations/${cid}`, { params: { messages_limit } });
    },
    archive: async (conversationId: string, body: ArchiveConversationRequest) => {
        const cid = normalizeHelperConversationId(conversationId);
        const payload = { restore: Boolean(body.restore) };
        const cfg = { skipGlobalHttpErrorToast: true } satisfies HttpClientRequestConfig;
        return httpClient.patch<ArchiveConversationResponse>(archivePath(cid), payload, cfg);
    },
};
