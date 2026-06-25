import { NotificationCard } from "@/components/rh/notifications/NotificationCard";
import { InboxGroupHeader } from "@/components/rh/inbox/InboxGroupHeader";
import type { RhNotification } from "@/types/rh-notifications.types";

type NotifTimeBucket = "today" | "yesterday" | "week" | "older";

const BUCKET_ORDER: NotifTimeBucket[] = ["today", "yesterday", "week", "older"];

const BUCKET_LABELS: Record<NotifTimeBucket, string> = {
    today: "Aujourd'hui",
    yesterday: "Hier",
    week: "7 derniers jours",
    older: "Plus ancien",
};

function bucketOf(createdAt: string): NotifTimeBucket {
    const t = new Date(createdAt).getTime();
    if (!Number.isFinite(t)) return "older";
    const ageHours = (Date.now() - t) / 3_600_000;
    if (ageHours < 24) return "today";
    if (ageHours < 48) return "yesterday";
    if (ageHours < 24 * 7) return "week";
    return "older";
}

function groupByBucket(items: RhNotification[]): Record<NotifTimeBucket, RhNotification[]> {
    const groups: Record<NotifTimeBucket, RhNotification[]> = {
        today: [],
        yesterday: [],
        week: [],
        older: [],
    };
    for (const n of items) {
        groups[bucketOf(n.created_at)].push(n);
    }
    return groups;
}

type NotificationsListProps = {
    items: RhNotification[];
    selectedIds: Set<string>;
    onSelect: (n: RhNotification) => void;
    onBulkToggle: (id: string) => void;
};

export function NotificationsList({ items, selectedIds, onSelect, onBulkToggle }: NotificationsListProps) {
    const grouped = groupByBucket(items);

    return (
        <div className="space-y-4">
            {BUCKET_ORDER.map((bucket) => {
                const list = grouped[bucket];
                if (list.length === 0) return null;
                return (
                    <section key={bucket}>
                        <InboxGroupHeader label={BUCKET_LABELS[bucket]} count={list.length} highlight={bucket === "today"} />
                        <div className="space-y-1.5">
                            {list.map((n) => (
                                <NotificationCard
                                    key={n.id}
                                    notification={n}
                                    onSelect={onSelect}
                                    onBulkToggle={onBulkToggle}
                                    isBulkSelected={selectedIds.has(n.id)}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
