import { isAxiosError } from "axios";
import {
    getTalentNotificationMarkReadPatchUrl,
    TALENT_NOTIFICATIONS_BASE_PATH,
    TALENT_NOTIFICATIONS_READ_ALL_PATH,
} from "@/config/talent-notifications-api.config";
import { httpClient } from "@/lib/http-client";
import {
    normalizeTalentNotificationsList,
    normalizeTalentNotificationsSummary,
} from "@/lib/talent-notifications-normalize";
import type { TalentNotification, TalentNotificationsSummary } from "@/types/talent-notifications";
import type { ApiClientOptions } from "@/utils/apiClient";
import { apiGet } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export class TalentNotificationsApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus = 0) {
        super(message);
        this.name = "TalentNotificationsApiError";
        this.httpStatus = httpStatus;
    }
}

function readErrorMessage(err: unknown, fallback: string): never {
    if (isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const root = unwrapN8nRoot(err.response?.data);
        const message = String(root.message ?? root.error ?? fallback);
        throw new TalentNotificationsApiError(message, status);
    }
    if (err instanceof TalentNotificationsApiError) throw err;
    throw new TalentNotificationsApiError(err instanceof Error ? err.message : fallback);
}

export const talentNotificationsApi = {
    list: async (unreadOnly = false, limit = 30, options?: ApiClientOptions): Promise<TalentNotification[]> => {
        try {
            const { data } = await httpClient.get<unknown>(TALENT_NOTIFICATIONS_BASE_PATH, {
                params: {
                    unread_only: unreadOnly ? "true" : "false",
                    limit,
                },
                signal: options?.signal,
            });
            return normalizeTalentNotificationsList(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger les notifications.");
        }
    },

    summary: async (options?: ApiClientOptions): Promise<TalentNotificationsSummary> => {
        try {
            const { data } = await httpClient.get<unknown>(`${TALENT_NOTIFICATIONS_BASE_PATH}/summary`, {
                signal: options?.signal,
            });
            return normalizeTalentNotificationsSummary(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le résumé des notifications.");
        }
    },

    markRead: async (id: string): Promise<unknown> => {
        try {
            const { data } = await httpClient.patch<unknown>(getTalentNotificationMarkReadPatchUrl(id), {});
            return unwrapN8nRoot(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de marquer la notification comme lue.");
        }
    },

    markAllRead: async (): Promise<unknown> => {
        try {
            const { data } = await httpClient.patch<unknown>(TALENT_NOTIFICATIONS_READ_ALL_PATH, {});
            return unwrapN8nRoot(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de marquer toutes les notifications comme lues.");
        }
    },
};

/** @deprecated Utiliser `talentNotificationsApi.list` — conservé pour compat legacy. */
export async function fetchTalentNotifications(options?: ApiClientOptions): Promise<unknown> {
    const fromEnv = (import.meta.env as Record<string, string | undefined>).VITE_TALENT_NOTIFICATIONS_URL?.trim();
    if (fromEnv) return apiGet<unknown>(fromEnv, options);
    const items = await talentNotificationsApi.list(false, 30, options);
    return { items };
}
