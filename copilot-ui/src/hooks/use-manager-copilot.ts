import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    archiveConversation,
    fetchConversationDetail,
    fetchConversations,
    sendMessage,
    type ConversationsFilters,
} from "@/api/manager-copilot.api";
import type { SendMessageRequest, SendMessageResponse } from "@/api/manager-copilot.types";
import { useToast } from "@/providers/toast-provider";

export const copilotKeys = {
    all: ["manager-copilot"] as const,
    conversations: (filters?: ConversationsFilters) => [...copilotKeys.all, "conversations", filters] as const,
    conversation: (id: string) => [...copilotKeys.all, "conversation", id] as const,
};

export function useManagerCopilotConversations(filters: ConversationsFilters = {}) {
    return useQuery({
        queryKey: copilotKeys.conversations(filters),
        queryFn: () => fetchConversations(filters),
        staleTime: 30_000,
    });
}

export function useManagerCopilotConversationDetail(conversationId: string | undefined) {
    return useQuery({
        queryKey: copilotKeys.conversation(conversationId ?? ""),
        queryFn: () => fetchConversationDetail(conversationId!),
        enabled: Boolean(conversationId?.trim()),
        staleTime: 60_000,
    });
}

export function useManagerCopilotSendMessage(conversationId?: string) {
    const qc = useQueryClient();

    return useMutation<SendMessageResponse, Error, SendMessageRequest>({
        mutationFn: sendMessage,
        onSuccess: (data) => {
            const convId = conversationId?.trim() || data.conversation_id;
            if (convId) {
                void qc.invalidateQueries({ queryKey: copilotKeys.conversation(convId) });
            }
            void qc.invalidateQueries({ queryKey: copilotKeys.all });
        },
    });
}

export function useManagerCopilotArchiveConversation() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: ({ id, restore }: { id: string; restore?: boolean }) => archiveConversation(id, restore),
        onSuccess: (data) => {
            void qc.invalidateQueries({ queryKey: copilotKeys.all });
            toast(
                data.action === "archived" ? "Conversation archivée" : "Conversation restaurée",
                data.action === "archived" ? "success" : "info",
            );
        },
        onError: (err: Error) => {
            toast(`Erreur Copilot : ${err.message}`, "error");
        },
    });
}

/** @deprecated Alias spec — préférer `useManagerCopilotConversations`. */
export const useConversations = useManagerCopilotConversations;

/** @deprecated Alias spec — préférer `useManagerCopilotConversationDetail`. */
export const useConversationDetail = useManagerCopilotConversationDetail;

/** @deprecated Alias spec — préférer `useManagerCopilotSendMessage`. */
export const useSendMessage = useManagerCopilotSendMessage;

/** @deprecated Alias spec — préférer `useManagerCopilotArchiveConversation`. */
export const useArchiveConversation = useManagerCopilotArchiveConversation;
