import { cx } from "@/utils/cx";

type PriorityPillProps = {
    priority: string;
    className?: string;
};

const PRIORITY_LABEL: Record<string, string> = {
    urgent: "URGENT",
    high: "HAUTE",
    normal: "NORMALE",
    medium: "MOYENNE",
    low: "BASSE",
};

const PRIORITY_CLS: Record<string, string> = {
    urgent: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200",
    high: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-200",
};

export function PriorityPill({ priority, className }: PriorityPillProps) {
    const p = priority.toLowerCase();
    if (p !== "urgent" && p !== "high") return null;
    return (
        <span
            className={cx(
                "rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                PRIORITY_CLS[p],
                className,
            )}
        >
            {PRIORITY_LABEL[p] ?? p}
        </span>
    );
}

export const PRIORITY_BORDER_CLS: Record<string, string> = {
    urgent: "bg-inbox-priority-urgent",
    high: "bg-inbox-priority-high",
    normal: "bg-inbox-priority-normal",
    medium: "bg-inbox-priority-normal",
    low: "bg-inbox-priority-low",
};

export function PriorityBorder({ priority }: { priority: string }) {
    const p = priority.toLowerCase();
    return (
        <div
            className={cx("absolute top-0 bottom-0 left-0 w-[3px]", PRIORITY_BORDER_CLS[p] ?? "bg-transparent")}
            aria-hidden
        />
    );
}
