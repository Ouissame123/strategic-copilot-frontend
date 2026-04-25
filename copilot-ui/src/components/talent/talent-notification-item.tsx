import { cx } from "@/utils/cx";

type TalentNotificationItemProps = {
    title: string;
    body?: string;
    time?: string;
    status?: string;
    unread?: boolean;
};

export function TalentNotificationItem({ title, body, time, status, unread }: TalentNotificationItemProps) {
    return (
        <article className={cx("rounded-xl border border-secondary p-4", unread ? "bg-brand-secondary/5" : "bg-primary")}>
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-primary">{title}</p>
                <span className="text-xs text-tertiary">{status || "N/A"}</span>
            </div>
            {body ? <p className="mt-1 text-sm text-secondary">{body}</p> : null}
            {time ? <p className="mt-2 text-xs text-tertiary">{time}</p> : null}
        </article>
    );
}

