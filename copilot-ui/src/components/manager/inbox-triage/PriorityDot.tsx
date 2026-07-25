import { cx } from "@/utils/cx";
import { avatarToneClass, initialsFromName, priorityDotClass, priorityLabelFr } from "./triage-ui";

type PriorityDotProps = {
    priority: string;
    showLabel?: boolean;
    className?: string;
};

export function PriorityDot({ priority, showLabel = true, className }: PriorityDotProps) {
    const label = priorityLabelFr(priority);
    return (
        <span className={cx("inline-flex items-center gap-1.5 text-xs text-secondary", className)}>
            <span
                className={cx("size-2 shrink-0 rounded-full", priorityDotClass(priority))}
                aria-hidden
            />
            {showLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
        </span>
    );
}

type InitialsAvatarProps = {
    name: string;
    className?: string;
};

export function InitialsAvatar({ name, className }: InitialsAvatarProps) {
    const label = name.trim() || "?";
    return (
        <span
            className={cx(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                avatarToneClass(label),
                className,
            )}
            aria-hidden
        >
            {initialsFromName(label)}
        </span>
    );
}
