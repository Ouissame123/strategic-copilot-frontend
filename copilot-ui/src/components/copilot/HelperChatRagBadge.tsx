import { isHelperChatRagV2Enabled } from "@/lib/helper-chat-config";
import { cx } from "@/utils/cx";

type HelperChatRagBadgeProps = {
    className?: string;
};

export function HelperChatRagBadge({ className }: HelperChatRagBadgeProps) {
    if (!isHelperChatRagV2Enabled()) return null;

    return (
        <span
            title="Chatbot avec récupération de données et citations vérifiées."
            tabIndex={0}
            className={cx(
                "inline-flex shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-700",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                "dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
                className,
            )}
        >
            RAG
        </span>
    );
}
