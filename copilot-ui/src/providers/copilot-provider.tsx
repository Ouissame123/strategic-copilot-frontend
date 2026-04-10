import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { copilotDecisionsUrl, copilotInsightsUrl } from "@/copilot/api/copilot-api.config";
import { fetchCopilotInsights, getCopilotFetchErrorMessage, submitCopilotDecision } from "@/copilot/api/copilot-api.service";
import { writeCopilotMemory } from "@/copilot/copilot-memory";
import type {
    CopilotDecisionId,
    CopilotHistoryBatch,
    CopilotInsight,
    CopilotPageContext,
    CopilotTimelineEntry,
} from "@/copilot/copilot-types";

function batchId() {
    return `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function timelineId() {
    return `tl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

const SCORE_DELTA: Record<CopilotDecisionId, number> = {
    approve: 0.4,
    adjust: 0.12,
    reject: -0.38,
};

export type WhatIfRowUi = { risk: string; time: string; conf: string };

interface CopilotContextValue {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    pageContext: CopilotPageContext | null;
    setPageContext: (ctx: CopilotPageContext | null) => void;
    insights: CopilotInsight[];
    batches: CopilotHistoryBatch[];
    activeBatchIndex: number;
    selectHistoryBatch: (index: number) => void;
    loading: boolean;
    insightsError: string | null;
    /** Successful fetch returned zero insights (empty array). */
    insightsEmpty: boolean;
    clearInsightsError: () => void;
    lastSuggestionId: string | null;
    lastCompletedSuggestionId: string | null;
    runSuggestion: (suggestionId: string) => void;
    clearInsights: () => void;
    pinnedId: string | null;
    setPinnedId: (id: string | null) => void;
    contextStamp: number;
    actionFeedback: string | null;
    setActionFeedback: (msg: string | null) => void;
    whatIfIndex: number;
    setWhatIfIndex: (i: number) => void;
    /** Server-driven what-if rows; null = use built-in demo deltas in the panel */
    whatIfRows: WhatIfRowUi[] | null;
    liveViabilityScore: number;
    lastViabilityDelta: string | null;
    decisionTimeline: CopilotTimelineEntry[];
    recordDecision: (decisionId: CopilotDecisionId, insightTitle: string) => void;
}

const CopilotContext = createContext<CopilotContextValue | undefined>(undefined);

export function CopilotProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation("copilot");
    const [isOpen, setIsOpen] = useState(false);
    const [pageContext, setPageContext] = useState<CopilotPageContext | null>(null);
    const [batches, setBatches] = useState<CopilotHistoryBatch[]>([]);
    const [activeBatchIndex, setActiveBatchIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [insightsError, setInsightsError] = useState<string | null>(null);
    const [lastSuggestionId, setLastSuggestionId] = useState<string | null>(null);
    const [lastCompletedSuggestionId, setLastCompletedSuggestionId] = useState<string | null>(null);
    const [pinnedId, setPinnedId] = useState<string | null>(null);
    const [contextStamp, setContextStamp] = useState(0);
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);
    const [whatIfIndex, setWhatIfIndex] = useState(0);
    const [whatIfRows, setWhatIfRows] = useState<WhatIfRowUi[] | null>(null);
    const [liveViabilityScore, setLiveViabilityScore] = useState(7.2);
    const [lastViabilityDelta, setLastViabilityDelta] = useState<string | null>(null);
    const [decisionTimeline, setDecisionTimeline] = useState<CopilotTimelineEntry[]>([]);

    const suggestionAbortRef = useRef<AbortController | null>(null);
    const runSeqRef = useRef(0);

    const insights = useMemo(
        () => batches[activeBatchIndex]?.insights ?? [],
        [batches, activeBatchIndex],
    );

    const insightsEmpty = useMemo(
        () => !loading && !insightsError && batches.length > 0 && insights.length === 0,
        [loading, insightsError, batches.length, insights.length],
    );

    const clearInsightsError = useCallback(() => setInsightsError(null), []);

    const setPageContextWrapped = useCallback((ctx: CopilotPageContext | null) => {
        setPageContext(ctx);
        setContextStamp((s) => s + 1);
        setBatches([]);
        setActiveBatchIndex(0);
        setLastSuggestionId(null);
        setLastCompletedSuggestionId(null);
        setPinnedId(null);
        setLastViabilityDelta(null);
        setInsightsError(null);
        setWhatIfRows(null);
        setWhatIfIndex(0);
    }, []);

    const selectHistoryBatch = useCallback((index: number) => {
        setActiveBatchIndex(index);
    }, []);

    useEffect(() => {
        if (batches.length === 0) {
            setActiveBatchIndex(0);
            return;
        }
        setActiveBatchIndex((i) => (i >= batches.length ? batches.length - 1 : i));
    }, [batches.length]);

    useEffect(() => () => suggestionAbortRef.current?.abort(), []);

    const recordDecision = useCallback(
        (decisionId: CopilotDecisionId, insightTitle: string) => {
            const d = SCORE_DELTA[decisionId];
            const deltaStr = `${d >= 0 ? "+" : ""}${d.toFixed(2)}`;
            setLastViabilityDelta(deltaStr);

            setLiveViabilityScore((prev) => {
                const next = Math.min(10, Math.max(0, Math.round((prev + d) * 10) / 10));
                const entry: CopilotTimelineEntry = {
                    id: timelineId(),
                    decisionId,
                    insightTitle,
                    deltaDisplay: deltaStr,
                    viabilityAfter: next,
                    at: Date.now(),
                };
                setDecisionTimeline((tl) => [entry, ...tl].slice(0, 8));
                return next;
            });

            if (pageContext) {
                writeCopilotMemory({
                    routeKey: pageContext.routeKey,
                    entityId: pageContext.entityId ?? null,
                    suggestionId: lastCompletedSuggestionId,
                    insightTitle,
                });
            }

            if (copilotDecisionsUrl()) {
                void (async () => {
                    try {
                        const applied = await submitCopilotDecision(
                            {
                                decisionId,
                                insightTitle,
                                suggestionId: lastCompletedSuggestionId,
                                context: pageContext
                                    ? { routeKey: pageContext.routeKey, entityId: pageContext.entityId ?? null }
                                    : undefined,
                            },
                            {},
                        );
                        if (applied?.viabilityScore != null) {
                            setLiveViabilityScore(Math.min(10, Math.max(0, applied.viabilityScore)));
                        }
                        if (applied?.deltaDisplay) {
                            setLastViabilityDelta(applied.deltaDisplay);
                        }
                        if (applied?.timelineEntry) {
                            const entry = applied.timelineEntry;
                            setDecisionTimeline((tl) => [entry, ...tl].slice(0, 8));
                        }
                    } catch {
                        /* optimistic UI already applied */
                    }
                })();
            }
        },
        [pageContext, lastCompletedSuggestionId],
    );

    const runSuggestion = useCallback(
        (suggestionId: string) => {
            if (!pageContext) return;
            suggestionAbortRef.current?.abort();
            const ac = new AbortController();
            suggestionAbortRef.current = ac;
            const runToken = ++runSeqRef.current;

            setLoading(true);
            setInsightsError(null);
            setLastSuggestionId(suggestionId);
            setActionFeedback(null);
            setWhatIfIndex(0);

            const finishBatch = (
                sorted: CopilotInsight[],
                suggestion: string,
                opts?: { viabilityScore?: number; serverTimeline?: CopilotTimelineEntry[]; nextWhatIf?: WhatIfRowUi[] | null },
            ) => {
                const batch: CopilotHistoryBatch = {
                    id: batchId(),
                    insights: sorted,
                    suggestionId: suggestion,
                };
                setBatches((prev) => [batch, ...prev].slice(0, 3));
                setActiveBatchIndex(0);
                setLastCompletedSuggestionId(suggestion);
                if (opts?.viabilityScore != null) {
                    setLiveViabilityScore(Math.min(10, Math.max(0, opts.viabilityScore)));
                }
                if (opts?.serverTimeline?.length) {
                    setDecisionTimeline(opts.serverTimeline);
                }
                setWhatIfRows(opts?.nextWhatIf ?? null);
                const firstTitle = sorted[0]?.title ?? "";
                writeCopilotMemory({
                    routeKey: pageContext.routeKey,
                    entityId: pageContext.entityId ?? null,
                    suggestionId: suggestion,
                    insightTitle: firstTitle,
                });
            };

            const sortInsights = (list: CopilotInsight[]) =>
                [...list].sort((a, b) => {
                    const order = { must: 0, should: 1, optional: 2 };
                    return order[a.tier] - order[b.tier];
                });

            void (async () => {
                try {
                    if (copilotInsightsUrl()) {
                        const mapped = await fetchCopilotInsights(
                            {
                                suggestionId,
                                context: {
                                    routeKey: pageContext.routeKey,
                                    pageLabel: pageContext.pageLabel,
                                    entityLabel: pageContext.entityLabel,
                                    entityId: pageContext.entityId,
                                },
                            },
                            { signal: ac.signal },
                        );
                        const sorted = sortInsights(mapped.insights);
                        finishBatch(sorted, mapped.suggestionId || suggestionId, {
                            viabilityScore: mapped.viabilityScore,
                            serverTimeline: mapped.timeline,
                            nextWhatIf: mapped.whatIfRows ?? null,
                        });
                        if (mapped.viabilityDelta != null) {
                            setLastViabilityDelta(mapped.viabilityDelta);
                        }
                    } else {
                        setInsightsError(t("copilotApiNotConfigured"));
                    }
                } catch (err) {
                    if (ac.signal.aborted) return;
                    setInsightsError(getCopilotFetchErrorMessage(err));
                } finally {
                    if (runToken === runSeqRef.current) setLoading(false);
                }
            })();
        },
        [pageContext, t],
    );

    const clearInsights = useCallback(() => {
        setBatches([]);
        setActiveBatchIndex(0);
        setLastSuggestionId(null);
        setLastCompletedSuggestionId(null);
        setPinnedId(null);
        setInsightsError(null);
        setWhatIfRows(null);
        setWhatIfIndex(0);
    }, []);

    const value = useMemo(
        () => ({
            isOpen,
            setIsOpen,
            pageContext,
            setPageContext: setPageContextWrapped,
            insights,
            batches,
            activeBatchIndex,
            selectHistoryBatch,
            loading,
            insightsError,
            insightsEmpty,
            clearInsightsError,
            lastSuggestionId,
            lastCompletedSuggestionId,
            runSuggestion,
            clearInsights,
            pinnedId,
            setPinnedId,
            contextStamp,
            actionFeedback,
            setActionFeedback,
            whatIfIndex,
            setWhatIfIndex,
            whatIfRows,
            liveViabilityScore,
            lastViabilityDelta,
            decisionTimeline,
            recordDecision,
        }),
        [
            isOpen,
            pageContext,
            setPageContextWrapped,
            insights,
            batches,
            activeBatchIndex,
            selectHistoryBatch,
            loading,
            insightsError,
            insightsEmpty,
            clearInsightsError,
            lastSuggestionId,
            lastCompletedSuggestionId,
            runSuggestion,
            clearInsights,
            pinnedId,
            contextStamp,
            actionFeedback,
            whatIfIndex,
            whatIfRows,
            liveViabilityScore,
            lastViabilityDelta,
            decisionTimeline,
            recordDecision,
        ],
    );

    return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export function useCopilot(): CopilotContextValue {
    const ctx = useContext(CopilotContext);
    if (!ctx) throw new Error("useCopilot must be used within CopilotProvider");
    return ctx;
}
