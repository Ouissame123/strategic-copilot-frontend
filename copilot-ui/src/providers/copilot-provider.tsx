import type { MutableRefObject, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isCopilotDecisionSubmitEnabled, postStrategicDecision } from "@/api/copilot.api";
import { fetchCopilotByScope } from "@/hooks/use-copilot-query";
import type {
    CopilotAssistantStructured,
    CopilotChatPageContext,
    CopilotMessage,
    CopilotPageContext,
    CopilotResponse,
    SaveCopilotDecisionPayload,
} from "@/types/copilot";
import { ApiError, apiPost } from "@/utils/apiClient";
import { useToast } from "@/providers/toast-provider";

function pickStr(obj: Record<string, unknown>, keys: string[]): string | undefined {
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return undefined;
}

function getCopilotInsightsUrl(): string {
    const explicit = (import.meta.env.VITE_COPILOT_INSIGHTS_URL as string | undefined)?.trim();
    return explicit && explicit.length > 0 ? explicit : "/webhook/v1/copilot/insights";
}

function createMessageId(): string {
    const c = globalThis.crypto as Crypto | undefined;
    if (c && typeof c.randomUUID === "function") {
        return c.randomUUID();
    }
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Body `context` pour POST insights — clés stables côté Manager. */
function buildInsightsContextPayload(raw: Record<string, unknown>): Record<string, unknown> {
    const portfolio_summary = raw.portfolio_summary ?? raw.summary ?? {};
    const projects = raw.projects ?? raw.items ?? [];
    const kpi = raw.kpi ?? {};
    const alerts = raw.alerts ?? [];
    return { portfolio_summary, projects, kpi, alerts };
}

function parseAssistantFromResponse(raw: unknown): { structured?: CopilotAssistantStructured; display: string } {
    const root = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const payload =
        root.data && typeof root.data === "object" && !Array.isArray(root.data)
            ? (root.data as Record<string, unknown>)
            : root;

    const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
    const explanation = typeof payload.explanation === "string" ? payload.explanation.trim() : "";
    const recommendations_text = Array.isArray(payload.recommendations_text)
        ? payload.recommendations_text.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        : [];

    const structured: CopilotAssistantStructured = {
        summary,
        explanation,
        recommendations_text,
    };

    const parts: string[] = [];
    if (summary) parts.push(summary);
    if (explanation) parts.push(explanation);
    if (recommendations_text.length > 0) parts.push(recommendations_text.join("\n"));
    const fallback = pickStr(payload, ["message"]) || pickStr(root, ["message"]) || "—";
    const display = parts.length > 0 ? parts.join("\n\n") : fallback;

    return {
        structured: summary || explanation || recommendations_text.length > 0 ? structured : undefined,
        display,
    };
}

export interface CopilotContextValue {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    toggleOpen: () => void;
    pageContext: CopilotPageContext | null;
    setPageContext: (ctx: CopilotPageContext | null) => void;
    /** Données brutes du dernier GET réussi pour le contexte courant. */
    data: CopilotResponse | null;
    loading: boolean;
    error: string | null;
    empty: boolean;
    refreshCopilot: () => void;
    decisionSubmitLoading: boolean;
    decisionSubmitError: string | null;
    decisionSubmitSuccess: boolean;
    saveDecision: (payload: Omit<SaveCopilotDecisionPayload, "scope" | "project_id" | "enterprise_id" | "manager_id"> & { reason?: string }) => Promise<void>;
    clearDecisionFeedback: () => void;
    decisionSubmitEnabled: boolean;
    /** Chat Copilot (POST — même URL que les insights). */
    messages: CopilotMessage[];
    sendMessage: (userMessage: string) => Promise<CopilotAssistantStructured | null>;
    chatLoading: boolean;
    currentContext: CopilotChatPageContext;
    setCopilotChatContext: (page: string, dataRef: MutableRefObject<Record<string, unknown>> | null) => void;
}

const CopilotContext = createContext<CopilotContextValue | undefined>(undefined);

function isEmptyPayload(data: CopilotResponse | null): boolean {
    if (!data || typeof data !== "object") return true;
    const has =
        (data.summary != null && String(data.summary).trim() !== "") ||
        (data.explanation != null && String(data.explanation).trim() !== "") ||
        (data.viability_score != null && !Number.isNaN(Number(data.viability_score))) ||
        (data.decision != null && String(data.decision).trim() !== "") ||
        (data.confidence != null && !Number.isNaN(Number(data.confidence))) ||
        (Array.isArray(data.risks) && data.risks.length > 0) ||
        (Array.isArray(data.insights) && data.insights.length > 0) ||
        (Array.isArray(data.recommendations) && data.recommendations.length > 0) ||
        (Array.isArray(data.recommendations_text) && data.recommendations_text.length > 0);
    return !has;
}

export function CopilotProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation("copilot");
    const { push: pushToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [pageContext, setPageContextState] = useState<CopilotPageContext | null>(null);
    const [data, setData] = useState<CopilotResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [decisionSubmitLoading, setDecisionSubmitLoading] = useState(false);
    const [decisionSubmitError, setDecisionSubmitError] = useState<string | null>(null);
    const [decisionSubmitSuccess, setDecisionSubmitSuccess] = useState(false);

    const [messages, setMessages] = useState<CopilotMessage[]>([]);
    const messagesRef = useRef<CopilotMessage[]>([]);
    const [currentContext, setCurrentContextState] = useState<CopilotChatPageContext>({ page: "", data: {} });
    const copilotPageDataRef = useRef<MutableRefObject<Record<string, unknown>> | null>(null);
    const [chatLoading, setChatLoading] = useState(false);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const fetchSeq = useRef(0);
    const abortRef = useRef<AbortController | null>(null);

    const fetchable = pageContext && pageContext.scope !== "none";

    const runFetch = useCallback(async () => {
        if (!pageContext || pageContext.scope === "none") {
            setData(null);
            setError(null);
            setLoading(false);
            return;
        }
        if (pageContext.scope === "project_detail" && !pageContext.projectId?.trim()) {
            setData(null);
            setError(t("panelProjectIdMissing"));
            setLoading(false);
            return;
        }

        const seq = ++fetchSeq.current;
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        setLoading(true);
        setError(null);
        setDecisionSubmitSuccess(false);
        setDecisionSubmitError(null);

        try {
            const res = await fetchCopilotByScope(pageContext.scope, pageContext.projectId, {}, { signal: ac.signal });
            if (seq !== fetchSeq.current) return;
            setData(res);
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            if (seq !== fetchSeq.current) return;
            const msg =
                e instanceof ApiError
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : t("panelLoadError");
            setData(null);
            setError(msg);
        } finally {
            if (seq === fetchSeq.current) setLoading(false);
        }
    }, [pageContext, t]);

    const setPageContext = useCallback((ctx: CopilotPageContext | null) => {
        setPageContextState(ctx);
        setData(null);
        setError(null);
        setDecisionSubmitSuccess(false);
        setDecisionSubmitError(null);
    }, []);

    useEffect(() => {
        if (!isOpen || !fetchable) return;
        void runFetch();
    }, [isOpen, fetchable, pageContext?.scope, pageContext?.projectId, pageContext?.pageLabel, runFetch]);

    const refreshCopilot = useCallback(() => {
        void runFetch();
    }, [runFetch]);

    const clearDecisionFeedback = useCallback(() => {
        setDecisionSubmitError(null);
        setDecisionSubmitSuccess(false);
    }, []);

    const saveDecision = useCallback(
        async (partial: Omit<SaveCopilotDecisionPayload, "scope" | "project_id" | "enterprise_id" | "manager_id"> & { reason?: string }) => {
            if (!pageContext || pageContext.scope === "none") return;
            const projectId = pageContext.projectId?.trim();
            if (!projectId) {
                const msg = t("panelProjectIdMissing");
                setDecisionSubmitError(msg);
                pushToast(msg, "error", 6000);
                return;
            }
            setDecisionSubmitLoading(true);
            setDecisionSubmitError(null);
            setDecisionSubmitSuccess(false);
            try {
                await postStrategicDecision(
                    {
                        project_id: projectId,
                        decision: String(partial.decision),
                        source: "copilot",
                    },
                    {},
                );
                setDecisionSubmitSuccess(true);
                pushToast(t("decisionSaved"), "success", 5000);
                await runFetch();
            } catch (e) {
                const status = e instanceof ApiError ? e.status : undefined;
                const msg =
                    e instanceof ApiError
                        ? status === 400
                            ? t("chatError400")
                            : status === 401
                              ? t("chatError401")
                              : status === 403
                                ? t("chatError403")
                                : e.message
                        : e instanceof Error
                          ? e.message
                          : t("decisionSaveError");
                setDecisionSubmitError(msg);
                pushToast(msg, "error", 6000);
            } finally {
                setDecisionSubmitLoading(false);
            }
        },
        [pageContext, pushToast, runFetch, t],
    );

    const empty = !loading && !error && isEmptyPayload(data);

    const toggleOpen = useCallback(() => setIsOpen((o) => !o), []);

    const decisionSubmitEnabled = isCopilotDecisionSubmitEnabled();

    const setCopilotChatContext = useCallback((page: string, dataRef: MutableRefObject<Record<string, unknown>> | null) => {
        copilotPageDataRef.current = dataRef;
        setCurrentContextState({ page, data: dataRef?.current ?? {} });
    }, []);

    const sendMessage = useCallback(
        async (userMessage: string): Promise<CopilotAssistantStructured | null> => {
            const trimmed = userMessage.trim();
            if (!trimmed || chatLoading) return null;

            const userMsg: CopilotMessage = {
                id: createMessageId(),
                role: "user",
                content: trimmed,
                timestamp: Date.now(),
            };

            setMessages((prev) => {
                const next = [...prev, userMsg];
                messagesRef.current = next;
                return next;
            });
            setChatLoading(true);

            const url = getCopilotInsightsUrl();
            const freshData = copilotPageDataRef.current?.current ?? {};
            const currentPage = (currentContext.page || "manager_dashboard").trim() || "manager_dashboard";

            try {
                const payload = {
                    message: trimmed,
                    page: currentPage,
                    context: buildInsightsContextPayload(freshData),
                    meta: {
                        source: "copilot_panel",
                        role: "manager",
                        scope: currentPage,
                    },
                };

                const raw = await apiPost<unknown>(url, payload);
                const parsed = parseAssistantFromResponse(raw);

                const assistantMsg: CopilotMessage = {
                    id: createMessageId(),
                    role: "assistant",
                    content: parsed.display,
                    timestamp: Date.now(),
                    structured: parsed.structured,
                };

                setMessages((prev) => {
                    const updated = [...prev, assistantMsg];
                    messagesRef.current = updated;
                    return updated;
                });
                return parsed.structured ?? null;
            } catch (err) {
                const status = err instanceof ApiError ? err.status : undefined;
                const fallback =
                    status === 400 ? t("chatError400") : status === 401 ? t("chatError401") : status === 403 ? t("chatError403") : t("chatErrorFallback");
                const errorMsg: CopilotMessage = {
                    id: createMessageId(),
                    role: "assistant",
                    content: err instanceof ApiError ? fallback : t("chatErrorFallback"),
                    timestamp: Date.now(),
                    error: true,
                };
                setMessages((prev) => {
                    const updated = [...prev, errorMsg];
                    messagesRef.current = updated;
                    return updated;
                });
                // eslint-disable-next-line no-console
                console.error("Copilot API error:", err);
                return null;
            } finally {
                setChatLoading(false);
            }
        },
        [chatLoading, currentContext.page, t],
    );

    const value = useMemo(
        () => ({
            isOpen,
            setIsOpen,
            toggleOpen,
            pageContext,
            setPageContext,
            data,
            loading,
            error,
            empty,
            refreshCopilot,
            decisionSubmitLoading,
            decisionSubmitError,
            decisionSubmitSuccess,
            saveDecision,
            clearDecisionFeedback,
            decisionSubmitEnabled,
            messages,
            sendMessage,
            chatLoading,
            currentContext,
            setCopilotChatContext,
        }),
        [
            isOpen,
            pageContext,
            data,
            loading,
            error,
            empty,
            refreshCopilot,
            decisionSubmitLoading,
            decisionSubmitError,
            decisionSubmitSuccess,
            saveDecision,
            clearDecisionFeedback,
            decisionSubmitEnabled,
            toggleOpen,
            messages,
            sendMessage,
            chatLoading,
            currentContext,
            setCopilotChatContext,
        ],
    );

    return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export function useCopilot(): CopilotContextValue {
    const ctx = useContext(CopilotContext);
    if (!ctx) throw new Error("useCopilot must be used within CopilotProvider");
    return ctx;
}
