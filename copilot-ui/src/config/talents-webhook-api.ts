/**
 * Liste talents enrichie (workflow n8n) — GET JSON `{ status, items, total }`.
 * Défaut relatif : `/webhook/api/talents` (proxy Vite → n8n si configuré).
 */

export function getTalentsWebhookListUrl(): string {
    const explicit = (import.meta.env.VITE_TALENTS_WEBHOOK_URL as string | undefined)?.trim();
    if (explicit) return explicit.replace(/\/$/, "");
    return "/webhook/api/talents";
}
