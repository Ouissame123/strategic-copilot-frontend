import type { RhChatMessage, RhChatMessageRole, RhChatPostResult } from "@/types/rh-chat";
import { uuidv4 } from "@/utils/uuid";

/** Ordre d’affichage si `created_at` identique : user avant assistant. */
const ROLE_DISPLAY_RANK: Record<RhChatMessageRole, number> = {
    user: 0,
    assistant: 1,
    system: 2,
};

function parseMessageTime(iso: string | null | undefined): number {
    if (!iso?.trim()) return Number.NaN;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : Number.NaN;
}

function nextLocalMessageId(): string {
    return uuidv4();
}

export function createLocalUserMessage(content: string): RhChatMessage {
    return {
        id: nextLocalMessageId(),
        role: "user",
        content: content.trim(),
        created_at: new Date().toISOString(),
    };
}

export function createLocalAssistantMessage(
    result: RhChatPostResult,
    afterUserCreatedAt?: string | null,
): RhChatMessage {
    const userMs = parseMessageTime(afterUserCreatedAt);
    const createdAt = Number.isFinite(userMs)
        ? new Date(userMs + 1).toISOString()
        : new Date().toISOString();

    return {
        id: result.assistant_message_id?.trim() || nextLocalMessageId(),
        role: "assistant",
        content: result.reply?.trim() || "—",
        created_at: createdAt,
        intent: result.intent ?? null,
        confidence: result.confidence ?? null,
        suggested_actions: result.suggested_actions,
        sources: result.sources,
        details: result.details,
        quick_replies: result.quick_replies,
    };
}

/** Ajoute le message utilisateur en fin de file (ordre d’insertion). */
export function appendUserMessage(messages: RhChatMessage[], user: RhChatMessage): RhChatMessage[] {
    return [...messages, user];
}

/** Ajoute la réponse assistant après le message utilisateur (jamais avant). */
export function addAssistantMessage(messages: RhChatMessage[], assistant: RhChatMessage): RhChatMessage[] {
    return [...messages, assistant];
}

/**
 * Messages persistés (API) : tri chronologique + user avant assistant si même horodatage.
 */
export function orderRhChatMessagesForDisplay(messages: RhChatMessage[]): RhChatMessage[] {
    if (messages.length <= 1) return messages;

    return messages
        .map((message, index) => ({ message, index }))
        .sort((a, b) => {
            const ta = parseMessageTime(a.message.created_at);
            const tb = parseMessageTime(b.message.created_at);
            const aHasTime = Number.isFinite(ta);
            const bHasTime = Number.isFinite(tb);

            if (aHasTime && bHasTime && ta !== tb) return ta - tb;
            if (aHasTime && !bHasTime) return -1;
            if (!aHasTime && bHasTime) return 1;

            const ra = ROLE_DISPLAY_RANK[a.message.role] ?? 9;
            const rb = ROLE_DISPLAY_RANK[b.message.role] ?? 9;
            if (ra !== rb) return ra - rb;

            return a.index - b.index;
        })
        .map(({ message }) => message);
}

/**
 * Fusionne messages serveur + optimistes locaux.
 * Serveur normalisé ; locales non persistées conservées en ordre d’insertion (user → assistant).
 */
export function mergeRhChatDisplayMessages(
    serverMessages: RhChatMessage[],
    localMessages: RhChatMessage[],
): RhChatMessage[] {
    const orderedServer = orderRhChatMessagesForDisplay(serverMessages);

    if (localMessages.length === 0) return orderedServer;

    const serverIds = new Set(orderedServer.map((m) => m.id));
    const pending = localMessages.filter((m) => !serverIds.has(m.id));
    if (pending.length === 0) return orderedServer;

    return [...orderedServer, ...pending];
}

function normalizeContent(content: string): string {
    return content.trim();
}

/**
 * Retire les messages locaux une fois persistés côté serveur (comparaison par rôle + contenu).
 */
export function pruneSyncedLocalMessages(
    serverMessages: RhChatMessage[],
    localMessages: RhChatMessage[],
): RhChatMessage[] {
    if (localMessages.length === 0) return localMessages;

    return localMessages.filter((local) => {
        if (local.role === "user") {
            return !serverMessages.some(
                (s) => s.role === "user" && normalizeContent(s.content) === normalizeContent(local.content),
            );
        }
        if (local.role === "assistant") {
            return !serverMessages.some(
                (s) =>
                    s.role === "assistant" &&
                    normalizeContent(s.content) === normalizeContent(local.content),
            );
        }
        return true;
    });
}
