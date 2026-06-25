import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    archiveRhConversation,
    fetchRhConversationDetail,
    fetchRhConversations,
    sendRhMessage,
    type RhConversationsFilters,
} from "@/api/rh-copilot.api";
import type { SendRhMessageRequest, SendRhMessageResponse } from "@/api/rh-copilot.types";
import { useToast } from "@/providers/toast-provider";

export const rhCopilotKeys = {
    all: ["rh-copilot"] as const,
    conversations: (filters?: RhConversationsFilters) => [...rhCopilotKeys.all, "conversations", filters] as const,
    conversation: (id: string) => [...rhCopilotKeys.all, "conversation", id] as const,
};

export function useRhCopilotConversations(filters: RhConversationsFilters = {}) {
    return useQuery({
        queryKey: rhCopilotKeys.conversations(filters),
        queryFn: () => fetchRhConversations(filters),
        staleTime: 30_000,
    });
}

export function useRhCopilotConversationDetail(conversationId?: string) {
    return useQuery({
        queryKey: rhCopilotKeys.conversation(conversationId ?? ""),
        queryFn: () => fetchRhConversationDetail(conversationId!),
        enabled: Boolean(conversationId?.trim()),
        staleTime: 60_000,
    });
}

export function useRhCopilotSendMessage(conversationId?: string) {
    const qc = useQueryClient();

    return useMutation<SendRhMessageResponse, Error, SendRhMessageRequest>({
        mutationFn: sendRhMessage,
        onSuccess: (data) => {
            const convId = conversationId?.trim() || data.conversation_id;
            if (convId) {
                void qc.invalidateQueries({ queryKey: rhCopilotKeys.conversation(convId) });
            }
            void qc.invalidateQueries({ queryKey: rhCopilotKeys.all });
        },
    });
}

export function useRhCopilotArchiveConversation() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: ({ id, restore }: { id: string; restore?: boolean }) => archiveRhConversation(id, restore),
        onSuccess: (data) => {
            void qc.invalidateQueries({ queryKey: rhCopilotKeys.all });
            toast(
                data.action === "archived" ? "Conversation archivée" : "Conversation restaurée",
                data.action === "archived" ? "success" : "info",
            );
        },
        onError: (err: Error) => {
            toast(`Erreur RH : ${err.message}`, "error");
        },
    });
}

/** @deprecated Alias spec — préférer `useRhCopilotConversations`. */
export const useRhConversations = useRhCopilotConversations;

/** @deprecated Alias spec — préférer `useRhCopilotConversationDetail`. */
export const useRhConversationDetail = useRhCopilotConversationDetail;

/** @deprecated Alias spec — préférer `useRhCopilotSendMessage`. */
export const useSendRhMessage = useRhCopilotSendMessage;

/** @deprecated Alias spec — préférer `useRhCopilotArchiveConversation`. */
export const useArchiveRhConversation = useRhCopilotArchiveConversation;
