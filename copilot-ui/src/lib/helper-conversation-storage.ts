import { normalizeHelperConversationId } from "./helper-conversation-id";

export function helperConversationStorageKey(enterpriseId: string, projectId: string): string {
    const eid = String(enterpriseId ?? "").trim();
    const pid = String(projectId ?? "").trim();
    return `helper_conversation_${eid}_${pid}`;
}

export function readHelperConversationId(enterpriseId: string, projectId: string): string | null {
    try {
        const raw = localStorage.getItem(helperConversationStorageKey(enterpriseId, projectId));
        const id = raw?.trim();
        return id ? normalizeHelperConversationId(id) : null;
    } catch {
        return null;
    }
}

export function writeHelperConversationId(enterpriseId: string, projectId: string, conversationId: string): void {
    try {
        localStorage.setItem(
            helperConversationStorageKey(enterpriseId, projectId),
            normalizeHelperConversationId(conversationId),
        );
    } catch {
        /* quota / mode privé */
    }
}

export function removeHelperConversationStorage(enterpriseId: string, projectId: string): void {
    try {
        localStorage.removeItem(helperConversationStorageKey(enterpriseId, projectId));
    } catch {
        /* ignore */
    }
}
