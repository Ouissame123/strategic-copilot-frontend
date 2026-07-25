import { useCallback, useEffect, useRef, useState } from "react";
import { Stars02, Trash01, XClose } from "@untitledui/icons";
import { HelperChatRagBadge } from "@/components/copilot/HelperChatRagBadge";
import { ChatInputBox } from "@/components/copilot/ChatInputBox";
import { ChatMessageList, type ChatThreadMessage } from "@/components/copilot/ChatMessageList";
import { useHelperChatV3 } from "@/hooks/use-helper-chat-v3";
import {
    readHelperConversationId,
    removeHelperConversationStorage,
    writeHelperConversationId,
} from "@/lib/helper-conversation-storage";
import { useAuth } from "@/hooks/useAuth";
import { isHelperChatUuid } from "@/lib/helper-conversation-id";
import { cx } from "@/utils/cx";

const DEFAULT_EXAMPLES = [
    "Comment va le projet ?",
    "Qui peut prendre ce projet ?",
    "Quels sont les risques ?",
    "Que faire ?",
] as const;

export type CopilotChatPanelProps = {
    projectId?: string | null;
    projectName?: string;
    compact?: boolean;
    embeddedInDrawer?: boolean;
    quickPrompts?: readonly string[];
    messageContextPrefix?: string | null;
    externalPrompt?: { text: string; nonce: number } | null;
    onClose?: () => void;
};

export function CopilotChatPanel({
    projectId,
    projectName,
    compact = false,
    embeddedInDrawer = false,
    quickPrompts,
    messageContextPrefix = null,
    externalPrompt = null,
    onClose,
}: CopilotChatPanelProps) {
    const { user } = useAuth();
    const enterpriseId = user?.enterpriseId?.trim() ?? "";
    const stableProjectId = projectId?.trim() ?? "";

    const [conversationId, setConversationId] = useState<string | undefined>(() => {
        if (!enterpriseId || !stableProjectId) return undefined;
        const stored = readHelperConversationId(enterpriseId, stableProjectId);
        return stored && isHelperChatUuid(stored) ? stored : undefined;
    });
    const [messages, setMessages] = useState<ChatThreadMessage[]>([]);

    const chat = useHelperChatV3(conversationId);
    const examples = quickPrompts?.length ? quickPrompts : DEFAULT_EXAMPLES;
    const externalNonceRef = useRef(0);

    useEffect(() => {
        if (!enterpriseId || !stableProjectId) return;
        const stored = readHelperConversationId(enterpriseId, stableProjectId);
        if (stored && isHelperChatUuid(stored)) setConversationId(stored);
    }, [enterpriseId, stableProjectId]);

    const handleSend = useCallback(
        async (text: string) => {
            if (!stableProjectId || !isHelperChatUuid(stableProjectId)) return;

            const apiMessage = messageContextPrefix?.trim() ? `${messageContextPrefix.trim()}\n\n${text}` : text;
            const userId = `user-${Date.now()}`;
            setMessages((prev) => [...prev, { kind: "user", id: userId, content: text }]);

            try {
                const data = await chat.mutateAsync({
                    project_id: stableProjectId,
                    conversation_id: conversationId,
                    message: apiMessage,
                });

                const cid = data.conversation_id?.trim();
                if (cid) {
                    setConversationId(cid);
                    if (enterpriseId) writeHelperConversationId(enterpriseId, stableProjectId, cid);
                }

                setMessages((prev) => [
                    ...prev,
                    { kind: "assistant", id: data.assistant_message_id ?? `assistant-${Date.now()}`, data },
                ]);
            } catch {
                setMessages((prev) => prev.filter((m) => m.id !== userId));
            }
        },
        [chat, conversationId, enterpriseId, messageContextPrefix, stableProjectId],
    );

    useEffect(() => {
        const prompt = externalPrompt?.text.trim();
        if (!prompt || externalPrompt.nonce === externalNonceRef.current) return;
        externalNonceRef.current = externalPrompt.nonce;
        void handleSend(prompt);
    }, [externalPrompt, handleSend]);

    const handleClear = () => {
        setMessages([]);
        setConversationId(undefined);
        if (enterpriseId && stableProjectId) removeHelperConversationStorage(enterpriseId, stableProjectId);
    };

    return (
        <aside
            className={cx(
                "flex h-full min-h-0 w-full flex-col bg-primary",
                !embeddedInDrawer && "max-w-[27.5rem] border-l border-secondary/60 shadow-lg",
            )}
            aria-label="Copilot projet"
        >
            {!embeddedInDrawer ? (
                <header className="flex items-center justify-between border-b border-secondary/60 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                            <Stars02 className="size-4 text-white" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-fg-primary">Copilot Projet</h2>
                            {projectName ? <p className="truncate text-xs text-fg-tertiary">{projectName}</p> : null}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <HelperChatRagBadge />
                        {messages.length > 0 ? (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="flex size-7 items-center justify-center rounded-md text-fg-tertiary hover:bg-secondary_subtle hover:text-fg-primary"
                                aria-label="Vider la conversation"
                            >
                                <Trash01 className="size-3.5" />
                            </button>
                        ) : null}
                        {onClose ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex size-7 items-center justify-center rounded-md text-fg-tertiary hover:bg-secondary_subtle hover:text-fg-primary"
                                aria-label="Fermer le copilot"
                            >
                                <XClose className="size-4" />
                            </button>
                        ) : null}
                    </div>
                </header>
            ) : (
                <div className="flex items-center justify-end gap-1 border-b border-secondary/40 px-2 py-1.5">
                    <HelperChatRagBadge className="text-[10px]" />
                    {messages.length > 0 ? (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex size-7 items-center justify-center rounded-md text-fg-tertiary hover:bg-secondary_subtle"
                            aria-label="Vider la conversation"
                        >
                            <Trash01 className="size-3.5" />
                        </button>
                    ) : null}
                </div>
            )}

            <ChatMessageList
                messages={messages}
                projectId={stableProjectId}
                isPending={chat.isPending}
                compact={compact}
                examplePrompts={examples}
                onExampleClick={(text) => void handleSend(text)}
            />

            <ChatInputBox onSend={(text) => void handleSend(text)} isLoading={chat.isPending} compact={compact} />
        </aside>
    );
}
