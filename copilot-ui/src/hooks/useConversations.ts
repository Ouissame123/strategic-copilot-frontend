import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { managerConversationsApi } from "../api/manager-conversations.api";
import { normalizeHelperConversationId } from "../lib/helper-conversation-id";

export const useConversations = (params?: { project_id?: string; status?: string; search?: string; limit?: number }) =>
    useQuery({
        queryKey: ["conversations", params],
        queryFn: () => managerConversationsApi.list(params).then((r) => r.data),
        staleTime: 120_000,
    });

export const useConversationDetail = (id: string, messages_limit?: number) =>
    useQuery({
        queryKey: ["conversation", id, messages_limit],
        queryFn: () => managerConversationsApi.detail(id, messages_limit).then((r) => r.data),
        enabled: Boolean(id),
        staleTime: 120_000,
    });

export const useArchiveConversation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, restore = false }: { id: string; restore?: boolean }) => {
            const cid = normalizeHelperConversationId(id);
            try {
                return (await managerConversationsApi.archive(cid, { restore: Boolean(restore) })).data;
            } catch (e) {
                if (!isAxiosError(e)) throw e;
                const st = e.response?.status;
                if (st != null && st < 500) throw e;
                if (restore) throw e;
                await qc.refetchQueries({ queryKey: ["chat-conversations", "active"] });
                await qc.refetchQueries({ queryKey: ["conversations"] });
                const updated = qc.getQueryData<{ conversations: { id: string }[] }>(["chat-conversations", "active"]);
                if (updated === undefined) throw e;
                const stillThere = (updated.conversations ?? []).some((c) => c.id.toLowerCase() === cid);
                if (stillThere) throw e;
                void qc.removeQueries({ queryKey: ["conversation", id] });
                void qc.removeQueries({ queryKey: ["conversation", cid] });
                void qc.invalidateQueries({ queryKey: ["conversations"] });
                void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
                return { __archiveReconciled: true as const, id: cid };
            }
        },
        onSuccess: (data) => {
            if (data && typeof data === "object" && "__archiveReconciled" in data && data.__archiveReconciled) return;
            void qc.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
};
