import { readEnv, trimUrl } from "@/config/resolve-api-url";

/** Collection notifications talent — liste, summary, read-all. */
export const TALENT_NOTIFICATIONS_BASE_PATH = "/webhook/talent/notifications";

export const TALENT_NOTIFICATIONS_READ_ALL_PATH = `${TALENT_NOTIFICATIONS_BASE_PATH}/read-all`;

/**
 * PATCH marquer une notification comme lue.
 *
 * Défaut : `/webhook/wf-talent-notif-read-v1/talent/notifications/{id}/read`
 *
 * Surcharges :
 * - `VITE_TALENT_NOTIFICATIONS_READ_URL` : modèle avec `:id` ou chemin + id en suffixe
 * - `VITE_TALENT_NOTIFICATIONS_READ_PREFIX` : préfixe avant `/{id}/read` (sans slash final)
 */
export function getTalentNotificationMarkReadPatchUrl(notificationId: string): string {
    const id = String(notificationId ?? "").trim();
    if (!id) throw new Error("Missing notification id");
    const lower = id.toLowerCase();
    if (lower === ":id" || lower === ":notificationid") throw new Error("Invalid notification id placeholder");
    const enc = encodeURIComponent(id);
    const readSuffix = "/read";

    const explicit = readEnv("VITE_TALENT_NOTIFICATIONS_READ_URL");
    if (explicit) {
        if (/^https?:\/\//i.test(explicit)) {
            if (explicit.includes(":id") || explicit.includes(":notificationId")) {
                return explicit.split(":notificationId").join(enc).split(":id").join(enc);
            }
            return `${explicit.replace(/\/$/, "")}/${enc}${readSuffix}`;
        }
        const rel =
            explicit.includes(":id") || explicit.includes(":notificationId")
                ? explicit.split(":notificationId").join(enc).split(":id").join(enc)
                : `${explicit.replace(/\/$/, "")}/${enc}${readSuffix}`;
        return rel.startsWith("/") ? rel : `/${rel}`;
    }

    const prefix = readEnv("VITE_TALENT_NOTIFICATIONS_READ_PREFIX")?.trim().replace(/\/$/, "");
    if (prefix) return `${prefix}/${enc}${readSuffix}`;

    const apiBase = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (apiBase) return `${apiBase}/wf-talent-notif-read-v1/talent/notifications/${enc}${readSuffix}`;
    return `/webhook/wf-talent-notif-read-v1/talent/notifications/${enc}${readSuffix}`;
}
