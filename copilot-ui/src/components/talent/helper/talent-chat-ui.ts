export const TALENT_CHAT_SESSION_STORAGE_KEY = "talent_chat_current_session";

export const TALENT_CHAT_SUGGESTIONS = [
    "Comment puis-je évoluer dans ma carrière ?",
    "Quelles formations devrais-je suivre ?",
    "Quelles sont mes opportunités actuelles ?",
    "Comment améliorer mon score IPI ?",
] as const;

export function readTalentChatSessionId(): string | null {
    try {
        const raw = localStorage.getItem(TALENT_CHAT_SESSION_STORAGE_KEY);
        return raw?.trim() || null;
    } catch {
        return null;
    }
}

export function persistTalentChatSessionId(sessionId: string): void {
    try {
        localStorage.setItem(TALENT_CHAT_SESSION_STORAGE_KEY, sessionId);
    } catch {
        /* ignore */
    }
}

export function clearTalentChatSessionId(): void {
    try {
        localStorage.removeItem(TALENT_CHAT_SESSION_STORAGE_KEY);
    } catch {
        /* ignore */
    }
}
