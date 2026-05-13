import { managerConversationsApi } from "@/api/manager-conversations.api";
import { normalizeHelperConversationId } from "@/lib/helper-conversation-id";
import { httpClient } from "@/lib/http-client";

export interface Conversation {
    id: string;
    title: string | null;
    project_id: string | null;
    project_name?: string;
    last_message_at: string | null;
    message_count: number;
    status: "active" | "archived";
    created_at: string;
}

export interface ChatSuggestedAction {
    label: string;
    type: string;
    payload?: unknown;
    /** Alias pratique si le backend les envoie à plat. */
    target_id?: string;
    duration_days?: number;
}

/** Source citée par le helper (lien interne). */
export interface ChatSource {
    type: string;
    id: string;
    label: string;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    intent?: string;
    confidence?: number;
    /** Présent sur les réponses assistant issues du helper (affichage UI uniquement). */
    suggested_actions?: ChatSuggestedAction[];
    /** Puces détaillées (réponse structurée). */
    details?: string[];
    /** Liens sources renvoyés par le helper. */
    sources?: ChatSource[];
    created_at: string;
}

export interface ChatReply {
    status: "success";
    conversation_id: string;
    user_message_id: string;
    assistant_message_id: string;
    user_message: string;
    reply: string;
    intent: string;
    /** Optionnel : détail sous forme de liste. */
    details?: string[];
    suggested_actions: Array<{ label: string; type: string; payload?: unknown; target_id?: string; duration_days?: number }>;
    sources: Array<{ type: string; id: string; label: string }>;
    confidence: number;
    context_used: { project_id: string | null; has_project_context: boolean };
}

export const chatApi = {
    send: (body: { conversation_id?: string | null; project_id?: string | null; message: string }) =>
        httpClient.post<ChatReply>("/webhook/api/helper/chat", body),
};

export const conversationsApi = {
    list: (params?: { status?: "active" | "archived"; project_id?: string }) =>
        httpClient.get<{ conversations: Conversation[]; count: number }>("/webhook/manager/conversations", { params }),

    get: (id: string) => {
        const cid = normalizeHelperConversationId(id);
        return httpClient.get<{ conversation: Conversation; messages: ChatMessage[] }>(`/webhook/manager/conversations/${cid}`);
    },

    /** Même logique que `managerConversationsApi.archive` (versionné → legacy si 404/405). */
    archive: (conversationId: string, body: { restore: boolean }) =>
        managerConversationsApi.archive(conversationId, { restore: Boolean(body.restore) }),
};
