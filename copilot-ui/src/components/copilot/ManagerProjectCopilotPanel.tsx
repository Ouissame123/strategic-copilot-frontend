import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw01, Stars01, Trash01, XClose } from "@untitledui/icons";
import {
    formatConversationTimeAgo,
    friendlyArchiveConversationError,
    friendlyHelperChatSendError,
    isHelperChatUuid,
    mergeHelperChatReplyIntoConversationCache,
} from "@/components/copilot/helper-chat-reply-cache";
import { useConversation, useConversations, useSendMessage } from "@/hooks/useChat";
import { useProjectDetail } from "@/hooks/useProjects";
import { useToast } from "@/providers/toast-provider";
import { conversationsApi, type ChatMessage, type ChatSource, type ChatSuggestedAction, type Conversation } from "@/services/chat.api";
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

export function ManagerProjectCopilotPanel({
    projectId,
    projectName,
    compact = false,
    prefetchedContext = null,
    quickPrompts,
    messageContextPrefix = null,
    externalPrompt = null,
}: ManagerProjectCopilotPanelProps) {
    const { push } = useToast();
    const qc = useQueryClient();

    const [activeId, setActiveId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
    const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);

    const prompts = useMemo(() => {
        if (quickPrompts?.length) return quickPrompts;
        if (compact) return MISSION_CONTROL_QUICK_PROMPTS;
        return QUICK_PROMPTS;
    }, [compact, quickPrompts]);

    const skipProjectDetailFetch = Boolean(compact && prefetchedContext);
    const snapshot = useProjectDetail(projectId ?? "", { enabled: Boolean(projectId) && !skipProjectDetailFetch });

    const { data: convList } = useConversations("active");
    const conversationsForProject = useMemo(() => {
        const all = convList?.conversations ?? [];
        if (!projectId) return all;
        return all.filter((c) => c.project_id === projectId || c.project_id == null);
    }, [convList?.conversations, projectId]);

    const knownConversationIds = useMemo(
        () => new Set((convList?.conversations ?? []).map((c) => c.id.toLowerCase())),
        [convList?.conversations],
    );

    const resetThread = useCallback(() => {
        setActiveId(null);
        setPendingMessages([]);
        setInput("");
        setErrorMsg(null);
        setHistoryOpen(false);
    }, []);

    useEffect(() => {
        resetThread();
    }, [projectId, resetThread]);

    useEffect(() => {
        if (!externalPrompt?.text) return;
        setInput(externalPrompt.text);
    }, [externalPrompt?.nonce, externalPrompt?.text]);

    const enabled = Boolean(activeId && knownConversationIds.has(activeId.toLowerCase()));
    const cachedDetail = qc.getQueryData<{ conversation: Conversation; messages: ChatMessage[] }>(["chat-conversation", activeId]);
    const shouldFetch = enabled && !cachedDetail;
    const cleanCid = useCallback(() => {
        setActiveId(null);
    }, []);

    const { data: convDetail, isLoading: detailLoading, error: detailError } = useConversation(
        shouldFetch ? activeId : null,
        shouldFetch,
        cleanCid,
    );
    const displayDetail = convDetail ?? cachedDetail;
    const send = useSendMessage();

    const removeConversationFromListCache = useCallback(
        (conversation: Conversation) => {
            const realId = conversation.id;
            qc.setQueryData<{ conversations: Conversation[]; count: number }>(["chat-conversations", "active"], (old) => {
                if (!old?.conversations) return old;
                const next = old.conversations.filter((c) => c.id !== realId);
                return { ...old, conversations: next, count: next.length };
            });
        },
        [qc],
    );

    const confirmAndArchiveConversation = useCallback(
        async (conversation: Conversation, e?: MouseEvent) => {
            e?.stopPropagation();
            e?.preventDefault();
            if (!window.confirm("Supprimer cette conversation ? Elle sera archivée.")) return;
            if (!isHelperChatUuid(conversation.id)) {
                push("Cette conversation ne peut pas être archivée.", "error");
                return;
            }
            setDeletingConversationId(conversation.id);
            try {
                await conversationsApi.archive(conversation.id, { restore: false });
                removeConversationFromListCache(conversation);
                void qc.removeQueries({ queryKey: ["chat-conversation", conversation.id] });
                void qc.removeQueries({ queryKey: ["chat-conversation", normalizeHelperConversationId(conversation.id)] });
                push("Conversation supprimée avec succès", "success");
                if (activeId != null && activeId.toLowerCase() === conversation.id.toLowerCase()) {
                    setActiveId(null);
                    setPendingMessages([]);
                    setInput("");
                    setErrorMsg(null);
                }
            } catch (err) {
                push(friendlyArchiveConversationError(err), "error");
            } finally {
                setDeletingConversationId(null);
            }
        },
        [activeId, push, qc, removeConversationFromListCache],
    );

    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [displayDetail?.messages, pendingMessages]);

    useEffect(() => {
        if (!activeId || !isAxiosError(detailError)) return;
        if (detailError.response?.status !== 404) return;
        setActiveId(null);
        setPendingMessages([]);
        push("Conversation introuvable, nouvelle conversation créée.", "neutral");
    }, [activeId, detailError, push]);

    const handleSend = async (messageOverride?: string) => {
        const msg = (messageOverride ?? input).trim();
        if (!msg || send.isPending) return;
        if (!projectId || !isHelperChatUuid(projectId)) {
            setErrorMsg("Sélectionne un projet valide pour utiliser le Copilot.");
            return;
        }
        setErrorMsg(null);
        setInput("");

        const apiMessage =
            messageContextPrefix?.trim() ? `${messageContextPrefix.trim()}\n\n${msg}` : msg;

        const tempUser: ChatMessage = {
            id: `temp-${Date.now()}`,
            conversation_id: activeId ?? "pending",
            role: "user",
            content: msg,
            created_at: new Date().toISOString(),
        };
        setPendingMessages((prev) => [...prev, tempUser]);

        try {
            const body: { message: string; conversation_id?: string; project_id?: string } = { message: apiMessage };
            const safeConversationId = activeId?.trim();
            const safeProjectId = projectId.trim();
            if (safeConversationId && isHelperChatUuid(safeConversationId)) body.conversation_id = safeConversationId;
            if (isHelperChatUuid(safeProjectId)) body.project_id = safeProjectId;

            const reply = await send.mutateAsync(body);
            const newCid = reply.conversation_id;
            if (newCid) {
                qc.setQueryData(["chat-conversation", newCid], (oldData: unknown) =>
                    mergeHelperChatReplyIntoConversationCache(oldData, reply),
                );
            }
            await qc.invalidateQueries({ queryKey: ["chat-conversations"] });
            if (!activeId && reply.conversation_id) {
                setActiveId(reply.conversation_id);
            }
            setPendingMessages([]);
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 404 && activeId) {
                setInput(msg);
                setPendingMessages((prev) => prev.filter((m) => m.id !== tempUser.id));
                setActiveId(null);
                setErrorMsg("Cette conversation n'existe plus. Réessaie, une nouvelle conversation sera créée.");
                return;
            }
            if (isAxiosError(err) && err.response?.status === 400 && activeId?.trim()) {
                try {
                    const retryBody: { message: string; project_id?: string } = { message: apiMessage };
                    if (isHelperChatUuid(projectId.trim())) retryBody.project_id = projectId.trim();
                    const retryReply = await send.mutateAsync(retryBody);
                    if (retryReply.conversation_id) {
                        qc.setQueryData(["chat-conversation", retryReply.conversation_id], (oldData: unknown) =>
                            mergeHelperChatReplyIntoConversationCache(oldData, retryReply),
                        );
                    }
                    setActiveId(retryReply.conversation_id);
                    setPendingMessages([]);
                    return;
                } catch (retryErr) {
                    setPendingMessages((prev) => prev.filter((m) => m.id !== tempUser.id));
                    setInput(msg);
                    setErrorMsg(friendlyHelperChatSendError(retryErr));
                    return;
                }
            }
            setPendingMessages((prev) => prev.filter((m) => m.id !== tempUser.id));
            setInput(msg);
            setErrorMsg(friendlyHelperChatSendError(err));
        }
    };

    const startNewConversation = () => {
        setActiveId(null);
        setPendingMessages([]);
        setInput("");
        setErrorMsg(null);
    };

    const refreshProjectContext = useCallback(() => {
        if (!projectId) return;
        void qc.invalidateQueries({ queryKey: ["project-detail", projectId] });
        void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    }, [projectId, qc]);

    const allMessages = useMemo(
        () => [...(displayDetail?.messages ?? []), ...pendingMessages],
        [displayDetail?.messages, pendingMessages],
    );

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
                            onClick={() => setActiveId(c.id)}
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
                            onClick={(e) => void confirmAndArchiveConversation(c, e)}
                            className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-r-xl border-l border-secondary/50 px-2 py-1.5 text-tertiary transition hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40"
                        >
                            <Trash01 className="size-3.5 shrink-0" aria-hidden />
                            <span className="max-w-[4.5rem] truncate text-[9px] font-semibold uppercase tracking-wide">Supprimer</span>
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

    const messageArea = (
        <div
            ref={scrollRef}
            className={cx(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain",
                compact ? "space-y-2 px-2 py-2" : "space-y-3 px-1 py-3 sm:min-h-[240px] sm:px-3",
            )}
        >
            {detailLoading ? (
                <p className="py-3 text-center text-xs text-tertiary">{compact ? "Chargement de l’échange…" : "Chargement…"}</p>
            ) : null}

            {!detailLoading && allMessages.length === 0 ? (
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
                                    onClick={() => setInput(label)}
                                    className="rounded-2xl border border-secondary/80 bg-primary px-4 py-3 text-left text-sm text-secondary shadow-sm transition hover:border-brand-secondary/50 hover:bg-brand-primary/5 hover:text-primary"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )
            ) : null}

            {allMessages.map((m) => (
                <MessageBubble key={m.id} message={m} compact={compact} />
            ))}

            {typingIndicator}
        </div>
    );

    const inputFooter = (
        <footer
            className={cx(
                "sticky bottom-0 z-20 shrink-0 border-t border-secondary/80 bg-primary/95 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-primary/80",
                compact ? "px-2 py-2" : "px-2 py-3 sm:px-3",
            )}
        >
            {errorBanner}
            <div className="flex gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void handleSend();
                        }
                    }}
                    placeholder={compact ? "Votre question sur ce projet…" : "Pose ta question au conseiller…"}
                    rows={compact ? 2 : 2}
                    className={cx(
                        "min-h-0 flex-1 resize-none rounded-2xl border border-secondary bg-primary shadow-inner outline-none transition placeholder:text-tertiary focus:border-brand-secondary focus:ring-2 focus:ring-brand-solid/25",
                        compact ? "px-2.5 py-2 text-xs" : "px-3 py-2.5 text-sm",
                    )}
                    disabled={send.isPending}
                />
                <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || send.isPending}
                    className={cx(
                        "shrink-0 self-end rounded-2xl bg-brand-solid font-semibold text-white shadow-md shadow-brand-solid/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45",
                        compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm",
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
                    {displayDetail?.conversation?.title ? (
                        <p className="mt-1 truncate text-xs text-tertiary">Conversation : {displayDetail.conversation.title}</p>
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
                                onClick={() => {
                                    if (a.action === "refresh_snapshot") refreshProjectContext();
                                    if (a.action === "new_thread") startNewConversation();
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl border border-secondary bg-primary px-3 py-2 text-xs font-semibold text-secondary transition hover:border-brand-secondary/50 hover:bg-brand-primary/5 hover:text-primary"
                            >
                                {a.action === "refresh_snapshot" ? <RefreshCw01 className="size-3.5" /> : null}
                                {a.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Questions suggérées</p>
                    <div className="mt-2 flex flex-col gap-1.5">
                        {prompts.map((label) => (
                            <button
                                key={`ins-${label}`}
                                type="button"
                                onClick={() => setInput(label)}
                                className="rounded-lg border border-transparent px-2 py-1.5 text-left text-[11px] leading-snug text-secondary transition hover:border-secondary hover:bg-secondary_subtle/80"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );

    const scoreLabel = typeof score === "number" && Number.isFinite(score) ? score.toFixed(1) : String(score ?? "—");

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
                                            setActiveId(c.id);
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
                                        onClick={(e) => void confirmAndArchiveConversation(c, e)}
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

    const compactQuickPromptsBar = compact ? (
        <div className="shrink-0 space-y-2 border-b border-secondary/50 bg-gradient-to-b from-secondary_subtle/30 to-transparent px-2.5 pb-2.5 pt-1">
            <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-secondary/80 bg-primary/90 py-2 text-[11px] font-semibold text-secondary shadow-sm transition hover:border-brand-secondary/40 hover:bg-brand-primary/5 hover:text-primary"
            >
                Historique
                {conversationsForProject.length > 0 ? (
                    <span className="rounded-full bg-secondary_subtle px-1.5 py-px text-[10px] font-bold tabular-nums text-tertiary">
                        {conversationsForProject.length}
                    </span>
                ) : null}
            </button>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-tertiary">Questions rapides</p>
            <div className="grid grid-cols-1 gap-1.5">
                {prompts.map((label) => (
                    <button
                        key={label}
                        type="button"
                        disabled={send.isPending}
                        onClick={() => void handleSend(label)}
                        className="rounded-xl border border-secondary/70 bg-primary px-2.5 py-2 text-left text-[11px] font-medium leading-snug text-primary shadow-sm ring-1 ring-black/[0.03] transition hover:border-brand-secondary/45 hover:bg-brand-primary/5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    ) : null;

    if (compact) {
        return (
            <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-secondary/80 bg-primary shadow-sm ring-1 ring-secondary/30">
                <div className="shrink-0 border-b border-secondary/70 bg-gradient-to-br from-brand-primary_alt/18 via-primary to-transparent px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Copilot projet</p>
                    <p className="mt-1 truncate text-sm font-semibold tracking-tight text-primary">{displayName}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                        <span className="inline-flex items-center rounded-full border border-secondary/80 bg-primary/90 px-2 py-0.5 text-[10px] text-secondary">
                            Score <span className="ml-0.5 tabular-nums font-semibold text-primary">{scoreLabel}</span>
                        </span>
                        <span className="inline-flex items-center rounded-full border border-brand-secondary/35 bg-brand-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {String(decision)}
                        </span>
                        <span
                            className={cx(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                                alertsCount > 0
                                    ? "border border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-100"
                                    : "border border-secondary/70 bg-secondary_subtle text-secondary",
                            )}
                        >
                            {alertsCount} alerte{alertsCount === 1 ? "" : "s"}
                        </span>
                    </div>
                    {prefetchedContext?.aiRecommendation ? (
                        <p className="mt-2 line-clamp-2 text-[10px] leading-snug text-secondary">{prefetchedContext.aiRecommendation}</p>
                    ) : null}
                </div>
                {compactQuickPromptsBar}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {messageArea}
                    {inputFooter}
                </div>
                {compactHistoryDrawer}
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
    if (t === "project") return `/workspace/manager/projects?openProjectId=${encodeURIComponent(s.id)}`;
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
                    "max-w-[min(92%,28rem)] rounded-3xl shadow-md",
                    compact ? "max-w-[min(94%,18rem)] px-2.5 py-2 text-xs" : "px-4 py-2.5 text-sm",
                    isUser
                        ? "rounded-br-md bg-gradient-to-br from-brand-solid to-brand-secondary text-white shadow-brand-solid/25"
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
