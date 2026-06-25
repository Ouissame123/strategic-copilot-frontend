import { isAxiosError } from "axios";
import {
    getTalentChatMessagePostUrl,
    getTalentChatSessionDeleteUrl,
    getTalentChatSessionDetailGetUrl,
    TALENT_CHAT_SESSIONS_BASE_PATH,
} from "@/config/talent-chat-api.config";
import { httpClient } from "@/lib/http-client";
import {
    normalizeChatSession,
    normalizeChatSessionDetail,
    normalizeChatSessionsList,
    normalizeSendMessageResponse,
} from "@/lib/talent-chat-normalize";
import type { ChatSession, ChatSessionDetail, SendMessageResponse } from "@/types/talent-chat";
import type { ApiClientOptions } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export class TalentChatApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus = 0) {
        super(message);
        this.name = "TalentChatApiError";
        this.httpStatus = httpStatus;
    }
}

function readErrorMessage(err: unknown, fallback: string): never {
    if (isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const root = unwrapN8nRoot(err.response?.data);
        const message = String(root.message ?? root.error ?? fallback);
        throw new TalentChatApiError(message, status);
    }
    if (err instanceof TalentChatApiError) throw err;
    throw new TalentChatApiError(err instanceof Error ? err.message : fallback);
}

export const talentChatApi = {
    createSession: async (title?: string, options?: ApiClientOptions): Promise<ChatSession> => {
        try {
            const body = title?.trim() ? { title: title.trim() } : {};
            const { data } = await httpClient.post<unknown>(TALENT_CHAT_SESSIONS_BASE_PATH, body, { signal: options?.signal });
            return normalizeChatSession(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de créer la conversation.");
        }
    },

    listSessions: async (options?: ApiClientOptions): Promise<ChatSession[]> => {
        try {
            const { data } = await httpClient.get<unknown>(TALENT_CHAT_SESSIONS_BASE_PATH, { signal: options?.signal });
            return normalizeChatSessionsList(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger les conversations.");
        }
    },

    getSession: async (id: string, options?: ApiClientOptions): Promise<ChatSessionDetail> => {
        try {
            const { data } = await httpClient.get<unknown>(getTalentChatSessionDetailGetUrl(id), { signal: options?.signal });
            return normalizeChatSessionDetail(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger la conversation.");
        }
    },

    deleteSession: async (id: string): Promise<void> => {
        try {
            await httpClient.delete(getTalentChatSessionDeleteUrl(id));
        } catch (err) {
            readErrorMessage(err, "Impossible de supprimer la conversation.");
        }
    },

    sendMessage: async (sessionId: string, message: string, options?: ApiClientOptions): Promise<SendMessageResponse> => {
        try {
            const { data } = await httpClient.post<unknown>(
                getTalentChatMessagePostUrl(sessionId),
                { message },
                { signal: options?.signal },
            );
            return normalizeSendMessageResponse(data);
        } catch (err) {
            readErrorMessage(err, "Erreur de communication avec le Helper.");
        }
    },
};
