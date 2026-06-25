import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { X } from "lucide-react";
import { HelperChatRagBadge } from "@/components/copilot/HelperChatRagBadge";
import { useHelperChat } from "@/hooks/useHelperChat";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useAuth } from "@/hooks/useAuth";
import { cx } from "@/utils/cx";

const QUICK_PROMPTS = [
    "Quelles sont mes priorités cette semaine ?",
    "Résume mon profil talent",
    "Quels projets me correspondent ?",
    "Comment améliorer mon IPI ?",
] as const;

type Message = { role: "user" | "assistant"; content: string };

type TalentHelperDrawerProps = {
    open: boolean;
    onClose: () => void;
    returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
};

export function TalentHelperDrawer({ open, onClose, returnFocusRef }: TalentHelperDrawerProps) {
    const { user } = useAuth();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const chat = useHelperChat();
    const drawerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useLockBodyScroll(open);

    const handleClose = useCallback(() => {
        onClose();
        returnFocusRef?.current?.focus();
    }, [onClose, returnFocusRef]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                handleClose();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, handleClose]);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, chat.isPending]);

    const send = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || chat.isPending) return;
            setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
            setInput("");
            try {
                const res = await chat.mutateAsync({
                    message: trimmed,
                    enterprise_id: user?.enterpriseId,
                });
                setMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
            } catch {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: "Impossible de contacter l'assistant pour le moment." },
                ]);
            }
        },
        [chat, user?.enterpriseId],
    );

    return (
        <div className={cx("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
            <button
                type="button"
                tabIndex={-1}
                aria-label="Fermer l'assistant"
                inert={!open ? true : undefined}
                onClick={handleClose}
                className={cx(
                    "absolute inset-0 bg-black/40 transition-opacity",
                    open ? "opacity-100" : "opacity-0",
                )}
            />

            <div
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="talent-helper-title"
                className={cx(
                    "fixed z-50 flex flex-col bg-primary shadow-2xl transition-transform",
                    "inset-x-0 bottom-0 h-[90dvh] max-h-[90dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]",
                    open ? "translate-y-0" : "translate-y-full",
                    "lg:inset-y-0 lg:right-0 lg:left-auto lg:top-0 lg:h-dvh lg:max-h-dvh lg:w-[480px] lg:max-w-[100vw] lg:rounded-none",
                    open ? "lg:translate-x-0 lg:translate-y-0" : "lg:translate-x-full lg:translate-y-0",
                )}
            >
                <header className="shrink-0 border-b border-secondary px-4 py-4 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 id="talent-helper-title" className="text-base font-semibold text-primary">
                                Helper IA
                            </h2>
                            <p className="mt-0.5 text-sm text-tertiary">Votre assistant talent personnel</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <HelperChatRagBadge className="hidden sm:inline-flex" />
                            <button
                                type="button"
                                onClick={handleClose}
                                aria-label="Fermer"
                                className="flex size-8 items-center justify-center rounded-lg text-tertiary hover:bg-secondary_subtle hover:text-primary"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    </div>
                </header>

                <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5">
                    {messages.length === 0 ? (
                        <div className="space-y-2">
                            <p className="text-sm text-secondary">Posez une question ou choisissez une suggestion :</p>
                            <div className="flex flex-wrap gap-2">
                                {QUICK_PROMPTS.map((q) => (
                                    <button
                                        key={q}
                                        type="button"
                                        onClick={() => void send(q)}
                                        className="rounded-full border border-secondary bg-secondary_subtle/40 px-3 py-1.5 text-xs text-primary hover:border-brand-secondary/40"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((m, i) => (
                            <div
                                key={`msg-${i}`}
                                className={cx(
                                    "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
                                    m.role === "user"
                                        ? "ml-auto bg-brand-solid text-white"
                                        : "mr-auto border border-secondary bg-secondary_subtle/50 text-primary",
                                )}
                            >
                                {m.content}
                            </div>
                        ))
                    )}
                    {chat.isPending ? (
                        <p className="text-xs text-tertiary">Réflexion en cours…</p>
                    ) : null}
                </div>

                <form
                    className="shrink-0 border-t border-secondary p-3 sm:p-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send(input);
                    }}
                >
                    <div className="flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Votre question…"
                            disabled={chat.isPending}
                            className="min-w-0 flex-1 rounded-xl border border-secondary bg-primary px-3 py-2 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-brand-secondary"
                        />
                        <button
                            type="submit"
                            disabled={chat.isPending || !input.trim()}
                            aria-label="Envoyer"
                            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#7c6ef5] text-white disabled:opacity-50"
                        >
                            <Send className="size-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
