import { Briefcase01, User01 } from "@untitledui/icons";
import { formatConversationTimeAgo } from "@/components/copilot/helper-chat-reply-cache";
import { IntentBadge } from "./IntentBadge";
import type { RhConversationSummary } from "@/api/rh-copilot.types";
import { cx } from "@/utils/cx";

interface Props {
    conversation: RhConversationSummary;
    isActive: boolean;
    onClick: () => void;
}

export function RhConversationItem({ conversation, isActive, onClick }: Props) {
    const c = conversation;
    const previewText = c.last_message_preview ?? "Aucun message";
    const rolePrefix = c.last_message_role === "user" ? "Vous : " : "";

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
                <h3 className="flex-1 truncate text-sm font-medium text-primary">{c.title}</h3>
                {c.message_count > 0 ? (
                    <span className="text-[10px] tabular-nums text-fg-quaternary">{c.message_count}</span>
                ) : null}
            </div>

            {c.last_intent ? <IntentBadge intent={c.last_intent} /> : null}

            {c.project_name ? (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-fg-tertiary">
                    <Briefcase01 className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{c.project_name}</span>
                </div>
            ) : null}

            {c.scope === "manager" && c.manager_name ? (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-fg-tertiary">
                    <User01 className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{c.manager_name}</span>
                </div>
            ) : null}

            <p className="mt-1 truncate text-xs text-fg-tertiary">
                {rolePrefix}
                {previewText}
            </p>

            <div className="mt-1 flex items-center justify-between">
                {c.last_message_at ? (
                    <span className="text-[10px] text-fg-quaternary">{formatConversationTimeAgo(c.last_message_at)}</span>
                ) : null}
                {c.avg_confidence != null ? (
                    <span className="text-[10px] text-fg-quaternary">
                        Conf. moy. {Math.round(c.avg_confidence * 100)}%
                    </span>
                ) : null}
            </div>
        </button>
    );
}
