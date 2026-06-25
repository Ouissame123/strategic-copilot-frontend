import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw01, Stars01, Trash01, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { RhConversationsSidebar } from "./RhConversationsSidebar";
import { RhAssistantMessage } from "./RhAssistantMessage";
import { RhChatInputBox } from "./RhChatInputBox";
import {
    useRhCopilotArchiveConversation,
    useRhCopilotConversationDetail,
    useRhCopilotSendMessage,
} from "@/hooks/use-rh-copilot";
import type { SendRhMessageResponse } from "@/api/rh-copilot.types";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";

const STARTER_QUESTIONS = [
    "État des projets ?",
    "Quels talents sont en surcharge ?",
    "Quels contrats expirent bientôt ?",
    "Demandes RH en attente ?",
    "Options d'arbitrage disponibles ?",
] as const;

export interface RhCopilotPanelProps {
    onClose?: () => void;
    embedded?: boolean;
}

export function RhCopilotPanel({ onClose, embedded = false }: RhCopilotPanelProps) {
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [lastResponse, setLastResponse] = useState<SendRhMessageResponse | null>(null);
    const [pendingUserText, setPendingUserText] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const detail = useRhCopilotConversationDetail(conversationId);
    const send = useRhCopilotSendMessage(conversationId);
    const archive = useRhCopilotArchiveConversation();
    const { push: toast } = useToast();

    const conversation = detail.data?.conversation;
    const messages = detail.data?.messages ?? [];
    const isArchived = conversation?.status === "archived";

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, send.isPending, lastResponse, pendingUserText]);

    const handleSend = useCallback(
        (message: string) => {
            setPendingUserText(message);
            setLastResponse(null);
            send.mutate(
                { message, conversation_id: conversationId },
                {
                    onSuccess: (data) => {
                        setLastResponse(data);
                        setPendingUserText(null);
                        if (!conversationId && data.conversation_id) {
                            setConversationId(data.conversation_id);
                        }
                    },
                    onError: (err) => {
                        setPendingUserText(null);
                        toast(`Erreur RH : ${err.message}`, "error");
                    },
                },
            );
        },
        [conversationId, send, toast],
    );

    const handleSelectConversation = (id: string | null) => {
        setConversationId(id ?? undefined);
        setLastResponse(null);
        setPendingUserText(null);
    };

    const handleArchive = () => {
        if (!conversationId) return;
        archive.mutate(
            { id: conversationId, restore: isArchived },
            {
                onSuccess: () => {
                    if (!isArchived) {
                        setConversationId(undefined);
                        setLastResponse(null);
                    }
                },
            },
        );
    };

    const showFreshResponse =
        lastResponse &&
        !messages.some((m) => m.role === "assistant" && m.content === lastResponse.reply && m.id);

    const isEmpty = !detail.isLoading && messages.length === 0 && !lastResponse && !pendingUserText;

    return (
        <aside
            className={cx(
                "flex h-full w-full bg-primary",
                embedded ? "min-h-0" : "max-w-[1000px] border-l shadow-xl",
            )}
        >
            {!embedded ? (
                <RhConversationsSidebar
                    selectedConversationId={conversationId}
                    onSelectConversation={handleSelectConversation}
                />
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-secondary px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                            <Stars01 className="size-4 text-white" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-primary">
                                {conversation?.title ?? "Assistant RH IA"}
                            </h2>
                            <p className="text-xs text-fg-tertiary">Senior Partner · 6 agents IA</p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                        <span className="hidden rounded-full border border-violet-300 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 sm:inline-flex dark:border-violet-700 dark:text-violet-200">
                            AI · 6 AGENTS
                        </span>

                        {conversationId ? (
                            <Button
                                type="button"
                                color="tertiary"
                                size="sm"
                                iconLeading={isArchived ? RefreshCw01 : Trash01}
                                aria-label={isArchived ? "Restaurer la conversation" : "Archiver la conversation"}
                                onClick={handleArchive}
                            />
                        ) : null}

                        {onClose ? (
                            <Button
                                type="button"
                                color="tertiary"
                                size="sm"
                                iconLeading={XClose}
                                aria-label="Fermer l'assistant RH"
                                onClick={onClose}
                            />
                        ) : null}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-4xl space-y-4 p-4">
                        {isEmpty ? (
                            <div className="py-12 text-center">
                                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                                    <Stars01 className="size-7 text-white" aria-hidden />
                                </div>
                                <h3 className="text-lg font-semibold text-primary">Assistant RH IA Senior</h3>
                                <p className="mx-auto mt-1 mb-2 max-w-md text-sm text-fg-tertiary">
                                    Powered by 6 agents IA spécialisés (Observer, Watchdog, Strategist, Matchmaker,
                                    Analyst, Helper).
                                </p>
                                <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
                                    {STARTER_QUESTIONS.map((q) => (
                                        <button
                                            key={q}
                                            type="button"
                                            onClick={() => handleSend(q)}
                                            className="rounded-md border border-secondary bg-secondary_subtle px-3 py-1.5 text-xs transition-colors hover:bg-secondary"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {messages.map((msg) =>
                            msg.role === "user" ? (
                                <div key={msg.id} className="flex justify-end gap-2.5">
                                    <div className="max-w-[80%] rounded-lg bg-violet-600 px-3 py-2 text-white">
                                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                    </div>
                                </div>
                            ) : (
                                <RhAssistantMessage
                                    key={msg.id}
                                    message={msg}
                                    onQuickReply={handleSend}
                                    disabled={isArchived || send.isPending}
                                />
                            ),
                        )}

                        {pendingUserText ? (
                            <div className="flex justify-end gap-2.5">
                                <div className="max-w-[80%] rounded-lg bg-violet-600 px-3 py-2 text-white">
                                    <p className="whitespace-pre-wrap text-sm">{pendingUserText}</p>
                                </div>
                            </div>
                        ) : null}

                        {showFreshResponse ? (
                            <RhAssistantMessage
                                freshResponse={lastResponse}
                                onQuickReply={handleSend}
                                disabled={isArchived || send.isPending}
                            />
                        ) : null}

                        {send.isPending ? (
                            <div className="flex gap-2.5">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                                    <Stars01 className="size-4 animate-pulse text-white" aria-hidden />
                                </div>
                                <div className="flex items-center gap-1.5 rounded-lg border border-secondary bg-primary px-3 py-2">
                                    <div className="size-1.5 animate-bounce rounded-full bg-violet-500" />
                                    <div
                                        className="size-1.5 animate-bounce rounded-full bg-violet-500"
                                        style={{ animationDelay: "0.15s" }}
                                    />
                                    <div
                                        className="size-1.5 animate-bounce rounded-full bg-violet-500"
                                        style={{ animationDelay: "0.3s" }}
                                    />
                                </div>
                            </div>
                        ) : null}

                        <div ref={bottomRef} aria-hidden />
                    </div>
                </div>

                <RhChatInputBox
                    onSend={handleSend}
                    isLoading={send.isPending}
                    disabled={isArchived}
                    placeholder={
                        isArchived
                            ? "Conversation archivée — restaure-la pour répondre"
                            : "Pose ta question RH…"
                    }
                />
            </div>
        </aside>
    );
}
