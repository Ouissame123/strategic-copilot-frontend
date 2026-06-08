import { useQuery } from "@tanstack/react-query";
import { fetchTalentNotifications } from "@/api/talent-notifications.api";
import { fetchTalentWorkspace } from "@/api/talent-workspace.api";
import { queryKeys } from "@/lib/query-keys";
import { notificationsFromRoot } from "@/utils/talent-workspace-display";
import { unwrapDataPayload } from "@/utils/unwrap-api-payload";

function parseNotificationRows(raw: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(raw)) return raw.map((x) => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {}));
    const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const items = r.items ?? r.data ?? r.notifications;
    if (Array.isArray(items)) return items.map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}));
    return [];
}

const POLL_MS = 30_000;

const hasDedicatedUrl = () => Boolean((import.meta.env as Record<string, string | undefined>).VITE_TALENT_NOTIFICATIONS_URL?.trim());

/**
 * Liste notifications : GET dédié si `VITE_TALENT_NOTIFICATIONS_URL`, sinon extraction du workspace.
 */
export function useTalentNotificationsQuery() {
    const dedicated = hasDedicatedUrl();

    return useQuery({
        queryKey: [...queryKeys.talent.notifications(), dedicated ? "api" : "workspace"],
        queryFn: async ({ signal }) => {
            if (dedicated) {
                const raw = await fetchTalentNotifications({ signal });
                return parseNotificationRows(raw);
            }
            const raw = await fetchTalentWorkspace({ signal });
            return notificationsFromRoot(unwrapDataPayload(raw));
        },
        refetchInterval: POLL_MS,
    });
}
