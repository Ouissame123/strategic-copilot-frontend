import { useEffect, useRef } from "react";
import { Stars02 } from "@untitledui/icons";
import type { HelperChatV3Response } from "@/api/helper-chat-v3.types";
import { AssistantMessageBubble } from "@/components/copilot/AssistantMessageBubble";
import { UserMessageBubble } from "@/components/copilot/UserMessageBubble";
import { cx } from "@/utils/cx";

export type ChatThreadMessage =
    | { kind: "user"; id: string; content: string }
    | { kind: "assistant"; id: string; data: HelperChatV3Response };

type ChatMessageListProps = {
    messages: ChatThreadMessage[];
    projectId?: string | null;
    isPending?: boolean;
    compact?: boolean;
    examplePrompts?: readonly string[];
    onExampleClick?: (text: string) => void;
};

export function ChatMessageList({
    messages,
    projectId,
    isPending = false,
    compact = false,
    examplePrompts,
    onExampleClick,
}: ChatMessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, [messages, isPending]);

    return (
        <div ref={scrollRef} className={cx("min-h-0 flex-1 overflow-y-auto", compact ? "p-2" : "p-4")}>
            <div className="space-y-4">
                {messages.length === 0 ? (
                    <div className="py-10 text-center sm:py-12">
                        <Stars02 className="mx-auto mb-3 size-10 text-fg-quaternary/40" aria-hidden />
                        <p className="text-sm text-fg-tertiary">
                            Pose une question sur ce projet.
                            <br />
                            Le contexte est automatiquement transmis.
                        </p>
                        {examplePrompts?.length && onExampleClick ? (
                            <div className="mx-auto mt-4 max-w-xs space-y-1.5 text-xs">
                                <p className="text-fg-quaternary">Exemples :</p>
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {examplePrompts.map((prompt) => (
                                        <button
                                            key={prompt}
                                            type="button"
                                            onClick={() => onExampleClick(prompt)}
                                            className="rounded-md border border-secondary/60 bg-secondary_subtle/40 px-2 py-1 text-xs transition-colors hover:bg-secondary_subtle"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {messages.map((message) =>
                    message.kind === "user" ? (
                        <UserMessageBubble key={message.id} content={message.content} compact={compact} />
                    ) : (
                        <AssistantMessageBubble
                            key={message.id}
                            message={message.data}
                            projectId={projectId}
                            compact={compact}
                        />
                    ),
                )}

                {isPending ? (
                    <div className="flex gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                            <Stars02 className="size-4 animate-pulse text-white" aria-hidden />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg border border-secondary/60 bg-primary px-3 py-2">
                            <span className="size-1.5 animate-bounce rounded-full bg-violet-500" />
                            <span className="size-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:150ms]" />
                            <span className="size-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:300ms]" />
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
