import {
    chatApi,
    conversationsApi,
    normalizeManagerConversationsList,
    type ConversationsListParams,
} from "@/services/chat.api";

export { normalizeManagerConversationsList };

export type ListManagerConversationsParams = ConversationsListParams;

/** @deprecated Préférer `chatApi` / `conversationsApi` — chemins `/manager/conversations` uniquement. */
export const managerConversationsApi = {
    list: conversationsApi.list,
    detail: (id: string) => conversationsApi.get(id),
    archive: conversationsApi.archive,
};

/** Conversation active : GET `/manager/conversations?project_id&status=active&limit=1`. */
export async function getActiveConversationForProject({
    projectId,
}: {
    enterpriseId: string;
    projectId: string;
    token?: string;
}) {
    const pid = String(projectId ?? "").trim();
    if (!pid) return null;
    const res = await chatApi.listConversations({ project_id: pid, status: "active", limit: 1 });
    const normalized = normalizeManagerConversationsList(res.data);
    return normalized.conversations[0] ?? null;
}
