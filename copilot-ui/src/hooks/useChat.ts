import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { normalizeConversationDetailResponse } from "@/components/copilot/helper-chat-reply-cache";
import { normalizeHelperConversationId } from "@/lib/helper-conversation-id";
import {
    chatApi,
    conversationsApi,
    normalizeManagerConversationsList,
    type ConversationsListParams,
    type ConversationsListResult,
    type HelperChatSendBody,
} from "@/services/chat.api";

export type { ConversationsListParams, HelperChatSendBody };
export {
    clearCopilotPendingMessages,
    getSessionId,
    readCopilotPendingMessages,
    resetCopilotSessionId,
    writeCopilotPendingMessages,
} from "@/lib/copilot-session-storage";

export const managerConversationsListKey = (params?: ConversationsListParams) =>
    [
        "manager-conversations",
        params?.status ?? "active",
        params?.project_id ?? null,
        params?.search ?? null,
        params?.limit ?? null,
    ] as const;

const listKey = managerConversationsListKey;

export const managerConversationDetailKey = (id: string | null) => ["manager-conversation", id] as const;

const detailKey = managerConversationDetailKey;

/** GET /manager/conversations — liste (filtrée par projet côté appelant). */
export function useConversations(params?: ConversationsListParams, queryEnabled = true) {
    const status = params?.status ?? "active";
    const projectScoped = Boolean(params?.project_id?.trim());
    return useQuery({
        queryKey: listKey({ ...params, status }),
        queryFn: async (): Promise<ConversationsListResult> => {
            const res = await conversationsApi.list({ status, ...params });
            return res.data;
        },
        enabled: queryEnabled && (projectScoped ? Boolean(params!.project_id!.trim()) : true),
        staleTime: 30_000,
    });
}

/** Conversation active du projet : GET `/manager/conversations?project_id&status=active&limit=1`. */
export function useProjectConversations(projectId: string | null, queryEnabled = true) {
    const pid = projectId?.trim() ?? "";
    return useQuery({
        queryKey: listKey({ project_id: pid, status: "active", limit: 1 }),
        queryFn: async (): Promise<ConversationsListResult> => {
            const res = await conversationsApi.list({ project_id: pid, status: "active", limit: 1 });
            return res.data;
        },
        enabled: queryEnabled && Boolean(pid),
        staleTime: 30_000,
        refetchOnMount: true,
    });
}

/** GET /manager/conversations/:id — historique messages. */
export function useConversation(conversationId: string | null, enabled = true) {
    const id = conversationId?.trim() ?? "";
    return useQuery({
        queryKey: detailKey(id || null),
        queryFn: async () => {
            const res = await conversationsApi.get(id);
            return normalizeConversationDetailResponse(res.data);
        },
        enabled: Boolean(id) && enabled,
        staleTime: 10_000,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
}

/** POST /api/helper/chat — invalidation LIST/DETAIL gérée par le panneau (évite boucles). */
export function useSendMessage() {
    return useMutation({
        mutationFn: (body: HelperChatSendBody) => conversationsApi.send(body).then((r) => r.data),
    });
}

/** PATCH /webhook/wmc-archive-v1/manager/conversations/:id/archive */
export function useArchiveConversation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, restore }: { id: string; restore: boolean }) => {
            const cid = normalizeHelperConversationId(id);
            return (await conversationsApi.archive(cid, { restore: Boolean(restore) })).data;
        },
        onSuccess: (_data, { id }) => {
            const nid = normalizeHelperConversationId(id);
            void qc.removeQueries({ queryKey: detailKey(id) });
            void qc.removeQueries({ queryKey: detailKey(nid) });
            void qc.invalidateQueries({ queryKey: ["manager-conversations"] });
        },
    });
}

/** @deprecated Utiliser `useConversations` — clé alignée historique sidebar. */
export const useConversationsLegacyKey = (
    status: "active" | "archived" | "all" = "active",
    extra?: Omit<ConversationsListParams, "status">,
) =>
    useQuery({
        queryKey: ["chat-conversations", status, extra?.project_id ?? null, extra?.search ?? null, extra?.limit ?? null],
        queryFn: async () => {
            const res = await conversationsApi.list({ status, ...extra });
            return res.data;
        },
        staleTime: 30_000,
    });
