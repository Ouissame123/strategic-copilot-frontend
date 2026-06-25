import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, RefreshCw01, Stars01, Trash01, XClose } from "@untitledui/icons";
import { CopilotChatPanel } from "@/components/copilot/CopilotChatPanel";
import {
    formatConversationTimeAgo,
    friendlyArchiveConversationError,
    friendlyHelperChatSendError,
    isHelperChatUuid,
} from "@/components/copilot/helper-chat-reply-cache";
import {
    managerConversationDetailKey,
    managerConversationsListKey,
    useArchiveConversation,
    useConversation,
    useConversations,
    useProjectConversations,
    useSendMessage,
} from "@/hooks/useChat";
import {
    clearCopilotPendingMessages,
    getSessionId,
    readCopilotPendingMessages,
    resetCopilotSessionId,
    writeCopilotPendingMessages,
} from "@/lib/copilot-session-storage";
import { useAuth } from "@/hooks/useAuth";
import { useProjectDetail } from "@/hooks/useProjects";
import { isConversationNotFoundError } from "@/lib/helper-chat-errors";
import {
    readHelperConversationId,
    removeHelperConversationStorage,
    writeHelperConversationId,
} from "@/lib/helper-conversation-storage";
import { useToast } from "@/providers/toast-provider";
import {
    extractHelperReplyText,
    type ChatMessage,
    type ChatSource,
    type ChatSuggestedAction,
    type Conversation,
    type HelperChatSendBody,
} from "@/services/chat.api";
import { normalizeHelperConversationId } from "@/lib/helper-conversation-id";
import { cx } from "@/utils/cx";

/** Résumé projet déjà chargé par le parent (ex. modal Mission) — évite un second `useProjectDetail` en `compact`. */
export type CopilotPrefetchedProjectContext = {
    displayName: string;
    decision: string | number;
    score: number | string | null | undefined;
    alertsCount: number;
    /** Recommandation / synthèse métier courte (affichage uniquement). */
    aiRecommendation?: string | null;
};

/** Page `/workspace/manager/helper` ou colonne Copilot du modal (`compact`). */
export type ManagerProjectCopilotPanelProps = {
    projectId: string | null;
    projectName?: string;
    compact?: boolean;
    /** Si défini avec `compact` : pas de re-fetch détail projet dans ce panneau. */
    prefetchedContext?: CopilotPrefetchedProjectContext | null;
    /** Remplace les questions rapides (ex. vue Risques). */
    quickPrompts?: readonly string[];
    /** Préfixé au message envoyé à l’API (contexte métier), sans modifier le texte affiché dans la bulle utilisateur. */
    messageContextPrefix?: string | null;
    /** Incrémente `nonce` pour remplir le champ avec `text` (ex. bouton « Analyser avec IA »). */
    externalPrompt?: { text: string; nonce: number } | null;
    /** Re-scan complet via POST `/webhook/api/project/viability` (modal Mission Control). */
    onRefreshProjectSnapshot?: () => void;
    refreshingProjectSnapshot?: boolean;
    /** Mode drawer Mission Control : masque le titre/sous-titre déjà affichés par `CopilotDrawer`. */
    embeddedInDrawer?: boolean;
    /** Fermeture du drawer (panneau Copilot v3). */
    onClose?: () => void;
};

const QUICK_PROMPTS = [
    "Pourquoi ce projet est à risque ?",
    "Quelle décision recommandes-tu ?",
    "Quelles actions RH faut-il lancer ?",
    "Quel talent peut débloquer ce projet ?",
    "Génère un plan d'action 7 jours",
] as const;

/** Questions rapides dans le modal Mission Control (colonne compacte). */
const MISSION_CONTROL_QUICK_PROMPTS = [
    "Pourquoi ce projet est à risque ?",
    "Quelle décision recommandes-tu ?",
    "Quel talent peut débloquer ce projet ?",
    "Génère un plan d'action 7 jours",
] as const;

const SUGGESTED_ACTIONS = [
    { label: "Actualiser la synthèse projet", action: "refresh_snapshot" as const },
    { label: "Nouvelle conversation", action: "new_thread" as const },
] as const;

const SCROLL_BOTTOM_THRESHOLD_PX = 100;
const SCROLL_NEAR_BOTTOM_FOCUS_PX = 200;

function getDistanceFromBottom(el: HTMLElement): number {
    return el.scrollHeight - (el.scrollTop + el.clientHeight);
}

function formatConversationTitle(c: Conversation, locale = "fr-FR"): string {
    if (c.title?.trim()) return c.title.trim();
    const dateSrc = c.last_message_at || c.created_at;
    if (dateSrc) {
        const parsed = Date.parse(dateSrc);
        if (!Number.isNaN(parsed)) {
            return `Conversation du ${new Date(parsed).toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
            })}`;
        }
    }
    const id = c.id?.trim() ?? "";
    if (id.length > 12) return `${id.slice(0, 8)}…`;
    return id || "Sans titre";
}

export function ManagerProjectCopilotPanel({
    projectId,
    projectName,
    compact = false,
    prefetchedContext = null,
    quickPrompts,
    messageContextPrefix = null,
    externalPrompt = null,
    onRefreshProjectSnapshot = undefined,
    refreshingProjectSnapshot = false,
    embeddedInDrawer = false,
}: ManagerProjectCopilotPanelProps) {
    const { push } = useToast();
    const { user } = useAuth();
    const enterpriseId = user?.enterpriseId?.trim() ?? "";
    const qc = useQueryClient();

    const [activeId, setActiveId] = useState<string | null>(null);
    /** Id autorisé pour GET DETAIL (décalé après POST pour éviter 404 immédiat). */
    const [detailFetchId, setDetailFetchId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
    const [detailSyncWarning, setDetailSyncWarning] = useState(false);
    const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [convMenuOpen, setConvMenuOpen] = useState(false);
    const convMenuRef = useRef<HTMLDivElement>(null);

    const badConversationIdsRef = useRef<Set<string>>(new Set());
    /** cid pour lesquels un nettoyage 404 a déjà été appliqué — évite la boucle setState / refetch. */
    const cleanedConversationIdsRef = useRef<Set<string>>(new Set());
    const pendingMessagesCountRef = useRef(0);
    const detailInvalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const conversationBootstrapAppliedRef = useRef<string | null>(null);
    const projectResetKeyRef = useRef<string | null>(null);

    const stableProjectId = projectId?.trim() ?? "";

    const isBadConversationId = useCallback((id: string | null | undefined) => {
        const cid = id?.trim();
        return Boolean(cid && badConversationIdsRef.current.has(cid));
    }, []);

    const quickPromptsKey = useMemo(() => quickPrompts?.join("\0") ?? "", [quickPrompts]);

    const prompts = useMemo(() => {
        if (quickPrompts?.length) return quickPrompts;
        if (compact) return MISSION_CONTROL_QUICK_PROMPTS;
        return QUICK_PROMPTS;
    }, [compact, quickPromptsKey, quickPrompts]);

    const skipProjectDetailFetch = Boolean(compact && prefetchedContext);
    const snapshot = useProjectDetail(stableProjectId, {
        enabled: Boolean(stableProjectId) && !skipProjectDetailFetch,
    });

    const projectConversationsQuery = useProjectConversations(stableProjectId || null, Boolean(stableProjectId));
    const { data: convList } = useConversations(
        stableProjectId ? { project_id: stableProjectId, status: "active" } : { status: "active" },
        Boolean(stableProjectId),
    );

    const conversationsForProject = useMemo(() => {
        const all = convList?.conversations ?? [];
        if (!stableProjectId) return all;
        return all.filter((c) => c.project_id === stableProjectId || c.project_id == null);
    }, [convList?.conversations, stableProjectId]);

    useEffect(() => {
        pendingMessagesCountRef.current = pendingMessages.length;
    }, [pendingMessages.length]);

    useEffect(() => {
        return () => {
            if (detailInvalidateTimerRef.current) clearTimeout(detailInvalidateTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!stableProjectId) return;
        const previousProjectId = projectResetKeyRef.current;
        if (previousProjectId === stableProjectId) return;
        projectResetKeyRef.current = stableProjectId;

        if (previousProjectId != null) {
            conversationBootstrapAppliedRef.current = null;
            badConversationIdsRef.current = new Set();
            cleanedConversationIdsRef.current = new Set();
            if (detailInvalidateTimerRef.current) clearTimeout(detailInvalidateTimerRef.current);
            setActiveId(null);
            setDetailFetchId(null);
            setPendingMessages([]);
            setDetailSyncWarning(false);
            setInput("");
            setErrorMsg(null);
            setHistoryOpen(false);
            return;
        }

        const storedPending = readCopilotPendingMessages(stableProjectId);
        if (storedPending.length > 0) {
            setPendingMessages(storedPending);
        }
        if (enterpriseId) {
            const storedConvId = readHelperConversationId(enterpriseId, stableProjectId);
            if (storedConvId && !badConversationIdsRef.current.has(storedConvId)) {
                setActiveId(storedConvId);
            }
        }
    }, [enterpriseId, stableProjectId]);

    useEffect(() => {
        if (!stableProjectId) return;
        writeCopilotPendingMessages(stableProjectId, pendingMessages);
    }, [pendingMessages, stableProjectId]);

    useEffect(() => {
        if (!enterpriseId || !stableProjectId) return;
        if (!projectConversationsQuery.isSuccess || projectConversationsQuery.isFetching) return;
        if (conversationBootstrapAppliedRef.current === stableProjectId) return;
        conversationBootstrapAppliedRef.current = stableProjectId;

        const list = projectConversationsQuery.data;
        const firstValid = (list?.conversations ?? []).find(
            (c) => c.id?.trim() && !badConversationIdsRef.current.has(c.id.trim()),
        );

        if (firstValid?.id) {
            const cid = firstValid.id.trim();
            setActiveId((current) => current ?? cid);
            setDetailFetchId((current) => current ?? cid);
            writeHelperConversationId(enterpriseId, stableProjectId, cid);
        } else if (list && list.count > 0) {
            removeHelperConversationStorage(enterpriseId, stableProjectId);
        } else if (pendingMessagesCountRef.current === 0) {
            setActiveId((current) => (current ? null : current));
            setDetailFetchId((current) => (current ? null : current));
            removeHelperConversationStorage(enterpriseId, stableProjectId);
        }
    }, [
        enterpriseId,
        projectConversationsQuery.isFetching,
        projectConversationsQuery.isSuccess,
        stableProjectId,
    ]);

    const externalPromptNonceRef = useRef<number | undefined>(undefined);
    const externalPromptNonce = externalPrompt?.nonce;
    const externalPromptText = externalPrompt?.text ?? "";
    useEffect(() => {
        if (externalPromptNonce == null) {
            externalPromptNonceRef.current = undefined;
            return;
        }
        if (externalPromptNonce === externalPromptNonceRef.current) return;
        externalPromptNonceRef.current = externalPromptNonce;
        if (externalPromptText) setInput(externalPromptText);
    }, [externalPromptNonce, externalPromptText]);

    const detailIdForQuery = detailFetchId?.trim() ?? "";
    const shouldFetchConversation =
        Boolean(detailIdForQuery) && !badConversationIdsRef.current.has(detailIdForQuery);

    const {
        data: convDetail,
        isLoading: detailLoading,
        isFetching: detailFetching,
        isError: conversationQueryError,
        error: conversationQueryErr,
    } = useConversation(detailFetchId, shouldFetchConversation);

    useEffect(() => {
        const cid = detailFetchId?.trim() ?? "";
        if (!cid || !shouldFetchConversation || !conversationQueryError) return;
        if (!isConversationNotFoundError(conversationQueryErr)) return;
        if (cleanedConversationIdsRef.current.has(cid)) return;

        cleanedConversationIdsRef.current.add(cid);
        badConversationIdsRef.current.add(cid);

        removeHelperConversationStorage(enterpriseId, stableProjectId);
        void qc.removeQueries({ queryKey: managerConversationDetailKey(cid) });
        setActiveId((current) => (current?.trim() === cid ? null : current));
        setDetailFetchId(null);
        if (pendingMessagesCountRef.current > 0) {
            setDetailSyncWarning(true);
        }
    }, [conversationQueryError, detailFetchId, enterpriseId, qc, shouldFetchConversation, stableProjectId]);

    const conversation = convDetail?.conversation;
    const send = useSendMessage();
    const archiveConversation = useArchiveConversation();

    const removeConversationFromListCache = useCallback(
        (conversation: Conversation) => {
            const realId = conversation.id;
            const listParams = stableProjectId
                ? { project_id: stableProjectId, status: "active" as const }
                : { status: "active" as const };
            qc.setQueryData<{ conversations: Conversation[]; count: number }>(
                managerConversationsListKey(listParams),
                (old) => {
                    if (!old?.conversations) return old;
                    const next = old.conversations.filter((c) => c.id !== realId);
                    return { ...old, conversations: next, count: next.length };
                },
            );
        },
        [qc, stableProjectId],
    );

    const archiveConversationItem = useCallback(
        async (conversation: Conversation, e?: MouseEvent) => {
            e?.stopPropagation();
            e?.preventDefault();
            if (!isHelperChatUuid(conversation.id)) {
                push("Cette conversation ne peut pas être archivée.", "error");
                return;
            }
            setDeletingConversationId(conversation.id);
            try {
                await archiveConversation.mutateAsync({ id: conversation.id, restore: false });
                removeConversationFromListCache(conversation);
                void qc.removeQueries({ queryKey: managerConversationDetailKey(conversation.id) });
                void qc.removeQueries({
                    queryKey: managerConversationDetailKey(normalizeHelperConversationId(conversation.id)),
                });
                push("Conversation archivée", "success");
                if (activeId != null && activeId.toLowerCase() === conversation.id.toLowerCase()) {
                    if (enterpriseId && stableProjectId) removeHelperConversationStorage(enterpriseId, stableProjectId);
                    setActiveId(null);
                    setDetailFetchId(null);
                    setPendingMessages([]);
                    setDetailSyncWarning(false);
                    setInput("");
                    setErrorMsg(null);
                }
            } catch (err) {
                push(friendlyArchiveConversationError(err), "error");
            } finally {
                setDeletingConversationId(null);
            }
        },
        [activeId, archiveConversation, enterpriseId, push, qc, removeConversationFromListCache, stableProjectId],
    );

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);
    const prevMessagesLengthRef = useRef(0);
    const conversationScrollKeyRef = useRef<string | null>(null);
    const pendingConversationMountRef = useRef(false);
    const messagesSourceRef = useRef<"pending" | "backend" | "empty">("empty");
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [newMessagesCount, setNewMessagesCount] = useState(0);

    const scrollToSentinel = useCallback((behavior: ScrollBehavior) => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    }, []);

    const handleMessagesScroll = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const atBottom = getDistanceFromBottom(el) < SCROLL_BOTTOM_THRESHOLD_PX;
        if (atBottom === isAtBottomRef.current) return;
        isAtBottomRef.current = atBottom;
        setIsAtBottom(atBottom);
        if (atBottom) setNewMessagesCount(0);
    }, []);

    const scrollToLatestMessage = useCallback(() => {
        scrollToSentinel("smooth");
        isAtBottomRef.current = true;
        setIsAtBottom(true);
        setNewMessagesCount(0);
    }, [scrollToSentinel]);

    const handleInputFocus = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        if (getDistanceFromBottom(el) < SCROLL_NEAR_BOTTOM_FOCUS_PX) {
            scrollToSentinel("smooth");
            isAtBottomRef.current = true;
            setIsAtBottom(true);
            setNewMessagesCount(0);
        }
    }, [scrollToSentinel]);

    const handleSend = useCallback(
        async (messageOverride?: string) => {
            const msg = (messageOverride ?? input).trim();
            if (!msg || send.isPending) return;
            if (!projectId || !isHelperChatUuid(projectId)) {
                setErrorMsg("Sélectionne un projet valide pour utiliser le Copilot.");
                return;
            }
            const safeProjectId = projectId.trim();
            if (!enterpriseId) {
                setErrorMsg("Identifiant entreprise manquant — reconnecte-toi.");
                return;
            }
            setErrorMsg(null);
            setInput("");

            const apiMessage =
                messageContextPrefix?.trim() ? `${messageContextPrefix.trim()}\n\n${msg}` : msg;

            const localUserId = `local-user-${Date.now()}`;
            const localUser: ChatMessage = {
                id: localUserId,
                conversation_id: activeId ?? "pending",
                role: "user",
                content: msg,
                created_at: new Date().toISOString(),
                local: true,
            };
            setPendingMessages((prev) => [...prev, localUser]);

            const sessionId = getSessionId(safeProjectId);
            const body: HelperChatSendBody = {
                enterprise_id: enterpriseId,
                project_id: safeProjectId,
                message: apiMessage,
                session_id: sessionId,
            };
            const convIdForSend =
                activeId && isHelperChatUuid(activeId) && !isBadConversationId(activeId) ? activeId : undefined;
            if (convIdForSend) {
                body.conversation_id = convIdForSend;
            }

            try {
                const reply = await send.mutateAsync(body);
                const newCid = reply.conversation_id?.trim();
                if (!newCid) return;

                conversationBootstrapAppliedRef.current = stableProjectId;
                writeHelperConversationId(enterpriseId, safeProjectId, newCid);
                setActiveId(newCid);
                setDetailFetchId(null);
                setDetailSyncWarning(false);

                const assistantContent = extractHelperReplyText(reply);
                if (assistantContent) {
                    setPendingMessages((prev) => [
                        ...prev,
                        {
                            id: `local-assistant-${Date.now()}`,
                            conversation_id: newCid,
                            role: "assistant",
                            content: assistantContent,
                            intent: reply.intent,
                            confidence: reply.confidence,
                            suggested_actions: reply.suggested_actions,
                            details: reply.details,
                            sources: reply.sources,
                            created_at: new Date().toISOString(),
                            local: true,
                        },
                    ]);
                }

                if (detailInvalidateTimerRef.current) clearTimeout(detailInvalidateTimerRef.current);
                detailInvalidateTimerRef.current = setTimeout(() => {
                    detailInvalidateTimerRef.current = null;
                    if (badConversationIdsRef.current.has(newCid)) return;
                    setDetailFetchId(newCid);
                    void qc.invalidateQueries({ queryKey: managerConversationDetailKey(newCid) });
                }, 1200);
            } catch (err) {
                setPendingMessages((prev) => prev.filter((m) => m.id !== localUserId));
                setInput(msg);
                setErrorMsg(friendlyHelperChatSendError(err));
            }
        },
        [activeId, enterpriseId, input, isBadConversationId, messageContextPrefix, projectId, qc, send, stableProjectId],
    );

    const startNewConversation = useCallback(() => {
        if (stableProjectId) {
            resetCopilotSessionId(stableProjectId);
            clearCopilotPendingMessages(stableProjectId);
        }
        if (enterpriseId && stableProjectId) removeHelperConversationStorage(enterpriseId, stableProjectId);
        conversationBootstrapAppliedRef.current = null;
        if (detailInvalidateTimerRef.current) clearTimeout(detailInvalidateTimerRef.current);
        setActiveId(null);
        setDetailFetchId(null);
        setPendingMessages([]);
        setDetailSyncWarning(false);
        setInput("");
        setErrorMsg(null);
        setConvMenuOpen(false);
    }, [enterpriseId, stableProjectId]);

    const selectConversation = useCallback(
        (c: Conversation) => {
            const cid = c.id.trim();
            if (isBadConversationId(cid)) return;
            setPendingMessages([]);
            setDetailSyncWarning(false);
            setActiveId(cid);
            setDetailFetchId(cid);
            if (enterpriseId && stableProjectId) writeHelperConversationId(enterpriseId, stableProjectId, cid);
            setConvMenuOpen(false);
        },
        [enterpriseId, isBadConversationId, stableProjectId],
    );

    useEffect(() => {
        if (!convMenuOpen) return;
        const onDocClick = (e: globalThis.MouseEvent) => {
            if (convMenuRef.current && !convMenuRef.current.contains(e.target as Node)) {
                setConvMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [convMenuOpen]);

    const fillInputFromPrompt = useCallback((label: string) => {
        setInput(label);
    }, []);

    const refreshProjectContext = useCallback(() => {
        if (!projectId) return;
        if (onRefreshProjectSnapshot) {
            onRefreshProjectSnapshot();
            return;
        }
        void qc.invalidateQueries({ queryKey: ["project-detail", projectId] });
        void qc.invalidateQueries({ queryKey: ["manager-conversations"] });
    }, [onRefreshProjectSnapshot, projectId, qc]);

    const backendMessages = convDetail?.messages ?? [];
    const visibleMessages = backendMessages.length > 0 ? backendMessages : pendingMessages;
    const hasMessages = visibleMessages.length > 0;
    const isSending = send.isPending;
    const loadingHistory = Boolean(
        detailFetchId &&
            shouldFetchConversation &&
            (detailLoading || detailFetching) &&
            backendMessages.length === 0 &&
            pendingMessages.length === 0,
    );
    const showQuickReplies = !hasMessages && !isSending;
    const showEmptyState = !hasMessages && !isSending;

    useEffect(() => {
        if (backendMessages.length > 0) {
            setDetailSyncWarning(false);
        }
    }, [backendMessages.length]);

    const conversationScrollKey = detailFetchId ?? activeId ?? "__none__";

    useLayoutEffect(() => {
        if (conversationScrollKeyRef.current === conversationScrollKey) return;
        conversationScrollKeyRef.current = conversationScrollKey;
        pendingConversationMountRef.current = true;
        prevMessagesLengthRef.current = 0;
        messagesSourceRef.current = "empty";
        isAtBottomRef.current = true;
        setIsAtBottom(true);
        setNewMessagesCount(0);
    }, [conversationScrollKey]);

    useLayoutEffect(() => {
        const source: "pending" | "backend" | "empty" =
            backendMessages.length > 0 ? "backend" : pendingMessages.length > 0 ? "pending" : "empty";

        if (pendingConversationMountRef.current) {
            if (!loadingHistory) {
                if (visibleMessages.length > 0) {
                    scrollToSentinel("auto");
                    prevMessagesLengthRef.current = visibleMessages.length;
                } else {
                    prevMessagesLengthRef.current = 0;
                }
                pendingConversationMountRef.current = false;
                messagesSourceRef.current = source;
            }
            return;
        }

        if (loadingHistory) return;

        if (messagesSourceRef.current === "pending" && source === "backend") {
            messagesSourceRef.current = source;
            prevMessagesLengthRef.current = visibleMessages.length;
            if (isAtBottomRef.current) scrollToSentinel("auto");
            return;
        }
        messagesSourceRef.current = source;

        const len = visibleMessages.length;
        const prevLen = prevMessagesLengthRef.current;
        if (len <= prevLen) {
            if (len < prevLen) prevMessagesLengthRef.current = len;
            return;
        }

        const newMessages = visibleMessages.slice(prevLen);
        prevMessagesLengthRef.current = len;

        for (const msg of newMessages) {
            if (msg.role === "user") {
                scrollToSentinel("smooth");
                isAtBottomRef.current = true;
                setIsAtBottom(true);
                setNewMessagesCount(0);
            } else if (msg.role === "assistant") {
                if (isAtBottomRef.current) {
                    scrollToSentinel("smooth");
                    setNewMessagesCount(0);
                } else {
                    setNewMessagesCount((c) => c + 1);
                }
            }
        }
    }, [backendMessages.length, pendingMessages.length, visibleMessages, loadingHistory, scrollToSentinel]);

    if (!projectId) {
        return (
            <div className="rounded-2xl border border-secondary bg-primary p-4 text-center text-sm text-tertiary">
                Sélectionne un projet pour ouvrir le Copilot.
            </div>
        );
    }

    const displayName = prefetchedContext?.displayName ?? projectName?.trim() ?? "Projet";
    const decision = prefetchedContext?.decision ?? snapshot.data?.latest_viability?.decision ?? "—";
    const score = prefetchedContext?.score ?? snapshot.data?.latest_viability?.score ?? "—";
    const alertsCount = prefetchedContext?.alertsCount ?? snapshot.data?.active_alerts?.length ?? 0;

    const sidebarShellClass =
        "flex max-h-[min(40vh,320px)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-secondary/90 bg-primary shadow-sm ring-1 ring-secondary/40 lg:max-h-none";

    const conversationSidebar = (
        <div role="complementary" aria-label="Liste des conversations" className={sidebarShellClass}>
            <div className="border-b border-secondary/80 bg-gradient-to-r from-brand-primary_alt/20 to-transparent px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Conversations</p>
                <button
                    type="button"
                    onClick={startNewConversation}
                    className="mt-2 w-full rounded-xl bg-brand-solid px-3 py-2 text-xs font-semibold text-white shadow-md shadow-brand-solid/25 transition hover:opacity-95"
                >
                    + Nouvelle conversation
                </button>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                {conversationsForProject.map((c) => (
                    <div
                        key={c.id}
                        className={cx(
                            "flex w-full items-stretch gap-0.5 rounded-xl text-xs transition",
                            activeId != null && activeId === c.id
                                ? "border border-brand-secondary/80 bg-brand-primary/10 shadow-sm"
                                : "border border-transparent hover:border-secondary hover:bg-secondary_subtle/60",
                        )}
                    >
                        <button
                            type="button"
                            onClick={() => selectConversation(c)}
                            className="min-w-0 flex-1 rounded-l-xl px-2.5 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid"
                        >
                            <div className="truncate font-semibold text-primary">{c.title || "Sans titre"}</div>
                            <div className="truncate text-[10px] text-tertiary">
                                {c.message_count} msg · {formatConversationTimeAgo(c.last_message_at || c.created_at)}
                            </div>
                        </button>
                        <button
                            type="button"
                            disabled={deletingConversationId != null}
                            title="Archiver la conversation"
                            aria-label="Supprimer ou archiver la conversation"
                            onClick={(e) => void archiveConversationItem(c, e)}
                            className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-r-xl border-l border-secondary/50 px-2 py-1.5 text-tertiary transition hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40"
                        >
                            <Trash01 className="size-3.5 shrink-0" aria-hidden />
                            <span className="max-w-[4.5rem] truncate text-[9px] font-semibold uppercase tracking-wide">Archiver</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    const errorBanner = errorMsg ? (
        <div className="mx-2 mb-2 flex items-start justify-between gap-2 rounded-xl border border-red-200/90 bg-red-50/95 p-2.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-100">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="shrink-0 font-medium text-red-600 hover:text-red-800">
                Fermer
            </button>
        </div>
    ) : null;

    const typingIndicator = send.isPending ? (
        <div className="flex items-center gap-2.5 px-2 py-2 text-xs text-secondary">
            <span className="inline-flex gap-0.5">
                <span className="size-1.5 animate-bounce rounded-full bg-brand-solid [animation-delay:-0.2s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-brand-solid [animation-delay:-0.1s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-brand-solid" />
            </span>
            <span className={cx("font-medium", compact && "text-[11px] leading-snug")}>
                {compact ? "Le Copilot analyse le projet…" : "Le conseiller réfléchit…"}
            </span>
        </div>
    ) : null;

    const newMessagesPill =
        newMessagesCount > 0 ? (
            <button
                type="button"
                role="status"
                aria-live="polite"
                onClick={scrollToLatestMessage}
                className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 animate-in fade-in slide-in-from-bottom-1 items-center gap-1.5 rounded-full bg-violet-600 px-4 py-1.5 text-xs font-medium text-white shadow-md transition-all duration-150 ease-out hover:bg-violet-700 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                style={{ animationDuration: "150ms" }}
            >
                <ChevronDown className="size-3.5 shrink-0" aria-hidden />
                {newMessagesCount === 1 ? "Nouveau message" : `${newMessagesCount} nouveaux messages`}
            </button>
        ) : null;

    const messageArea = (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
                ref={scrollContainerRef}
                onScroll={handleMessagesScroll}
                aria-live="polite"
                aria-relevant="additions"
                className={cx(
                    "min-h-0 flex-1 overflow-y-auto overscroll-contain",
                    compact ? "space-y-2.5 px-3 py-2.5" : "space-y-3 px-1 py-3 sm:min-h-[240px] sm:px-3",
                )}
            >
            {loadingHistory ? (
                <div
                    className="space-y-3 px-2 py-3"
                    aria-busy="true"
                    aria-label={compact ? "Chargement de l’échange" : "Chargement des messages"}
                >
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="animate-pulse space-y-2">
                            <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-secondary" />
                            <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-secondary" />
                        </div>
                    ))}
                </div>
            ) : null}

            {!detailLoading && showEmptyState ? (
                compact ? (
                    <div className="flex flex-1 flex-col items-center justify-center px-4 py-5 text-center">
                        <Stars01 className="mb-2 size-7 text-brand-secondary/70" aria-hidden />
                        <p className="max-w-[17rem] text-[11px] leading-relaxed text-secondary">
                            Pose une question sur ce projet. Le contexte projet est automatiquement transmis.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center px-2 py-8 text-center sm:py-10">
                        <div className="relative mb-4 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-secondary/30 via-brand-primary_alt/40 to-brand-solid/20 shadow-inner ring-1 ring-white/20">
                            <Stars01 className="size-9 text-brand-solid drop-shadow-sm" aria-hidden />
                        </div>
                        <p className="text-base font-semibold tracking-tight text-primary">Conseiller projet IA</p>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-secondary">
                            Pose des questions sur <span className="font-medium text-primary">{displayName}</span>. Le contexte projet est
                            transmis automatiquement à chaque message — aucune reconfiguration nécessaire.
                        </p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-tertiary">Suggestions pour démarrer</p>
                        <div className="mt-2 flex w-full max-w-lg flex-col gap-2">
                            {prompts.map((label) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => fillInputFromPrompt(label)}
                                    className="rounded-2xl border border-secondary/80 bg-primary px-4 py-3 text-left text-sm text-secondary shadow-sm transition hover:border-brand-secondary/50 hover:bg-brand-primary/5 hover:text-primary"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )
            ) : null}

            {visibleMessages.map((m) => (
                <MessageBubble key={m.id} message={m} compact={compact} />
            ))}

            {typingIndicator}
            <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
            </div>
            {newMessagesPill}
        </div>
    );

    const inputFooter = (
        <footer
            className={cx(
                "sticky bottom-0 z-20 shrink-0 border-t border-secondary/80 bg-primary/95 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-primary/80",
                compact ? "px-3 py-2.5 ring-1 ring-inset ring-secondary/40" : "px-2 py-3 sm:px-3",
            )}
        >
            {errorBanner}
            <div className="flex gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={handleInputFocus}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void handleSend();
                        }
                    }}
                    placeholder={compact ? "Pose une question sur ce projet…" : "Pose ta question au conseiller…"}
                    rows={compact ? 2 : 2}
                    className={cx(
                        "min-h-0 flex-1 resize-none rounded-2xl border bg-primary shadow-inner outline-none transition-all duration-150 ease-out placeholder:text-slate-400",
                        compact
                            ? "rounded-xl border-slate-200 px-3 py-2 text-xs leading-relaxed focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            : "border-secondary px-3 py-2.5 text-sm focus:border-brand-secondary focus:ring-2 focus:ring-brand-solid/25",
                    )}
                    disabled={send.isPending}
                />
                <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || send.isPending}
                    className={cx(
                        "shrink-0 self-end rounded-2xl font-semibold text-white transition-all duration-150 ease-out disabled:cursor-not-allowed",
                        compact
                            ? "rounded-xl px-3.5 py-2 text-xs enabled:bg-gradient-to-r enabled:from-violet-600 enabled:to-violet-500 enabled:shadow-sm enabled:hover:from-violet-700 enabled:hover:to-violet-600 disabled:bg-slate-300 disabled:text-slate-500"
                            : "bg-brand-solid px-4 py-2.5 text-sm shadow-md shadow-brand-solid/30 hover:opacity-95 disabled:opacity-45",
                    )}
                >
                    {send.isPending ? "…" : "Envoyer"}
                </button>
            </div>
        </footer>
    );

    const heroHeader = (
        <header className="shrink-0 rounded-2xl border border-secondary/80 bg-gradient-to-br from-primary via-primary to-brand-primary_alt/15 p-4 shadow-sm ring-1 ring-secondary/50 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-tertiary">Projet</p>
                    <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight text-primary sm:text-2xl">{displayName}</h2>
                    {conversation?.title ? (
                        <p className="mt-1 truncate text-xs text-tertiary">Conversation : {conversation.title}</p>
                    ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-secondary/80 bg-primary/80 px-3 py-1 text-xs font-medium text-secondary">
                        Score <span className="ml-1 tabular-nums font-semibold text-primary">{score}</span>
                    </span>
                    <span className="inline-flex items-center rounded-full border border-brand-secondary/40 bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {String(decision)}
                    </span>
                    <span
                        className={cx(
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                            alertsCount > 0
                                ? "border border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-100"
                                : "border border-secondary/80 bg-secondary_subtle text-secondary",
                        )}
                    >
                        {alertsCount} alerte{alertsCount > 1 ? "s" : ""}
                    </span>
                </div>
            </div>
            {!skipProjectDetailFetch && snapshot.isLoading ? <p className="mt-3 text-xs text-tertiary">Chargement du résumé projet…</p> : null}
        </header>
    );

    const insightsPanel = (
        <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="flex max-h-[min(70vh,520px)] min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-secondary/90 bg-primary p-3 shadow-sm ring-1 ring-secondary/40 lg:max-h-[calc(100dvh-10rem)]">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Insights IA</p>
                    <div className="mt-2 space-y-2 rounded-xl border border-secondary/60 bg-secondary_subtle/40 p-3 text-xs">
                        <div className="flex justify-between gap-2">
                            <span className="text-tertiary">Statut</span>
                            <span className="font-medium text-primary">{snapshot.data?.project.status ?? "—"}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-tertiary">Priorité</span>
                            <span className="font-medium text-primary">{snapshot.data?.project.priority ?? "—"}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-tertiary">Équipe</span>
                            <span className="font-medium text-primary">{snapshot.data?.assignments?.length ?? "—"}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span className="text-tertiary">Charge</span>
                            <span className="font-medium text-primary">
                                {snapshot.data?.latest_kpi?.capacity_load_pct != null
                                    ? `${snapshot.data.latest_kpi.capacity_load_pct}%`
                                    : "—"}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Actions suggérées</p>
                    <div className="mt-2 flex flex-col gap-2">
                        {SUGGESTED_ACTIONS.map((a) => (
                            <button
                                key={a.action}
                                type="button"
                                disabled={a.action === "refresh_snapshot" && refreshingProjectSnapshot}
                                onClick={() => {
                                    if (a.action === "refresh_snapshot") refreshProjectContext();
                                    if (a.action === "new_thread") startNewConversation();
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl border border-secondary bg-primary px-3 py-2 text-xs font-semibold text-secondary transition hover:border-brand-secondary/50 hover:bg-brand-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {a.action === "refresh_snapshot" ? (
                                    <RefreshCw01
                                        className={cx("size-3.5", refreshingProjectSnapshot && "animate-spin")}
                                    />
                                ) : null}
                                {a.action === "refresh_snapshot" && refreshingProjectSnapshot
                                    ? "Actualisation…"
                                    : a.label}
                            </button>
                        ))}
                    </div>
                </div>

                {showQuickReplies ? (
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Questions suggérées</p>
                        <div className="mt-2 flex flex-col gap-1.5">
                            {prompts.map((label) => (
                                <button
                                    key={`ins-${label}`}
                                    type="button"
                                    onClick={() => fillInputFromPrompt(label)}
                                    className="rounded-lg border border-transparent px-2 py-1.5 text-left text-[11px] leading-snug text-secondary transition hover:border-secondary hover:bg-secondary_subtle/80"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </aside>
    );

    const compactHistoryDrawer =
        historyOpen && compact ? (
            <div className="absolute inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="mission-copilot-history-title">
                <button
                    type="button"
                    className="absolute inset-0 bg-black/30 backdrop-blur-[1px] transition-opacity"
                    aria-label="Fermer l’historique"
                    onClick={() => setHistoryOpen(false)}
                />
                <div className="relative flex h-full w-[min(100%,272px)] flex-col border-l border-secondary/90 bg-primary shadow-2xl">
                    <div className="flex items-center justify-between border-b border-secondary/80 px-3 py-2.5">
                        <p id="mission-copilot-history-title" className="text-xs font-semibold text-primary">
                            Historique
                        </p>
                        <button
                            type="button"
                            className="rounded-lg p-1 text-tertiary transition hover:bg-secondary_subtle hover:text-primary"
                            aria-label="Fermer"
                            onClick={() => setHistoryOpen(false)}
                        >
                            <XClose className="size-4" aria-hidden />
                        </button>
                    </div>
                    <div className="border-b border-secondary/60 px-3 py-2">
                        <button
                            type="button"
                            onClick={() => {
                                startNewConversation();
                                setHistoryOpen(false);
                            }}
                            className="w-full rounded-xl bg-brand-solid px-3 py-2 text-center text-xs font-semibold text-white shadow-sm transition hover:opacity-95"
                        >
                            Nouvelle conversation
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                        {conversationsForProject.length === 0 ? (
                            <p className="px-1 py-3 text-center text-[11px] text-tertiary">Aucune conversation pour ce projet.</p>
                        ) : (
                            conversationsForProject.map((c) => (
                                <div
                                    key={c.id}
                                    className={cx(
                                        "flex w-full items-stretch gap-0.5 rounded-xl text-xs transition",
                                        activeId != null && activeId === c.id
                                            ? "border border-brand-secondary/80 bg-brand-primary/10 shadow-sm"
                                            : "border border-transparent hover:border-secondary hover:bg-secondary_subtle/60",
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            selectConversation(c);
                                            setHistoryOpen(false);
                                        }}
                                        className="min-w-0 flex-1 rounded-l-xl px-2.5 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid"
                                    >
                                        <div className="truncate font-semibold text-primary">{c.title || "Conversation"}</div>
                                        <div className="truncate text-[10px] text-tertiary">
                                            {c.message_count} message{c.message_count > 1 ? "s" : ""} ·{" "}
                                            {formatConversationTimeAgo(c.last_message_at || c.created_at)}
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={deletingConversationId != null}
                                        title="Archiver"
                                        aria-label="Archiver la conversation"
                                        onClick={(e) => void archiveConversationItem(c, e)}
                                        className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-r-xl border-l border-secondary/50 px-2 py-1.5 text-tertiary transition hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40"
                                    >
                                        <Trash01 className="size-3.5 shrink-0" aria-hidden />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        ) : null;

    const compactQuickPromptChips = compact && showQuickReplies ? (
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 dark:border-secondary dark:bg-primary">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Questions rapides</p>
            <div className="flex flex-wrap gap-2">
                {prompts.map((label) => (
                    <button
                        key={label}
                        type="button"
                        disabled={send.isPending}
                        onClick={() => void handleSend(label)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all duration-150 ease-out hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-secondary dark:bg-primary"
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    ) : null;

    const activeConversation =
        conversationsForProject.find((c) => activeId != null && c.id === activeId) ?? null;

    const activeConversationLabel = activeConversation
        ? formatConversationTitle(activeConversation)
        : "Aucune conversation active";

    const compactConversationSelector = (
        <div ref={convMenuRef} className={cx("relative", embeddedInDrawer ? "mt-0" : "mt-3")}>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={convMenuOpen}
                aria-label="Sélectionner une conversation"
                onClick={() => setConvMenuOpen((open) => !open)}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm transition-all duration-150 ease-out hover:border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-secondary dark:bg-primary"
            >
                <span className="min-w-0 truncate font-medium text-slate-800 dark:text-fg-primary">
                    {activeConversationLabel}
                </span>
                <ChevronDown
                    className={cx("size-4 shrink-0 text-slate-400 transition-transform duration-150", convMenuOpen && "rotate-180")}
                    aria-hidden
                />
            </button>
            {convMenuOpen ? (
                <div
                    role="listbox"
                    aria-label="Conversations du projet"
                    className="absolute top-[calc(100%+0.375rem)] right-0 left-0 z-50 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-secondary dark:bg-primary"
                >
                    <div className="border-b border-slate-100 px-2 py-2 dark:border-secondary">
                        <button
                            type="button"
                            onClick={startNewConversation}
                            className="flex min-h-11 w-full items-center justify-center rounded-md bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-all duration-150 ease-out hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                        >
                            Nouvelle conversation
                        </button>
                    </div>
                    {conversationsForProject.length === 0 ? (
                        <div className="px-3 py-4 text-center">
                            <p className="text-xs text-slate-500">Aucune conversation pour ce projet</p>
                            <button
                                type="button"
                                onClick={startNewConversation}
                                className="mt-3 min-h-11 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-all duration-150 ease-out hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700"
                            >
                                Démarrer une conversation
                            </button>
                        </div>
                    ) : (
                        conversationsForProject.map((c) => {
                            const isActive = activeId != null && c.id === activeId;
                            return (
                                <div
                                    key={c.id}
                                    className="group flex items-stretch px-1 py-0.5"
                                    role="option"
                                    aria-selected={isActive}
                                >
                                    <button
                                        type="button"
                                        onClick={() => selectConversation(c)}
                                        className={cx(
                                            "flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-md px-2.5 py-2 text-left transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                                            isActive ? "bg-violet-50" : "hover:bg-slate-50",
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="truncate text-xs font-semibold text-slate-800 dark:text-fg-primary">
                                                {formatConversationTitle(c)}
                                            </span>
                                            {isActive ? (
                                                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                                    Active
                                                </span>
                                            ) : null}
                                        </div>
                                        <span className="truncate text-[10px] text-slate-500">
                                            {formatConversationTimeAgo(c.last_message_at || c.created_at)}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={deletingConversationId != null}
                                        aria-label="Archiver la conversation"
                                        title="Archiver"
                                        onClick={(e) => void archiveConversationItem(c, e)}
                                        className="flex min-h-11 w-10 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition-all duration-150 ease-out group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-40"
                                    >
                                        <Trash01 className="size-3.5" aria-hidden />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : null}
        </div>
    );

    if (compact) {
        return (
            <div
                className={cx(
                    "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white dark:bg-primary",
                    embeddedInDrawer ? "rounded-none border-0 shadow-none" : "rounded-xl border border-slate-200 shadow-sm dark:border-secondary",
                )}
            >
                <header
                    className={cx(
                        "shrink-0 px-4 py-4 dark:border-secondary",
                        embeddedInDrawer ? "border-b-0 pt-0" : "border-b border-slate-200",
                    )}
                >
                    {embeddedInDrawer ? null : (
                        <>
                            <div className="flex items-start justify-between gap-2">
                                <h2 className="text-base font-semibold text-slate-900 dark:text-fg-primary">Copilot Projet</h2>
                                <span className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                                    AI Powered
                                </span>
                            </div>
                            <p className="mt-0.5 text-sm text-slate-500">{displayName}</p>
                        </>
                    )}
                    {compactConversationSelector}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {String(decision)}
                        </span>
                        <span
                            className={cx(
                                "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                                alertsCount > 0
                                    ? "border border-amber-200 bg-amber-100 text-amber-800"
                                    : "border border-slate-200 bg-slate-100 text-slate-700",
                            )}
                        >
                            {alertsCount} alerte{alertsCount === 1 ? "" : "s"}
                        </span>
                    </div>
                    {prefetchedContext?.aiRecommendation ? (
                        <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-secondary_subtle/50">
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Insight principal</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-fg-secondary">
                                {prefetchedContext.aiRecommendation}
                            </p>
                        </div>
                    ) : null}
                </header>
                {compactQuickPromptChips}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {messageArea}
                    {inputFooter}
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-0 w-full flex-col gap-3 lg:h-[min(100%,calc(100dvh-10rem))] lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] lg:items-stretch lg:gap-5">
            <div className="order-2 min-h-0 w-full min-w-0 lg:order-1">{conversationSidebar}</div>

            <main className="order-1 flex min-h-0 min-w-0 flex-col gap-3 lg:order-2">
                {heroHeader}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-secondary/90 bg-primary shadow-sm ring-1 ring-secondary/40">
                    <div className="flex min-h-0 flex-1 flex-col">
                        {messageArea}
                        {inputFooter}
                    </div>
                </div>
            </main>

            <div className="order-3 min-h-0 w-full min-w-0 lg:order-3">{insightsPanel}</div>
        </div>
    );
}

function humanizeIntentLabel(raw: string | undefined): string | null {
    if (!raw?.trim()) return null;
    const t = raw.trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return null;
    const hexish = t.replace(/[^a-f0-9]/gi, "");
    if (hexish.length >= 32 && /^[a-f0-9]+$/i.test(hexish)) return null;
    return t.replace(/_/g, " ");
}

function confidencePercent(n: number | undefined): number | null {
    if (n == null || !Number.isFinite(n)) return null;
    if (n >= 0 && n <= 1) return Math.round(n * 100);
    return Math.round(Math.min(100, Math.max(0, n)));
}

/** Valeur 0–1 pour la barre de confiance (accepte aussi un pourcentage 0–100). */
function confidenceRatio(n: number | undefined): number | null {
    if (n == null || !Number.isFinite(n)) return null;
    if (n >= 0 && n <= 1) return Math.min(1, Math.max(0, n));
    return Math.min(1, Math.max(0, n / 100));
}

function sourceLink(s: ChatSource): string {
    const t = s.type.toLowerCase();
    if (t === "talent_match" || t === "team_member") return `/workspace/manager/team/${encodeURIComponent(s.id)}`;
    if (t === "risk_alert") return `/workspace/manager/risks?alertId=${encodeURIComponent(s.id)}`;
    if (t === "project") return `/workspace/manager/projects/${encodeURIComponent(s.id)}`;
    return "#";
}

function suggestedActionTargetId(a: ChatSuggestedAction): string | undefined {
    const flat = a.target_id?.trim();
    if (flat) return flat;
    const p = a.payload as Record<string, unknown> | undefined;
    if (p && typeof p.target_id === "string" && p.target_id.trim()) return p.target_id.trim();
    if (p && typeof p.talent_id === "string" && p.talent_id.trim()) return p.talent_id.trim();
    return undefined;
}

function MessageBubble({ message: m, compact = false }: { message: ChatMessage; compact?: boolean }) {
    const isUser = m.role === "user";
    const intentLabel = !isUser ? humanizeIntentLabel(m.intent) : null;
    const confPct = !isUser ? confidencePercent(m.confidence) : null;
    const confRatio = !isUser ? confidenceRatio(m.confidence) : null;
    const navigate = useNavigate();
    const { push } = useToast();

    const details = m.details ?? [];
    const sources = m.sources ?? [];
    const actions = m.suggested_actions ?? [];

    const handleSuggestedAction = (a: ChatSuggestedAction) => {
        const type = a.type.toLowerCase();
        const tid = suggestedActionTargetId(a);
        if (type === "assign" && tid) {
            navigate(`/workspace/manager/team/${encodeURIComponent(tid)}`);
            return;
        }
        if (type === "training") {
            const fromPayload =
                typeof (a.payload as { duration_days?: unknown } | undefined)?.duration_days === "number"
                    ? (a.payload as { duration_days: number }).duration_days
                    : undefined;
            const days = a.duration_days ?? fromPayload;
            navigate(days != null ? `/workspace/manager/reports?duration=${encodeURIComponent(String(days))}` : "/workspace/manager/reports");
            return;
        }
        if (type === "review" || type === "risk") {
            navigate(tid ? `/workspace/manager/risks?alertId=${encodeURIComponent(tid)}` : "/workspace/manager/risks");
            return;
        }
        push(`Action « ${a.label} » : pas encore reliée dans l'interface.`, "neutral");
    };

    return (
        <div className={cx("flex w-full gap-1.5 sm:gap-2", isUser ? "justify-end" : "justify-start")}>
            {!isUser ? (
                <div
                    className={cx(
                        "mt-0.5 flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-secondary/30 to-brand-solid/25 font-bold text-brand-solid ring-1 ring-secondary/60",
                        compact ? "size-6 text-[8px]" : "size-8 text-[10px]",
                    )}
                    aria-hidden
                >
                    IA
                </div>
            ) : null}
            <div
                className={cx(
                    "max-w-[min(92%,28rem)] shadow-sm",
                    compact ? "max-w-[min(92%,16rem)] px-3 py-2.5 text-xs leading-relaxed" : "rounded-3xl px-4 py-2.5 text-sm shadow-md",
                    isUser
                        ? compact
                            ? "rounded-2xl rounded-br-md bg-gradient-to-br from-brand-solid to-brand-secondary text-white shadow-brand-solid/20"
                            : "rounded-br-md bg-gradient-to-br from-brand-solid to-brand-secondary text-white shadow-brand-solid/25"
                        : compact
                          ? "rounded-2xl rounded-bl-md border border-secondary/70 bg-secondary_subtle/30 ring-1 ring-secondary/25"
                          : "rounded-bl-md border border-secondary/60 bg-primary ring-1 ring-secondary/30",
                )}
            >
                {isUser && compact ? (
                    <p className="mb-1 text-end text-[9px] font-medium uppercase tracking-wide text-white/70">Vous</p>
                ) : null}
                {isUser ? (
                    <div className={cx("whitespace-pre-wrap leading-relaxed", "text-white/95")}>{m.content}</div>
                ) : (
                    <div className="space-y-2">
                        <p className="whitespace-pre-wrap font-medium leading-relaxed text-primary">{m.content}</p>
                        {details.length > 0 ? (
                            <ul className="space-y-1 text-xs leading-snug text-secondary">
                                {details.map((d, i) => (
                                    <li key={i} className="flex gap-2">
                                        <span className="shrink-0 text-tertiary" aria-hidden>
                                            ·
                                        </span>
                                        <span>{d}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                        {actions.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {actions.map((a, idx) => (
                                    <button
                                        key={`${a.type}-${idx}`}
                                        type="button"
                                        onClick={() => handleSuggestedAction(a)}
                                        className={cx(
                                            "rounded-lg border border-brand-secondary/35 bg-brand-primary/10 px-2 py-1 text-[11px] font-medium text-brand-secondary hover:bg-brand-primary/18",
                                            compact && "px-1.5 py-0.5 text-[10px]",
                                        )}
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                        {sources.length > 0 ? (
                            <div className={cx("flex flex-wrap items-baseline gap-x-1 gap-y-0.5 pt-0.5 text-tertiary", compact ? "text-[10px]" : "text-[11px]")}>
                                <span className="font-medium text-secondary">Sources</span>
                                {sources.map((s, i) => {
                                    const to = sourceLink(s);
                                    const label = (
                                        <>
                                            [{i + 1}] {s.label}
                                        </>
                                    );
                                    return to !== "#" ? (
                                        <Link
                                            key={`${s.type}-${s.id}-${i}`}
                                            to={to}
                                            className="underline decoration-secondary/50 underline-offset-2 hover:text-primary"
                                        >
                                            {label}
                                        </Link>
                                    ) : (
                                        <span key={`${s.type}-${s.id}-${i}`}>{label}</span>
                                    );
                                })}
                            </div>
                        ) : null}
                        {intentLabel ? (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                                <span className="rounded-full bg-secondary_subtle/90 px-2 py-0.5 text-[10px] font-medium text-secondary">
                                    {intentLabel}
                                </span>
                            </div>
                        ) : null}
                        {confRatio != null ? (
                            <div className="flex items-center gap-2 pt-0.5 text-[10px] text-secondary">
                                <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary_subtle">
                                    <div
                                        className={cx(
                                            "h-full rounded-full transition-[width]",
                                            confRatio > 0.75
                                                ? "bg-utility-success-500"
                                                : confRatio > 0.5
                                                  ? "bg-amber-500"
                                                  : "bg-utility-error-500",
                                        )}
                                        style={{ width: `${Math.round(confRatio * 100)}%` }}
                                    />
                                </div>
                                <span className="tabular-nums">{confPct ?? Math.round(confRatio * 100)}%</span>
                            </div>
                        ) : confPct != null ? (
                            <div className="pt-0.5">
                                <span className="rounded-full border border-secondary/60 bg-primary px-2 py-0.5 text-[10px] text-secondary">
                                    Fiabilité {confPct}%
                                </span>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
