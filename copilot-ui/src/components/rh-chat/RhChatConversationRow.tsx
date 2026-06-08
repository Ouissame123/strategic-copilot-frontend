import { memo } from "react";
import type { RhChatConversationListItem } from "@/types/rh-chat";
import {
    formatRhChatRelativeTime,
    generateConversationTitle,
    inferIntentFromText,
    intentToneClasses,
} from "@/components/rh-chat/rh-chat-ui.utils";
import { cx } from "@/utils/cx";

type RhChatConversationRowProps = {
    conversation: RhChatConversationListItem;
    active: boolean;
    onSelect: () => void;
};

export const RhChatConversationRow = memo(function RhChatConversationRow({
    conversation,
    active,
    onSelect,
}: RhChatConversationRowProps) {
    const archived = conversation.status === "archived";
    const title = generateConversationTitle(conversation);
    const preview = conversation.last_message_preview?.trim() || "Aucun aperçu disponible";
    const intent = inferIntentFromText(`${title} ${preview}`);
    const IntentIcon = intent.icon;
    const msgCount = conversation.message_count;

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cx(
                "group w-full rounded-2xl border px-3 py-3 text-left transition duration-200",
                active
                    ? "border-violet-400 bg-gradient-to-r from-violet-50 to-indigo-50 shadow-sm ring-1 ring-violet-300/80 dark:border-violet-700 dark:from-violet-950/50 dark:to-indigo-950/30 dark:ring-violet-800"
                    : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm dark:bg-transparent dark:hover:border-slate-700 dark:hover:bg-slate-800/60",
                archived && "opacity-75",
            )}
        >
            <div className="flex items-start gap-3">
                <div
                    className={cx(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
                        intentToneClasses(intent.tone),
                    )}
                >
                    <IntentIcon className="size-4" aria-hidden />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                        <span
                            className={cx(
                                "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                archived
                                    ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
                            )}
                        >
                            {archived ? "Archivée" : "Active"}
                        </span>
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {preview}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                            className={cx(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                                intentToneClasses(intent.tone),
                            )}
                        >
                            {intent.label}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {formatRhChatRelativeTime(conversation.last_message_at)}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            · {msgCount} msg{msgCount > 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
});
