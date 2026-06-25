import { Briefcase01 } from "@untitledui/icons";
import { formatConversationTimeAgo } from "@/components/copilot/helper-chat-reply-cache";
import type { ConversationSummary } from "@/api/manager-copilot.types";
import { cx } from "@/utils/cx";

interface Props {
    conversation: ConversationSummary;
    isActive: boolean;
    onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: Props) {
    const previewText = conversation.last_message_preview ?? "Aucun message";
    const rolePrefix = conversation.last_message_role === "user" ? "Vous : " : "";

    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                isActive
                    ? "border-violet-300 bg-violet-100 dark:border-violet-700 dark:bg-violet-950/40"
                    : "border-transparent hover:bg-secondary_subtle",
            )}
        >
            <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="flex-1 truncate text-sm font-medium text-primary">{conversation.title}</h3>
                {conversation.message_count > 0 ? (
                    <span className="text-[10px] tabular-nums text-fg-quaternary">{conversation.message_count}</span>
                ) : null}
            </div>

            {conversation.project_name ? (
                <div className="mb-1 flex items-center gap-1 text-[11px] text-fg-tertiary">
                    <Briefcase01 className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{conversation.project_name}</span>
                </div>
            ) : null}

            <p className="truncate text-xs text-fg-tertiary">
                {rolePrefix}
                {previewText}
            </p>

            {conversation.last_message_at ? (
                <p className="mt-1 text-[10px] text-fg-quaternary">
                    {formatConversationTimeAgo(conversation.last_message_at)}
                </p>
            ) : null}
        </button>
    );
}
