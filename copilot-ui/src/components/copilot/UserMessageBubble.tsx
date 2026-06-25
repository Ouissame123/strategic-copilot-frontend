import { User01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

type UserMessageBubbleProps = {
    content: string;
    compact?: boolean;
};

export function UserMessageBubble({ content, compact = false }: UserMessageBubbleProps) {
    return (
        <div className="flex justify-end gap-2 sm:gap-2.5">
            <div
                className={cx(
                    "max-w-[80%] rounded-lg bg-gradient-to-br from-brand-solid to-brand-secondary px-3 py-2 text-white shadow-sm",
                    compact && "max-w-[88%] px-2.5 py-1.5 text-xs",
                )}
            >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
            </div>
            <div
                className={cx(
                    "flex shrink-0 items-center justify-center rounded-full bg-secondary_subtle ring-1 ring-secondary/50",
                    compact ? "size-7" : "size-8",
                )}
                aria-hidden
            >
                <User01 className={cx("text-fg-tertiary", compact ? "size-3.5" : "size-4")} />
            </div>
        </div>
    );
}
