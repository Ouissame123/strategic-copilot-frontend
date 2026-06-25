import type { ChatSession, ChatSessionDetail, SendMessageResponse } from "@/types/talent-chat";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function arr<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeChatSession(raw: unknown): ChatSession {
    const root = unwrapN8nRoot(raw);
    const session = asRecord(root.session ?? root);
    return session as ChatSession;
}

export function normalizeChatSessionsList(raw: unknown): ChatSession[] {
    const root = unwrapN8nRoot(raw);
    return arr<ChatSession>(root.sessions ?? root.items ?? root.data);
}

export function normalizeChatSessionDetail(raw: unknown): ChatSessionDetail {
    const root = unwrapN8nRoot(raw);
    return {
        session: (root.session ?? root) as ChatSession,
        messages: arr(root.messages),
    };
}

export function normalizeSendMessageResponse(raw: unknown): SendMessageResponse {
    const root = unwrapN8nRoot(raw);
    return root as SendMessageResponse;
}
