import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { normalizeHelperConversationId } from "@/lib/helper-conversation-id";
import { chatApi, conversationsApi } from "@/services/chat.api";

export const useConversations = (status: "active" | "archived" = "active") =>
    useQuery({
        queryKey: ["chat-conversations", status],
        queryFn: () => conversationsApi.list({ status }).then((r) => r.data),
        staleTime: 30_000,
    });

export const useConversation = (id: string | null, enabled = true, onNotFound?: () => void) =>
    useQuery({
        queryKey: ["chat-conversation", id],
        queryFn: async () => {
            try {
                return (await conversationsApi.get(id!)).data;
            } catch (err) {
                if (isAxiosError(err) && err.response?.status === 404 && onNotFound) onNotFound();
                throw err;
            }
        },
        enabled: Boolean(id) && enabled,
        staleTime: 10_000,
        retry: false,
        refetchOnWindowFocus: false,
    });

export const useSendMessage = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Parameters<typeof chatApi.send>[0]) => chatApi.send(body).then((r) => r.data),
        onSuccess: (data) => {
            void qc.invalidateQueries({ queryKey: ["chat-conversation", data.conversation_id] });
            void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
        },
    });
};

export const useArchiveConversation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, restore }: { id: string; restore: boolean }) => {
            const cid = normalizeHelperConversationId(id);
            try {
                return (await conversationsApi.archive(cid, { restore: Boolean(restore) })).data;
            } catch (e) {
                if (!isAxiosError(e)) throw e;
                const st = e.response?.status;
                const transient = st == null || st >= 500;
                if (!transient || restore) throw e;
                await qc.refetchQueries({ queryKey: ["chat-conversations", "active"] });
                const updated = qc.getQueryData<{ conversations: { id: string }[] }>(["chat-conversations", "active"]);
                if (updated === undefined) throw e;
                const stillThere = (updated.conversations ?? []).some((c) => c.id.toLowerCase() === cid);
                if (stillThere) throw e;
                void qc.removeQueries({ queryKey: ["chat-conversation", id] });
                void qc.removeQueries({ queryKey: ["chat-conversation", cid] });
                void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
                return { __archiveReconciled: true as const, id: cid };
            }
        },
        onSuccess: (data, { id }) => {
            if (data && typeof data === "object" && "__archiveReconciled" in data && data.__archiveReconciled) return;
            const nid = normalizeHelperConversationId(id);
            void qc.removeQueries({ queryKey: ["chat-conversation", id] });
            void qc.removeQueries({ queryKey: ["chat-conversation", nid] });
            void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
        },
    });
};
