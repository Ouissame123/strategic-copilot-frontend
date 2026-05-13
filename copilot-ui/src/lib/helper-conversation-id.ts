/** UUID v4 (utilisé pour valider `conversation_id` / `project_id` côté client). */
export const HELPER_CHAT_UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isHelperChatUuid(value: string | null | undefined): boolean {
    const v = String(value ?? "").trim();
    return v.length > 0 && HELPER_CHAT_UUID_RE.test(v);
}

/** UUID canonique (minuscules) pour URL n8n / comparaisons avec Postgres. */
export function normalizeHelperConversationId(id: string): string {
    return String(id ?? "").trim().toLowerCase();
}
