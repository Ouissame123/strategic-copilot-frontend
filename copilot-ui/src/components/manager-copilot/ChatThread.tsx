import { useEffect, useRef } from "react";
import { Stars01 } from "@untitledui/icons";
import { AssistantMessage } from "./AssistantMessage";
import { UserMessage } from "./UserMessage";
import type { HelperMessage } from "@/api/manager-copilot.types";

interface Props {
    messages: HelperMessage[];
    projectId?: string;
    isLoading: boolean;
    isEmpty: boolean;
    onSuggestQuestion?: (q: string) => void;
    starterQuestions?: readonly string[];
}

const DEFAULT_STARTER_QUESTIONS = [
    "Comment va le projet ?",
    "Qui peut prendre ce projet ?",
    "Quels sont les risques actifs ?",
    "Que recommandes-tu ?",
] as const;

export function ChatThread({
    messages,
    projectId,
    isLoading,
    isEmpty,
    onSuggestQuestion,
    starterQuestions = DEFAULT_STARTER_QUESTIONS,
}: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, isLoading]);

    return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-4 p-4">
                {isEmpty ? (
                    <div className="py-12 text-center">
                        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                            <Stars01 className="size-6 text-white" aria-hidden />
                        </div>
                        <h3 className="text-base font-semibold text-primary">Helper IA</h3>
                        <p className="mt-1 mb-4 text-sm text-fg-tertiary">
                            Pose une question, le contexte du projet est automatiquement transmis.
                        </p>
                        <div className="mx-auto flex max-w-md flex-wrap justify-center gap-1.5">
                            {starterQuestions.map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => onSuggestQuestion?.(q)}
                                    className="rounded-md border border-secondary bg-secondary_subtle px-2.5 py-1 text-xs transition-colors hover:bg-secondary"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {messages.map((msg) =>
                    msg.role === "user" ? (
                        <UserMessage key={msg.id} content={msg.content} />
                    ) : (
                        <AssistantMessage key={msg.id} message={msg} projectId={projectId} />
                    ),
                )}

                {isLoading ? (
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
    );
}
