import { Bot, Loader2, Sparkles, UserRound } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import type { RhChatMessage } from "@/types/rh-chat";
import { RhChatWelcomeScreen } from "@/components/rh-chat/RhChatWelcomeScreen";
import {
    confidenceBadgeClasses,
    confidenceBadgeTone,
    formatConfidenceShort,
} from "@/components/rh-chat/rh-chat-ui.utils";
import { formatConfidencePct, formatRhChatTime } from "@/services/rh-chat";
import { cx } from "@/utils/cx";

type RhChatMessageListProps = {
    messages: RhChatMessage[];
    loading?: boolean;
    sending?: boolean;
    showWelcome?: boolean;
    enterpriseId?: string;
    onWelcomeQuestion?: (question: string) => void;
    onQuickReply?: (text: string) => void;
};

const MessageBubble = memo(function MessageBubble({
    message,
    onQuickReply,
}: {
    message: RhChatMessage;
    onQuickReply?: (text: string) => void;
}) {
    const isAssistant = message.role === "assistant";
    const confLabel = isAssistant ? formatConfidencePct(message.confidence) : null;
    const confTone = isAssistant ? confidenceBadgeTone(message.confidence) : null;

    return (
        <div
            className={cx(
                "flex gap-3 duration-300 animate-in fade-in slide-in-from-bottom-2",
                isAssistant ? "justify-start" : "justify-end",
            )}
        >
            {isAssistant ? (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 ring-2 ring-white dark:ring-slate-900">
                    <Bot className="size-4" strokeWidth={2} aria-hidden />
                </div>
            ) : null}

            <div
                className={cx(
                    "max-w-[min(100%,580px)] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    isAssistant
                        ? "rounded-tl-md border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        : "rounded-tr-md border border-violet-500/20 bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25",
                )}
            >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <div
                    className={cx(
                        "mt-2 flex flex-wrap items-center gap-2 text-[10px]",
                        isAssistant ? "text-slate-500 dark:text-slate-400" : "text-violet-100/90",
                    )}
                >
                    <span>{formatRhChatTime(message.created_at)}</span>
                    {confLabel && confTone ? (
                        <span
                            className={cx(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                                confidenceBadgeClasses(confTone),
                            )}
                        >
                            Confiance {formatConfidenceShort(message.confidence)}
                        </span>
                    ) : null}
                </div>
                {isAssistant && message.quick_replies?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {message.quick_replies.map((q) => (
                            <button
                                key={q}
                                type="button"
                                onClick={() => onQuickReply?.(q)}
                                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-800 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>

            {!isAssistant ? (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 shadow-sm ring-2 ring-white dark:from-slate-700 dark:to-slate-800 dark:text-slate-200 dark:ring-slate-900">
                    <UserRound className="size-4" aria-hidden />
                </div>
            ) : null}
        </div>
    );
});

export const RhChatMessageList = memo(function RhChatMessageList({
    messages,
    loading,
    sending,
    showWelcome,
    enterpriseId,
    onWelcomeQuestion,
    onQuickReply,
}: RhChatMessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [messages.length, sending]);

    if (showWelcome && messages.length === 0 && !loading) {
        return (
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                <RhChatWelcomeScreen enterpriseId={enterpriseId} onSelectQuestion={(q) => onWelcomeQuestion?.(q)} />
            </div>
        );
    }

    return (
        <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/90 px-4 py-5 sm:px-6 dark:bg-slate-950/40"
        >
            {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                    <Loader2 className="size-5 animate-spin text-violet-600" aria-hidden />
                    Chargement des messages…
                </div>
            ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-8 py-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg">
                        <Sparkles className="size-6" aria-hidden />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
                        Démarrez la conversation
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                        Posez votre première question RH — l&apos;assistant analysera vos données en temps réel.
                    </p>
                </div>
            ) : (
                messages.map((m) => <MessageBubble key={m.id} message={m} onQuickReply={onQuickReply} />)
            )}
            {sending ? (
                <div className="flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-700 shadow-sm dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    L&apos;assistant réfléchit…
                </div>
            ) : null}
        </div>
    );
});
