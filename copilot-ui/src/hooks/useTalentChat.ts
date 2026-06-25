import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { talentChatApi } from "@/api/talent-chat.api";
import {
    persistTalentChatSessionId,
    readTalentChatSessionId,
    clearTalentChatSessionId,
} from "@/components/talent/helper/talent-chat-ui";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { ChatSessionDetail, SendMessageResponse } from "@/types/talent-chat";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export function useTalentChatSessions(enabled = true) {
    return useQuery({
        queryKey: queryKeys.talent.chatSessions(),
        queryFn: ({ signal }) => talentChatApi.listSessions({ signal }),
        enabled,
        retry: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useTalentChatSession(id: string | null, enabled = true) {
    return useQuery({
        queryKey: queryKeys.talent.chatSession(id ?? ""),
        queryFn: ({ signal }) => talentChatApi.getSession(id!, { signal }),
        enabled: Boolean(id) && enabled,
        retry: false,
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useTalentChatSendMessage() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
            talentChatApi.sendMessage(sessionId, message),
        onSuccess: (data: SendMessageResponse, vars) => {
            qc.setQueryData<ChatSessionDetail>(queryKeys.talent.chatSession(vars.sessionId), (prev) => {
                const base = prev ?? {
                    session: {
                        id: vars.sessionId,
                        title: data.session.title,
                        is_archived: false,
                        message_count: 0,
                        last_message_at: null,
                        created_at: new Date().toISOString(),
                    },
                    messages: [],
                };
                const hasUser = base.messages.some((m) => m.id === data.user_message.id);
                const hasAssistant = base.messages.some((m) => m.id === data.assistant_message.id);
                return {
                    session: {
                        ...base.session,
                        title: data.session.title,
                        message_count: data.session.message_count,
                        last_message_at: data.session.last_message_at,
                    },
                    messages: [
                        ...base.messages,
                        ...(hasUser ? [] : [data.user_message]),
                        ...(hasAssistant ? [] : [data.assistant_message]),
                    ],
                };
            });
            void qc.invalidateQueries({ queryKey: queryKeys.talent.chatSessions() });
        },
        onError: (err: unknown) => {
            if (isAxiosError(err)) {
                const root = unwrapN8nRoot(err.response?.data);
                push(String(root.message ?? root.error ?? "Erreur de communication"), "error");
                return;
            }
            push(err instanceof Error ? err.message : "Erreur de communication", "error");
        },
    });
}

export function useTalentChatCreateSession() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (title?: string) => talentChatApi.createSession(title),
        onSuccess: (session) => {
            persistTalentChatSessionId(session.id);
            qc.setQueryData<ChatSessionDetail>(queryKeys.talent.chatSession(session.id), {
                session,
                messages: [],
            });
            void qc.invalidateQueries({ queryKey: queryKeys.talent.chatSessions() });
        },
    });
}

export function useTalentChatDeleteSession() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => talentChatApi.deleteSession(id),
        onSuccess: (_, id) => {
            if (readTalentChatSessionId() === id) clearTalentChatSessionId();
            qc.removeQueries({ queryKey: queryKeys.talent.chatSession(id) });
            void qc.invalidateQueries({ queryKey: queryKeys.talent.chat() });
        },
    });
}
