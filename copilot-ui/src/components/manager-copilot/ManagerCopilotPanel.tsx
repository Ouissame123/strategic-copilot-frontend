import { useCallback, useState } from "react";
import { RefreshCw01, Stars01, Trash01, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { HelperChatRagBadge } from "@/components/copilot/HelperChatRagBadge";
import { ConversationsSidebar } from "./ConversationsSidebar";
import { ChatThread } from "./ChatThread";
import { ChatInputBox } from "./ChatInputBox";
import {
    useManagerCopilotArchiveConversation,
    useManagerCopilotConversationDetail,
    useManagerCopilotSendMessage,
} from "@/hooks/use-manager-copilot";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";

export interface ManagerCopilotPanelProps {
    projectId?: string | null;
    projectName?: string;
    onClose?: () => void;
    embeddedInDrawer?: boolean;
    quickPrompts?: readonly string[];
}

export function ManagerCopilotPanel({
    projectId,
    projectName,
    onClose,
    embeddedInDrawer = false,
    quickPrompts,
}: ManagerCopilotPanelProps) {
    const stableProjectId = projectId?.trim() || undefined;
    const [conversationId, setConversationId] = useState<string | undefined>();

    const detail = useManagerCopilotConversationDetail(conversationId);
    const send = useManagerCopilotSendMessage(conversationId);
    const archive = useManagerCopilotArchiveConversation();
    const { push: toast } = useToast();

    const messages = detail.data?.messages ?? [];
    const conversation = detail.data?.conversation;
    const isArchived = conversation?.status === "archived";

    const handleSend = useCallback(
        (message: string) => {
            send.mutate(
                {
                    project_id: stableProjectId,
                    conversation_id: conversationId,
                    message,
                },
                {
                    onSuccess: (data) => {
                        if (!conversationId && data.conversation_id) {
                            setConversationId(data.conversation_id);
                        }
                    },
                    onError: (err) => {
                        toast(`Erreur Copilot : ${err.message}`, "error");
                    },
                },
            );
        },
        [conversationId, send, stableProjectId, toast],
    );

    const handleArchive = () => {
        if (!conversationId) return;
        archive.mutate(
            { id: conversationId, restore: isArchived },
            {
                onSuccess: () => {
                    if (!isArchived) setConversationId(undefined);
                },
            },
        );
    };

    return (
        <aside
            className={cx(
                "flex h-full w-full bg-primary",
                embeddedInDrawer ? "min-h-0" : "max-w-[920px] border-l shadow-xl",
            )}
        >
            <ConversationsSidebar
                projectId={stableProjectId}
                selectedConversationId={conversationId}
                onSelectConversation={(id) => setConversationId(id ?? undefined)}
            />

            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-secondary px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                            <Stars01 className="size-4 text-white" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-primary">
                                {conversation?.title ?? "Nouvelle conversation"}
                            </h2>
                            {(projectName || conversation?.project_name) && !embeddedInDrawer ? (
                                <p className="truncate text-xs text-fg-tertiary">
                                    {projectName ?? conversation?.project_name}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                        <HelperChatRagBadge className="hidden sm:inline-flex" />

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
                                aria-label="Fermer le copilot"
                                onClick={onClose}
                            />
                        ) : null}
                    </div>
                </div>

                <ChatThread
                    messages={messages}
                    projectId={stableProjectId}
                    isLoading={send.isPending}
                    isEmpty={!detail.isLoading && messages.length === 0}
                    onSuggestQuestion={handleSend}
                    starterQuestions={quickPrompts}
                />

                <ChatInputBox
                    onSend={handleSend}
                    isLoading={send.isPending}
                    disabled={isArchived}
                    placeholder={
                        isArchived
                            ? "Conversation archivée — restaure-la pour répondre"
                            : "Pose une question…"
                    }
                />
            </div>
        </aside>
    );
}
