import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Plus, Send, Trash2, X } from "lucide-react";
import {
    clearTalentChatSessionId,
    persistTalentChatSessionId,
    readTalentChatSessionId,
    TALENT_CHAT_SUGGESTIONS,
} from "@/components/talent/helper/talent-chat-ui";
import {
    useTalentChatCreateSession,
    useTalentChatDeleteSession,
    useTalentChatSendMessage,
    useTalentChatSession,
    useTalentChatSessions,
} from "@/hooks/useTalentChat";
import type { ChatMessage } from "@/types/talent-chat";
import { cx } from "@/utils/cx";

function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === "user";

    return (
        <div className={cx("flex", isUser ? "justify-end" : "justify-start")}>
            <div
                className={cx(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                    isUser
                        ? "rounded-br-sm bg-gradient-to-br from-violet-600 to-violet-700 text-white"
                        : "rounded-bl-sm border border-secondary bg-primary text-primary",
                )}
            >
                {message.content}
            </div>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="flex justify-start" aria-live="polite" aria-label="Helper réfléchit">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-secondary bg-primary px-3 py-2">
                <span className="text-xs text-tertiary">Helper réfléchit</span>
                <span className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                        <span
                            key={delay}
                            className="size-1.5 animate-bounce rounded-full bg-tertiary"
                            style={{ animationDelay: `${delay}ms` }}
                        />
                    ))}
                </span>
            </div>
        </div>
    );
}

function ChatEmptyState({ onPickSuggestion }: { onPickSuggestion: (text: string) => void }) {
    return (
        <div className="px-4 py-8 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-950/50 dark:to-blue-950/40">
                <MessageCircle className="size-5 text-violet-600 dark:text-violet-300" aria-hidden />
            </div>
            <p className="text-sm font-medium text-primary">Bonjour !</p>
            <p className="mt-1 mb-4 text-xs text-tertiary">Je suis ton assistant carrière. Voici des suggestions :</p>
            <div className="space-y-1.5">
                {TALENT_CHAT_SUGGESTIONS.map((suggestion) => (
                    <button
                        key={suggestion}
                        type="button"
                        onClick={() => onPickSuggestion(suggestion)}
                        className="block w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-left text-xs text-secondary transition hover:border-violet-300 hover:bg-violet-50 dark:hover:border-violet-800 dark:hover:bg-violet-950/30"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function TalentHelperFloating() {
    const [open, setOpen] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => readTalentChatSessionId());
    const [input, setInput] = useState("");
    const [showSessions, setShowSessions] = useState(false);
    const [pendingUserText, setPendingUserText] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const sessionsQuery = useTalentChatSessions(open);
    const sessionQuery = useTalentChatSession(currentSessionId, open);
    const sendMessage = useTalentChatSendMessage();
    const createSession = useTalentChatCreateSession();
    const deleteSession = useTalentChatDeleteSession();

    const messages = sessionQuery.data?.messages ?? [];
    const displayMessages: ChatMessage[] =
        pendingUserText && !messages.some((m) => m.role === "user" && m.content === pendingUserText)
            ? [
                  ...messages,
                  {
                      id: "__pending_user__",
                      role: "user",
                      content: pendingUserText,
                      created_at: new Date().toISOString(),
                  },
              ]
            : messages;

    const isBusy = sendMessage.isPending || createSession.isPending;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayMessages.length, sendMessage.isPending, open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    useEffect(() => {
        if (sessionQuery.isError && currentSessionId) {
            setCurrentSessionId(null);
            clearTalentChatSessionId();
        }
    }, [sessionQuery.isError, currentSessionId]);

    const handlePickSuggestion = useCallback((text: string) => {
        setInput(text);
        inputRef.current?.focus();
    }, []);

    const handleSend = useCallback(async () => {
        const msg = input.trim();
        if (!msg || isBusy) return;

        let sid = currentSessionId;
        if (!sid) {
            const session = await createSession.mutateAsync(undefined);
            sid = session.id;
            setCurrentSessionId(sid);
            persistTalentChatSessionId(sid);
        }

        setInput("");
        setPendingUserText(msg);
        sendMessage.mutate(
            { sessionId: sid, message: msg },
            {
                onSuccess: () => setPendingUserText(null),
                onError: () => setPendingUserText(null),
            },
        );
    }, [input, isBusy, currentSessionId, createSession, sendMessage]);

    const handleNewSession = useCallback(async () => {
        const session = await createSession.mutateAsync(undefined);
        setCurrentSessionId(session.id);
        persistTalentChatSessionId(session.id);
        setShowSessions(false);
        setPendingUserText(null);
        setInput("");
    }, [createSession]);

    const handleSwitchSession = useCallback((id: string) => {
        setCurrentSessionId(id);
        persistTalentChatSessionId(id);
        setShowSessions(false);
        setPendingUserText(null);
    }, []);

    const handleDeleteSession = useCallback(
        async (id: string) => {
            await deleteSession.mutateAsync(id);
            if (id === currentSessionId) {
                setCurrentSessionId(null);
                clearTalentChatSessionId();
                setPendingUserText(null);
            }
        },
        [deleteSession, currentSessionId],
    );

    const showEmpty = !currentSessionId || (displayMessages.length === 0 && !sendMessage.isPending);

    return (
        <>
            {!open ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Ouvrir Helper IA"
                    className={cx(
                        "fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full shadow-lg shadow-violet-500/30 transition",
                        "bg-gradient-to-br from-violet-600 to-blue-600 text-white",
                        "hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                    )}
                >
                    <MessageCircle className="size-6" aria-hidden />
                </button>
            ) : null}

            {open ? (
                <div
                    className={cx(
                        "fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[calc(100vh-3rem)] w-[420px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden",
                        "rounded-2xl border border-secondary bg-primary shadow-2xl",
                    )}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="talent-helper-chat-title"
                >
                    <header className="flex shrink-0 items-center justify-between border-b border-secondary bg-gradient-to-r from-violet-50 to-blue-50 px-4 py-3 dark:from-violet-950/40 dark:to-blue-950/30">
                        <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white">
                                <MessageCircle className="size-4" aria-hidden />
                            </div>
                            <div>
                                <p id="talent-helper-chat-title" className="text-sm font-semibold text-primary">
                                    Helper IA
                                </p>
                                <p className="text-[11px] text-tertiary">Assistant carrière personnalisé</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setShowSessions((v) => !v)}
                                className="rounded p-1.5 text-tertiary transition hover:bg-primary hover:text-primary"
                                aria-label={showSessions ? "Masquer les sessions" : "Afficher les sessions"}
                                aria-expanded={showSessions}
                            >
                                <Plus className="size-3.5" aria-hidden />
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded p-1.5 text-tertiary transition hover:bg-primary hover:text-primary"
                                aria-label="Fermer"
                            >
                                <X className="size-3.5" aria-hidden />
                            </button>
                        </div>
                    </header>

                    {showSessions ? (
                        <div className="max-h-40 shrink-0 overflow-auto border-b border-secondary bg-secondary_subtle/40 p-2">
                            <button
                                type="button"
                                onClick={() => void handleNewSession()}
                                disabled={createSession.isPending}
                                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium text-brand-secondary hover:bg-primary"
                            >
                                <Plus className="size-3.5" aria-hidden />
                                Nouvelle conversation
                            </button>
                            {(sessionsQuery.data ?? []).map((session) => (
                                <div key={session.id} className="group flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => handleSwitchSession(session.id)}
                                        className={cx(
                                            "flex-1 truncate rounded px-3 py-2 text-left text-sm hover:bg-primary",
                                            session.id === currentSessionId
                                                ? "bg-primary font-medium text-primary"
                                                : "text-secondary",
                                        )}
                                    >
                                        {session.title}{" "}
                                        <span className="text-xs text-tertiary">({session.message_count})</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleDeleteSession(session.id)}
                                        disabled={deleteSession.isPending}
                                        className="rounded p-1 text-red-500 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/30"
                                        aria-label={`Supprimer ${session.title}`}
                                    >
                                        <Trash2 className="size-3" aria-hidden />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-secondary_subtle/30 p-4">
                        {sessionQuery.isLoading && currentSessionId ? (
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary" />
                                ))}
                            </div>
                        ) : null}

                        {!sessionQuery.isLoading && showEmpty ? <ChatEmptyState onPickSuggestion={handlePickSuggestion} /> : null}

                        {!showEmpty ? (
                            <>
                                {displayMessages
                                    .filter((m) => m.role === "user" || m.role === "assistant")
                                    .map((message) => (
                                        <MessageBubble key={message.id} message={message} />
                                    ))}
                                {sendMessage.isPending ? <TypingIndicator /> : null}
                                <div ref={messagesEndRef} />
                            </>
                        ) : null}
                    </div>

                    <div className="shrink-0 border-t border-secondary p-3">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                aria-label="Message au Helper IA"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        void handleSend();
                                    }
                                }}
                                placeholder="Demande-moi quelque chose sur ta carrière..."
                                rows={1}
                                disabled={isBusy}
                                className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
                            />
                            <button
                                type="button"
                                onClick={() => void handleSend()}
                                disabled={!input.trim() || isBusy}
                                className="rounded-lg bg-violet-600 p-2 text-white transition hover:bg-violet-700 disabled:bg-tertiary"
                                aria-label="Envoyer"
                            >
                                {sendMessage.isPending ? (
                                    <Loader2 className="size-4 animate-spin" aria-hidden />
                                ) : (
                                    <Send className="size-4" aria-hidden />
                                )}
                            </button>
                        </div>
                        <p className="mt-1.5 text-[10px] text-tertiary">Enter = envoyer · Shift+Enter = nouvelle ligne</p>
                    </div>
                </div>
            ) : null}
        </>
    );
}
