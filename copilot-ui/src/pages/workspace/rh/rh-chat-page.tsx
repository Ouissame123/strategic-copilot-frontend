import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
    RhChatAnalysisPanel,
    RhChatMainPanel,
    RhChatSidebar,
} from "@/components/rh-chat";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import {
    useRhChatArchiveMutation,
    useRhChatConversationDetailQuery,
    useRhChatConversationsQuery,
    useRhChatSendMutation,
} from "@/hooks/rh-chat";
import { useAuth } from "@/hooks/useAuth";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import {
    addAssistantMessage,
    analysisMetaFromMessage,
    analysisMetaFromPost,
    appendUserMessage,
    createLocalAssistantMessage,
    createLocalUserMessage,
    lastAssistantMessage,
    mapRhChatErrorToToast,
    mergeRhChatDisplayMessages,
    pruneSyncedLocalMessages,
} from "@/services/rh-chat";
import type { RhChatAnalysisMeta, RhChatConversationStatus, RhChatMessage } from "@/types/rh-chat";

export default function RhChatPage() {
    const { user } = useAuth();
    const enterpriseId = user?.enterpriseId?.trim() ?? "";
    const { push: pushToast } = useToast();
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<RhChatConversationStatus | "all">("active");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [input, setInput] = useState("");
    const [localMessages, setLocalMessages] = useState<RhChatMessage[]>([]);
    const [analysisMeta, setAnalysisMeta] = useState<RhChatAnalysisMeta | null>(null);
    const skipClearLocalOnSelectRef = useRef(false);

    useCopilotPage("rh_chat", { view: "assistant" });
    useWorkspaceTopbarMeta("Assistant RH IA", "Chat connecté aux workflows WF_RH_Chat et WF_RH_Conversations");

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(t);
    }, [search]);

    const listQuery = useRhChatConversationsQuery({
        status: statusFilter,
        search: debouncedSearch || undefined,
        limit: 50,
    });

    const detailQuery = useRhChatConversationDetailQuery(selectedId);
    const sendMutation = useRhChatSendMutation();
    const archiveMutation = useRhChatArchiveMutation();

    useEffect(() => {
        if (listQuery.isError) {
            pushToast(mapRhChatErrorToToast(listQuery.error), "error");
        }
    }, [listQuery.isError, listQuery.error, pushToast]);

    useEffect(() => {
        if (detailQuery.isError) {
            pushToast(mapRhChatErrorToToast(detailQuery.error), "error");
        }
    }, [detailQuery.isError, detailQuery.error, pushToast]);

    const serverMessages = detailQuery.data?.messages ?? [];

    useEffect(() => {
        if (skipClearLocalOnSelectRef.current) {
            skipClearLocalOnSelectRef.current = false;
            return;
        }
        setLocalMessages([]);
        const msgs = detailQuery.data?.messages ?? [];
        setAnalysisMeta(analysisMetaFromMessage(lastAssistantMessage(msgs)));
    }, [selectedId]);

    useEffect(() => {
        if (localMessages.length === 0) {
            const msgs = detailQuery.data?.messages ?? [];
            setAnalysisMeta(analysisMetaFromMessage(lastAssistantMessage(msgs)));
            return;
        }
        setLocalMessages((prev) => {
            const pruned = pruneSyncedLocalMessages(serverMessages, prev);
            return pruned.length === prev.length ? prev : pruned;
        });
    }, [detailQuery.data?.messages, serverMessages, localMessages.length]);

    const displayMessages = useMemo(
        () => mergeRhChatDisplayMessages(serverMessages, localMessages),
        [serverMessages, localMessages],
    );

    const notifyError = useCallback(
        (err: unknown) => {
            pushToast(mapRhChatErrorToToast(err), "error");
        },
        [pushToast],
    );

    const sendMessage = useCallback(
        async (text: string) => {
            const message = text.trim();
            if (!message || sendMutation.isPending) return;

            const userMsg = createLocalUserMessage(message);

            flushSync(() => {
                setLocalMessages((prev) => appendUserMessage(prev, userMsg));
                setInput("");
            });

            try {
                const result = await sendMutation.mutateAsync({
                    message,
                    conversation_id: selectedId,
                });

                const cid = result.conversation_id?.trim();
                if (cid && cid !== selectedId) {
                    skipClearLocalOnSelectRef.current = true;
                    setSelectedId(cid);
                }

                const assistantMsg = createLocalAssistantMessage(result, userMsg.created_at);

                flushSync(() => {
                    setLocalMessages((prev) => addAssistantMessage(prev, assistantMsg));
                    setAnalysisMeta(analysisMetaFromPost(result));
                });

                if (cid) {
                    void queryClient.invalidateQueries({ queryKey: queryKeys.rh.chat.detail(cid) });
                }
            } catch (err) {
                setLocalMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
                notifyError(err);
            }
        },
        [notifyError, queryClient, selectedId, sendMutation],
    );

    const handleNewConversation = () => {
        setSelectedId(null);
        setLocalMessages([]);
        setAnalysisMeta(null);
        setInput("");
    };

    const handleSelectConversation = (id: string) => {
        setSelectedId(id);
        setLocalMessages([]);
        setAnalysisMeta(null);
    };

    const conversations = listQuery.data?.conversations ?? [];
    const selectedConversation = conversations.find((c) => c.id === selectedId);

    const handleArchiveConversation = useCallback(async () => {
        if (!selectedId) return;
        try {
            await archiveMutation.mutateAsync({ id: selectedId, restore: false });
            pushToast("Conversation archivée.", "success");
        } catch (err) {
            notifyError(err);
        }
    }, [archiveMutation, notifyError, pushToast, selectedId]);

    const handleRestoreConversation = useCallback(async () => {
        if (!selectedId) return;
        try {
            await archiveMutation.mutateAsync({ id: selectedId, restore: true });
            pushToast("Conversation restaurée.", "success");
        } catch (err) {
            notifyError(err);
        }
    }, [archiveMutation, notifyError, pushToast, selectedId]);

    const handleWelcomeQuestion = useCallback(
        (question: string) => {
            setInput(question);
            void sendMessage(question);
        },
        [sendMessage],
    );

    const showWelcome = !selectedId && displayMessages.length === 0 && !sendMutation.isPending;

    return (
        <WorkspacePageShell role="rh" title="Assistant RH IA" omitHeader>
            <div className="flex h-[calc(100dvh-7.5rem)] min-h-[520px] flex-col gap-3 bg-slate-50 p-2 lg:flex-row lg:gap-4 lg:p-3 dark:bg-slate-950">
                <RhChatSidebar
                    conversations={conversations}
                    selectedId={selectedId}
                    statusFilter={statusFilter}
                    search={search}
                    loading={listQuery.isPending}
                    onSearchChange={setSearch}
                    onStatusFilterChange={setStatusFilter}
                    onSelect={handleSelectConversation}
                    onNewConversation={handleNewConversation}
                    selectedStatus={selectedConversation?.status ?? detailQuery.data?.status ?? null}
                    archiving={archiveMutation.isPending}
                    onArchive={() => void handleArchiveConversation()}
                    onRestore={() => void handleRestoreConversation()}
                />

                <RhChatMainPanel
                    messages={displayMessages}
                    input={input}
                    loadingMessages={Boolean(selectedId) && detailQuery.isPending && displayMessages.length === 0}
                    sending={sendMutation.isPending}
                    connected={!listQuery.isError}
                    showWelcome={showWelcome}
                    enterpriseId={enterpriseId}
                    onInputChange={setInput}
                    onSend={() => void sendMessage(input)}
                    onQuickReply={(q) => void sendMessage(q)}
                    onWelcomeQuestion={handleWelcomeQuestion}
                />

                <RhChatAnalysisPanel meta={analysisMeta} />
            </div>
        </WorkspacePageShell>
    );
}
