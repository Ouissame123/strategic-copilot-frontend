import { Bot, Wifi, WifiOff } from "lucide-react";
import { memo } from "react";
import type { RhChatMessage } from "@/types/rh-chat";
import { RhChatComposer } from "@/components/rh-chat/RhChatComposer";
import { RhChatMessageList } from "@/components/rh-chat/RhChatMessageList";
import { cx } from "@/utils/cx";

type RhChatMainPanelProps = {
    messages: RhChatMessage[];
    input: string;
    loadingMessages?: boolean;
    sending?: boolean;
    connected?: boolean;
    showWelcome?: boolean;
    enterpriseId?: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onQuickReply: (text: string) => void;
    onWelcomeQuestion: (question: string) => void;
};

export const RhChatMainPanel = memo(function RhChatMainPanel({
    messages,
    input,
    loadingMessages,
    sending,
    connected = true,
    showWelcome,
    enterpriseId,
    onInputChange,
    onSend,
    onQuickReply,
    onWelcomeQuestion,
}: RhChatMainPanelProps) {
    return (
        <section
            className={cx(
                "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900",
            )}
        >
            <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
                            <Bot className="size-5" aria-hidden />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                Assistant RH IA
                            </h1>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                WF_RH_Chat · WF_RH_Conversations
                            </p>
                        </div>
                    </div>
                    <span
                        className={cx(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide",
                            connected
                                ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900"
                                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300",
                        )}
                    >
                        {connected ? <Wifi className="size-3" aria-hidden /> : <WifiOff className="size-3" aria-hidden />}
                        {connected ? "Connecté" : "Hors ligne"}
                    </span>
                </div>
            </header>

            <RhChatMessageList
                messages={messages}
                loading={loadingMessages}
                sending={sending}
                showWelcome={showWelcome}
                enterpriseId={enterpriseId}
                onWelcomeQuestion={onWelcomeQuestion}
                onQuickReply={onQuickReply}
            />

            <RhChatComposer
                value={input}
                disabled={!connected}
                sending={sending}
                onChange={onInputChange}
                onSend={onSend}
            />
        </section>
    );
});
