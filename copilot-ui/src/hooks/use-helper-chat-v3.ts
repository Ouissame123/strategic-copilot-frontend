import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendHelperMessageV3 } from "@/api/helper-chat-v3.api";
import type { HelperChatV3Request, HelperChatV3Response } from "@/api/helper-chat-v3.types";
import { managerConversationDetailKey } from "@/hooks/useChat";
import { useToast } from "@/providers/toast-provider";

export function useHelperChatV3(conversationId?: string) {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation<HelperChatV3Response, Error, HelperChatV3Request>({
        mutationFn: sendHelperMessageV3,
        onSuccess: (data) => {
            const cid = (conversationId || data.conversation_id)?.trim();
            if (cid) {
                void qc.invalidateQueries({ queryKey: managerConversationDetailKey(cid) });
            }
        },
        onError: (err) => {
            toast(`Erreur : ${err.message}`, "error");
        },
    });
}
