import { resolveRhWebhookBase } from "@/api/rh-dashboard.api";

/**
 * Routes WF_RH_Conversations + WF_RH_Chat (chemins webhook n8n).
 * Ne pas dupliquer ces valeurs dans les composants — utiliser `buildRhChatUrl`.
 */
export const RH_CHAT_ENDPOINTS = {
    list: "/webhook/rh/conversations",
    detail: "/webhook/wf-rh-conversations-detail-v1/rh/conversations",
    archive: "/webhook/wf-rh-conversations-archive-v1/rh/conversations",
    chat: "/webhook/rh/chat",
} as const;

export type RhChatEndpointKey = keyof typeof RH_CHAT_ENDPOINTS;

function rhChatApiBaseOverride(): string | undefined {
    return (import.meta.env.VITE_RH_CHAT_API_BASE as string | undefined)?.trim();
}

function webhookPathSuffix(pathWithWebhookPrefix: string): string {
    return pathWithWebhookPrefix.replace(/^\/webhook/, "") || pathWithWebhookPrefix;
}

/**
 * URL absolue ou relative pour `apiGet` / `apiPost` / `apiPatch` (Bearer via apiClient).
 */
export function buildRhChatUrl(route: "list" | "chat"): string;
export function buildRhChatUrl(route: "detail" | "archive", conversationId: string): string;
export function buildRhChatUrl(route: RhChatEndpointKey, conversationId?: string): string {
    const id = conversationId?.trim();

    if (route === "detail" || route === "archive") {
        if (!id) {
            throw new Error("conversation_id requis");
        }
    }

    if (import.meta.env.DEV) {
        if (route === "detail") {
            return `${RH_CHAT_ENDPOINTS.detail}/${encodeURIComponent(id!)}`;
        }
        if (route === "archive") {
            return `${RH_CHAT_ENDPOINTS.archive}/${encodeURIComponent(id!)}/archive`;
        }
        return RH_CHAT_ENDPOINTS[route];
    }

    const webhookBase = resolveRhWebhookBase(rhChatApiBaseOverride());

    if (route === "detail") {
        return `${webhookBase}${webhookPathSuffix(RH_CHAT_ENDPOINTS.detail)}/${encodeURIComponent(id!)}`;
    }
    if (route === "archive") {
        return `${webhookBase}${webhookPathSuffix(RH_CHAT_ENDPOINTS.archive)}/${encodeURIComponent(id!)}/archive`;
    }
    return `${webhookBase}${webhookPathSuffix(RH_CHAT_ENDPOINTS[route])}`;
}
