import type { ChatMessage } from "@/services/chat.api";

/** Session Copilot stable par projet — réutilisée pour tous les messages du même projet. */
export function copilotSessionStorageKey(projectId: string): string {
    return `copilot_session_${String(projectId ?? "").trim()}`;
}

function copilotPendingStorageKey(projectId: string): string {
    return `copilot_pending_${String(projectId ?? "").trim()}`;
}

export function getSessionId(projectId: string): string {
    const pid = String(projectId ?? "").trim();
    const key = copilotSessionStorageKey(pid);
    try {
        let id = localStorage.getItem(key)?.trim();
        if (!id) {
            id = `${pid}_${Date.now()}`;
            localStorage.setItem(key, id);
        }
        return id;
    } catch {
        return `${pid}_${Date.now()}`;
    }
}

export function resetCopilotSessionId(projectId: string): void {
    try {
        localStorage.removeItem(copilotSessionStorageKey(projectId));
    } catch {
        /* ignore */
    }
}

/** Historique local affiché tant que GET DETAIL est vide ou en 404. */
export function readCopilotPendingMessages(projectId: string): ChatMessage[] {
    const pid = String(projectId ?? "").trim();
    if (!pid) return [];
    try {
        const raw = localStorage.getItem(copilotPendingStorageKey(pid));
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (m): m is ChatMessage =>
                m != null &&
                typeof m === "object" &&
                typeof (m as ChatMessage).id === "string" &&
                typeof (m as ChatMessage).content === "string" &&
                ((m as ChatMessage).role === "user" ||
                    (m as ChatMessage).role === "assistant" ||
                    (m as ChatMessage).role === "system"),
        );
    } catch {
        return [];
    }
}

export function writeCopilotPendingMessages(projectId: string, messages: ChatMessage[]): void {
    const pid = String(projectId ?? "").trim();
    if (!pid) return;
    try {
        const key = copilotPendingStorageKey(pid);
        if (messages.length === 0) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify(messages));
        }
    } catch {
        /* quota / mode privé */
    }
}

export function clearCopilotPendingMessages(projectId: string): void {
    writeCopilotPendingMessages(projectId, []);
}
