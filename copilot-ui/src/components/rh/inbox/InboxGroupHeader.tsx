import { cx } from "@/utils/cx";

type InboxGroupHeaderProps = {
    label: string;
    count: number;
    highlight?: boolean;
};

export function InboxGroupHeader({ label, count, highlight }: InboxGroupHeaderProps) {
    return (
        <h3
            className={cx(
                "mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest",
                highlight ? "text-red-600 dark:text-red-400" : "text-ws-muted",
            )}
        >
            <span>{label}</span>
            <span className="font-normal text-ws-faint">· {count}</span>
        </h3>
    );
}
