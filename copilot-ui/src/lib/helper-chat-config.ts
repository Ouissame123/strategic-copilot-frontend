import { webhookPath } from "@/lib/n8n-webhook-path";

/** v2 RAG — défaut si `VITE_HELPER_CHAT_URL` absent. */
export const HELPER_CHAT_V2_DEFAULT_PATH = "/api/helper/chat-v2";

/** v1 — rollback via `.env`. */
export const HELPER_CHAT_V1_PATH = "/api/helper/chat";

/** Chemin configuré (brut, tel que dans `.env` ou défaut v2). */
export function getHelperChatUrlPath(): string {
    const raw = (import.meta.env.VITE_HELPER_CHAT_URL as string | undefined)?.trim();
    return raw || HELPER_CHAT_V2_DEFAULT_PATH;
}

/** `true` si l'URL pointe vers l'endpoint v2 RAG (badge UI). */
export function isHelperChatRagV2Enabled(): boolean {
    return getHelperChatUrlPath().includes("chat-v2");
}

/** URL HTTP finale pour POST helper chat (proxy local ou `/webhook` en prod). */
export function resolveHelperChatSendUrl(): string {
    const path = getHelperChatUrlPath();
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/webhook/")) return path;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return webhookPath(normalized);
}
