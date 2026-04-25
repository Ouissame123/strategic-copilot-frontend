/**
 * Notifications talent — GET dédié optionnel (sinon tableau vide).
 */
import type { ApiClientOptions } from "@/utils/apiClient";
import { apiGet } from "@/utils/apiClient";

function getPath(): string | null {
    const fromEnv = (import.meta.env as Record<string, string | undefined>).VITE_TALENT_NOTIFICATIONS_URL?.trim();
    if (fromEnv) return fromEnv;
    return null;
}

export async function fetchTalentNotifications(options?: ApiClientOptions): Promise<unknown> {
    const path = getPath();
    if (!path) return { items: [] };
    return apiGet<unknown>(path, options);
}
