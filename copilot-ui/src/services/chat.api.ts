import { normalizeHelperConversationId } from "@/lib/helper-conversation-id";
import {
    HELPER_CHAT_PATH,
    MANAGER_CONVERSATIONS_PATH,
    managerConversationArchivePath,
    webhookPath,
} from "@/lib/n8n-webhook-path";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";
import type { ManagerConversationListItem } from "@/types/api.types";

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
    target_id?: string;
    duration_days?: number;
}

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
    suggested_actions?: ChatSuggestedAction[];
    details?: string[];
    sources?: ChatSource[];
    created_at: string;
    /** Bulle affichée localement avant synchro GET DETAIL. */
    local?: boolean;
}

/** POST /api/helper/chat — réponse WF_Helper_Chat. */
export interface HelperChatReply {
    status?: string;
    conversation_id: string;
    reply: string;
    user_message_id?: string;
    assistant_message_id?: string;
    user_message?: string;
    intent?: string;
    details?: string[];
    suggested_actions?: Array<{ label: string; type: string; payload?: unknown; target_id?: string; duration_days?: number }>;
    sources?: Array<{ type: string; id: string; label: string }>;
    confidence?: number;
    quick_replies?: string[];
    context_used?: { project_id: string | null; has_project_context?: boolean };
}

export type HelperChatSendBody = {
    enterprise_id: string;
    project_id: string;
    message: string;
    conversation_id?: string;
    /** Session stable par projet (localStorage) — évite une nouvelle conversation à chaque message. */
    session_id?: string;
};

/** Texte assistant renvoyé par WF_Helper_Chat (champs possibles selon version n8n). */
export function extractHelperReplyText(reply: HelperChatReply): string {
    const extra = reply as HelperChatReply & { output?: string; response?: string };
    return String(reply.reply ?? extra.output ?? extra.response ?? "").trim();
}

export type ConversationsListParams = {
    project_id?: string;
    status?: "active" | "archived" | "all";
    search?: string;
    limit?: number;
};

export type ConversationsListResult = {
    status?: string;
    count: number;
    conversations: Conversation[];
};

function mapListItemToConversation(item: ManagerConversationListItem): Conversation {
    const status = item.status === "archived" ? "archived" : "active";
    return {
        id: item.id,
        title: item.title,
        project_id: item.project_id,
        project_name: item.project_name ?? undefined,
        message_count: Number(item.message_count) || 0,
        status,
        created_at: item.started_at,
        last_message_at: item.last_message_at,
    };
}

/** Normalise GET /manager/conversations (WF_Manager_Conversations LIST). */
export function normalizeManagerConversationsList(data: unknown): ConversationsListResult {
    if (data == null || typeof data !== "object") return { conversations: [], count: 0 };
    const o = data as Record<string, unknown>;
    const rawList = Array.isArray(o.conversations)
        ? (o.conversations as ManagerConversationListItem[])
        : Array.isArray(o.items)
          ? (o.items as ManagerConversationListItem[])
          : [];
    const conversations = rawList
        .filter((item) => item?.id)
        .map((item) =>
            "started_at" in item && item.started_at
                ? mapListItemToConversation(item)
                : mapListItemToConversation({
                      ...item,
                      started_at: (item as { created_at?: string }).created_at ?? item.last_message_at ?? new Date().toISOString(),
                  }),
        );
    const count = typeof o.count === "number" ? o.count : conversations.length;
    return { status: typeof o.status === "string" ? o.status : undefined, conversations, count };
}

const silentCfg = { skipGlobalHttpErrorToast: true } satisfies HttpClientRequestConfig;

function logChatApi(op: string, url: string) {
    if (import.meta.env.DEV) {
        console.log(`[CHAT API] ${op}`, url);
    }
}

/**
 * API Copilot Projet — 4 endpoints stricts (proxy Vite en local).
 */
export const chatApi = {
    /** GET /manager/conversations?project_id=…&status=active&limit=1 */
    listConversations: (params?: ConversationsListParams) => {
        const url = webhookPath(MANAGER_CONVERSATIONS_PATH);
        logChatApi("LIST", url);
        return httpClient.get(url, { params, ...silentCfg });
    },

    /** GET /webhook/manager/conversations/:id */
    getConversation: (conversationId: string) => {
        const cid = normalizeHelperConversationId(conversationId);
        const url = `/webhook${MANAGER_CONVERSATIONS_PATH}/${encodeURIComponent(cid.trim())}`;
        logChatApi("DETAIL", url);
        return httpClient.get(url, silentCfg);
    },

    /** POST /api/helper/chat */
    sendMessage: (body: HelperChatSendBody) => {
        const url = webhookPath(HELPER_CHAT_PATH);
        logChatApi("SEND", url);
        return httpClient.post<HelperChatReply>(url, body);
    },

    /** PATCH /webhook/wmc-archive-v1/manager/conversations/:id/archive */
    archiveConversation: (conversationId: string, body: { restore: boolean }) => {
        const cid = normalizeHelperConversationId(conversationId);
        const url = managerConversationArchivePath(cid);
        logChatApi("ARCHIVE", url);
        return httpClient.patch(url, { restore: Boolean(body.restore) }, silentCfg);
    },
};

export const getConversations = chatApi.listConversations;
export const getConversation = chatApi.getConversation;
export const archiveConversation = chatApi.archiveConversation;
export const sendMessage = chatApi.sendMessage;

/** Alias historique — même surface que `chatApi`. */
export const conversationsApi = {
    list: async (params?: ConversationsListParams) => {
        const res = await chatApi.listConversations(params);
        const normalized = normalizeManagerConversationsList(res.data);
        return { ...res, data: normalized };
    },
    get: (id: string) => chatApi.getConversation(id),
    archive: (conversationId: string, body: { restore: boolean }) => chatApi.archiveConversation(conversationId, body),
    send: (body: HelperChatSendBody) => chatApi.sendMessage(body),
};
