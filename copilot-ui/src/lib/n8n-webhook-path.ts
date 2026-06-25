import { readEnv } from "@/config/resolve-api-url";
import { API_ROUTES } from "@/lib/api-routes";
import { getHttpClientBaseUrl } from "./build-n8n-url";

/** GET|PATCH WF_Manager_Conversations */
export const MANAGER_CONVERSATIONS_PATH = "/manager/conversations";

/** PATCH archivage logique — workflow n8n `wmc-archive-v1`. */
export const MANAGER_CONVERSATIONS_ARCHIVE_WORKFLOW = "wmc-archive-v1";

/** GET détail conversation — workflow n8n `wmc-detail-v1`. */
export const MANAGER_CONVERSATIONS_DETAIL_WORKFLOW = "wmc-detail-v1";

/** POST WF_Helper_Chat */
export const HELPER_CHAT_PATH = "/api/helper/chat";

/**
 * Chemin HTTP pour les appels n8n.
 * - Local (proxy Vite) : `/manager/...`, `/api/helper/chat` — jamais `/webhook/...` dans le navigateur.
 * - Production (hôte n8n direct) : préfixe `/webhook` ajouté automatiquement.
 */
export function webhookPath(path: string): string {
    const clean = path.startsWith("/") ? path : `/${path}`;

    const baseUrl = (import.meta.env.VITE_N8N_BASE_URL as string | undefined)?.trim() ?? "";
    const httpClientBase = getHttpClientBaseUrl();

    const isLocalProxy =
        !httpClientBase ||
        !baseUrl ||
        baseUrl.includes("localhost") ||
        baseUrl.includes("192.168.") ||
        httpClientBase.includes("localhost") ||
        httpClientBase.includes("192.168.");

    if (isLocalProxy) {
        return clean;
    }

    if (clean.startsWith("/webhook/")) {
        return clean;
    }

    return `/webhook${clean}`;
}

/** @deprecated Utiliser `webhookPath`. */
export const n8nWebhookPath = webhookPath;

export function managerConversationDetailPath(conversationId: string): string {
    const rawId = conversationId.trim();
    if (!rawId) throw new Error("Missing conversation id");
    const id = encodeURIComponent(rawId);

    const envOverride = readEnv("VITE_N8N_WEBHOOK_CONV_DETAIL");
    if (envOverride) {
        const resolved = envOverride.replace(/\{id\}/g, id).replace(/:id/g, id);
        if (/^https?:\/\//i.test(resolved)) return resolved;
        if (resolved.startsWith("/webhook/")) return resolved;
        return webhookPath(resolved.startsWith("/") ? resolved.slice(1) : resolved);
    }

    return API_ROUTES.conversationDetail(rawId);
}

export function managerConversationArchivePath(conversationId: string): string {
    const rawId = conversationId.trim();
    if (!rawId) throw new Error("Missing conversation id");
    const id = encodeURIComponent(rawId);

    const envOverride = readEnv("VITE_N8N_WEBHOOK_CONV_ARCHIVE");
    if (envOverride) {
        const resolved = envOverride.replace(/\{id\}/g, id).replace(/:id/g, id);
        if (/^https?:\/\//i.test(resolved)) return resolved;
        if (resolved.startsWith("/webhook/")) return resolved;
        return webhookPath(resolved.startsWith("/") ? resolved.slice(1) : resolved);
    }

    return API_ROUTES.conversationArchive(rawId);
}
