import { readEnv, trimUrl } from "@/config/resolve-api-url";

/** Collection sessions chat talent — GET liste + POST création. */
export const TALENT_CHAT_SESSIONS_BASE_PATH = "/webhook/talent/chat/sessions";

function resolveTalentChatSessionUrl(
    sessionId: string,
    options: {
        envUrlKey: string;
        envPrefixKey: string;
        defaultWorkflowSegment: string;
        defaultSuffix?: string;
    },
): string {
    const id = String(sessionId ?? "").trim();
    if (!id) throw new Error("Missing session id");
    const lower = id.toLowerCase();
    if (lower === ":id" || lower === ":sessionid") throw new Error("Invalid session id placeholder");
    const enc = encodeURIComponent(id);
    const suffix = options.defaultSuffix ?? "";

    const explicit = readEnv(options.envUrlKey);
    if (explicit) {
        if (/^https?:\/\//i.test(explicit)) {
            if (explicit.includes(":id") || explicit.includes(":sessionId")) {
                return explicit.split(":sessionId").join(enc).split(":id").join(enc);
            }
            return `${explicit.replace(/\/$/, "")}/${enc}${suffix}`;
        }
        const rel =
            explicit.includes(":id") || explicit.includes(":sessionId")
                ? explicit.split(":sessionId").join(enc).split(":id").join(enc)
                : `${explicit.replace(/\/$/, "")}/${enc}${suffix}`;
        return rel.startsWith("/") ? rel : `/${rel}`;
    }

    const prefix = readEnv(options.envPrefixKey)?.trim().replace(/\/$/, "");
    if (prefix) return `${prefix}/${enc}${suffix}`;

    const apiBase = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (apiBase) return `${apiBase}/${options.defaultWorkflowSegment}/talent/chat/sessions/${enc}${suffix}`;
    return `/webhook/${options.defaultWorkflowSegment}/talent/chat/sessions/${enc}${suffix}`;
}

/**
 * GET détail session + messages.
 *
 * Défaut : `/webhook/wf-talent-chat-detail-v1/talent/chat/sessions/{id}`
 */
export function getTalentChatSessionDetailGetUrl(sessionId: string): string {
    return resolveTalentChatSessionUrl(sessionId, {
        envUrlKey: "VITE_TALENT_CHAT_DETAIL_URL",
        envPrefixKey: "VITE_TALENT_CHAT_DETAIL_PREFIX",
        defaultWorkflowSegment: "wf-talent-chat-detail-v1",
    });
}

/**
 * DELETE suppression session.
 *
 * Défaut : `/webhook/wf-talent-chat-delete-v1/talent/chat/sessions/{id}`
 */
export function getTalentChatSessionDeleteUrl(sessionId: string): string {
    return resolveTalentChatSessionUrl(sessionId, {
        envUrlKey: "VITE_TALENT_CHAT_DELETE_URL",
        envPrefixKey: "VITE_TALENT_CHAT_DELETE_PREFIX",
        defaultWorkflowSegment: "wf-talent-chat-delete-v1",
    });
}

/**
 * POST envoi message dans une session.
 *
 * Défaut : `/webhook/wf-talent-chat-message-v1/talent/chat/sessions/{id}/message`
 */
export function getTalentChatMessagePostUrl(sessionId: string): string {
    return resolveTalentChatSessionUrl(sessionId, {
        envUrlKey: "VITE_TALENT_CHAT_MESSAGE_URL",
        envPrefixKey: "VITE_TALENT_CHAT_MESSAGE_PREFIX",
        defaultWorkflowSegment: "wf-talent-chat-message-v1",
        defaultSuffix: "/message",
    });
}
