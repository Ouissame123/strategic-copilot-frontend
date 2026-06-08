import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchRhChatConversationById,
    fetchRhChatConversations,
    patchRhChatConversationArchive,
    postRhChatMessage,
} from "@/services/rh-chat/rh-chat.api";
import {
    parseRhChatConversationDetail,
    parseRhChatConversationsList,
    parseRhChatPostResponse,
} from "@/services/rh-chat/rh-chat.parse";
import { queryKeys } from "@/lib/query-keys";
import type { RhChatConversationsListParams, RhChatPostBody } from "@/types/rh-chat";
import { getApiAuthToken } from "@/utils/apiClient";

export function useRhChatConversationsQuery(params: RhChatConversationsListParams = {}) {
    const token = getApiAuthToken();
    return useQuery({
        queryKey: queryKeys.rh.chat.conversations(params),
        queryFn: async ({ signal }) => {
            const raw = await fetchRhChatConversations(params, { signal });
            return parseRhChatConversationsList(raw);
        },
        enabled: Boolean(token),
        staleTime: 20_000,
        refetchOnWindowFocus: false,
    });
}

export function useRhChatConversationDetailQuery(conversationId: string | null) {
    const token = getApiAuthToken();
    const id = conversationId?.trim() ?? "";
    return useQuery({
        queryKey: queryKeys.rh.chat.detail(id),
        queryFn: async ({ signal }) => {
            const raw = await fetchRhChatConversationById(id, { signal });
            return parseRhChatConversationDetail(raw, id);
        },
        enabled: Boolean(token) && Boolean(id),
        staleTime: 10_000,
    });
}

export function useRhChatSendMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (body: RhChatPostBody) => {
            const raw = await postRhChatMessage(body);
            return parseRhChatPostResponse(raw);
        },
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.rh.chat.conversationsRoot });
        },
    });
}

export function useRhChatArchiveMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, restore }: { id: string; restore: boolean }) =>
            patchRhChatConversationArchive(id, restore),
        onSuccess: (_data, variables) => {
            void qc.invalidateQueries({ queryKey: queryKeys.rh.chat.conversationsRoot });
            void qc.invalidateQueries({ queryKey: queryKeys.rh.chat.detail(variables.id) });
        },
    });
}
