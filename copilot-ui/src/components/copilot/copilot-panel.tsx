import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Pin01, Pin02, Stars01 } from "@untitledui/icons";
import { Heading } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { readCopilotMemory } from "@/copilot/copilot-memory";
import { getOrderedSuggestions, STARTER_PROMPT_IDS } from "@/copilot/copilot-suggestions";
import type { CopilotConfidence, CopilotDecisionId, CopilotDetailLayer, CopilotInsight, CopilotInsightTier } from "@/copilot/copilot-types";
import { insightInDecisionMode } from "@/copilot/copilot-types";
import { useCopilot } from "@/providers/copilot-provider";
import { cx } from "@/utils/cx";

const confidencePct = (level: CopilotConfidence) => ({ low: 34, medium: 66, high: 92 }[level]);

function strategicLabel(id: CopilotDecisionId, t: (k: string) => string) {
    if (id === "approve") return t("decision.continueStrategic");
    if (id === "reject") return t("decision.stopStrategic");
    return t("decision.adjustStrategic");
}

function ConfidenceMeter({ level, emphasis }: { level: CopilotConfidence; emphasis?: boolean }) {
    const { t } = useTranslation("copilot");
    const active = { low: 1, medium: 2, high: 3 }[level];
    const pct = confidencePct(level);
    if (emphasis) {
        return (
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary">{pct}%</span>
                    <Badge type="pill-color" size="sm" color="brand">
                        {t(`confidence.${level}`)}
                    </Badge>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-quaternary/20">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-[width] duration-200 ease-out"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1.5" title={level}>
            {[1, 2, 3].map((i) => (
                <span
                    key={i}
                    className={cx(
                        "h-1.5 w-6 rounded-full transition-colors duration-200 ease-out",
                        i <= active ? "bg-brand-solid" : "bg-quaternary/30",
                    )}
                />
            ))}
        </div>
    );
}

function tierBorder(tier: CopilotInsightTier): string {
    switch (tier) {
        case "must":
            return "border-l-brand-600";
        case "should":
            return "border-l-utility-gray-400";
        default:
            return "border-l-utility-gray-200";
    }
}

function DecisionBlockStrategic({
    insight,
    onChoose,
}: {
    insight: CopilotInsight;
    onChoose: (id: CopilotDecisionId) => void;
}) {
    const { t } = useTranslation("copilot");
    const opts = insight.decisionOptions ?? [];
    const [successId, setSuccessId] = useState<CopilotDecisionId | null>(null);

    const pick = (id: CopilotDecisionId) => {
        setSuccessId(id);
        window.setTimeout(() => setSuccessId(null), 180);
        onChoose(id);
    };

    return (
        <div className="rounded-lg border border-brand-300/80 bg-gradient-to-br from-brand-25/95 to-primary p-3 shadow-sm ring-1 ring-brand-200/60 dark:border-brand-700 dark:from-brand-950/40 dark:ring-brand-950/20">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-800 dark:text-brand-200">{t("decisionFocus")}</p>
            <div className="mt-3 grid gap-2">
                {opts.slice(0, 3).map((o) => {
                    const desc = (
                        <span className="block max-w-xs space-y-1 text-left text-xs">
                            {o.predictiveOutcome && <span className="block font-medium text-white">{o.predictiveOutcome}</span>}
                            {o.scorePreview && (
                                <span className="block text-tooltip-supporting-text">{o.scorePreview}</span>
                            )}
                            {o.workloadPreview && (
                                <span className="block text-tooltip-supporting-text">{o.workloadPreview}</span>
                            )}
                            {o.assignmentPreview && (
                                <span className="block text-tooltip-supporting-text">{o.assignmentPreview}</span>
                            )}
                            {o.impact && <span className="block text-tooltip-supporting-text/90">{o.impact}</span>}
                        </span>
                    );
                    return (
                        <Tooltip key={o.id} title={t("predictivePreview")} description={desc} placement="left" delay={120}>
                            <button
                                type="button"
                                className={cx(
                                    "flex w-full flex-col gap-0.5 rounded-lg border border-secondary bg-primary px-3 py-2.5 text-left outline-none transition-[transform,box-shadow,border-color] duration-150 ease-out hover:border-brand-400 hover:shadow-sm",
                                    "hover:scale-[1.02] active:scale-[0.98]",
                                    successId === o.id && "ring-2 ring-utility-success-400 ring-offset-1 ring-offset-primary",
                                )}
                                onClick={() => pick(o.id)}
                            >
                                <span className="text-sm font-semibold text-primary">{strategicLabel(o.id, t)}</span>
                                <span className="text-xs text-tertiary">{o.impact}</span>
                            </button>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}

function LayerTabs({
    layer,
    setLayer,
}: {
    layer: CopilotDetailLayer;
    setLayer: (l: CopilotDetailLayer) => void;
}) {
    const { t } = useTranslation("copilot");
    const tabs: { id: CopilotDetailLayer; label: string }[] = [
        { id: "quick", label: t("layer.quick") },
        { id: "structured", label: t("layer.structured") },
        { id: "deep", label: t("layer.deep") },
    ];
    return (
        <div className="flex gap-1 rounded-lg bg-bg-secondary/60 p-0.5">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    className={cx(
                        "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors duration-150 ease-out",
                        layer === tab.id ? "bg-primary text-primary shadow-xs ring-1 ring-secondary" : "text-tertiary hover:text-secondary",
                    )}
                    onClick={() => setLayer(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

function InsightCard({
    insight,
    pinned,
    onPin,
    onQuickAction,
    onDecision,
    onApply,
    decisionModeActive,
    focusDimmed,
}: {
    insight: CopilotInsight;
    pinned: boolean;
    onPin: () => void;
    onQuickAction: (label: string, preview?: string) => void;
    onDecision: (id: CopilotDecisionId) => void;
    onApply: (insight: CopilotInsight) => void;
    decisionModeActive: boolean;
    focusDimmed: boolean;
}) {
    const { t } = useTranslation("copilot");
    const [whyOpen, setWhyOpen] = useState(false);
    const [signalsOpen, setSignalsOpen] = useState(false);
    const [layer, setLayer] = useState<CopilotDetailLayer>("quick");
    const [applyPulse, setApplyPulse] = useState(false);

    const showDecision = decisionModeActive && insightInDecisionMode(insight);
    const strongConfidence = showDecision && insight.confidence === "high";

    const layerBody = useMemo(() => {
        if (layer === "quick") {
            const q = insight.quickLine ?? (insight.body.includes(".") ? `${insight.body.split(".")[0]}.` : insight.body);
            return <p className="text-sm leading-relaxed text-secondary">{q}</p>;
        }
        if (layer === "structured") {
            if (insight.deepExplain?.keyFactors?.length) {
                return (
                    <ul className="list-inside list-disc space-y-1 text-sm text-secondary">
                        {insight.deepExplain.keyFactors.map((x) => (
                            <li key={x}>{x}</li>
                        ))}
                    </ul>
                );
            }
            return <p className="text-sm text-secondary">{insight.body}</p>;
        }
        if (layer === "deep") {
            if (insight.deepExplain?.reasoningSteps?.length) {
                return (
                    <ol className="list-inside list-decimal space-y-1 text-sm text-secondary">
                        {insight.deepExplain.reasoningSteps.map((x) => (
                            <li key={x}>{x}</li>
                        ))}
                    </ol>
                );
            }
            return <p className="text-sm text-secondary">{insight.body}</p>;
        }
        return <p className="text-sm text-secondary">{insight.body}</p>;
    }, [insight, layer]);

    return (
        <article
            className={cx(
                "rounded-xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80 ease-in-out",
                "transition-[opacity,filter,box-shadow] duration-200",
                "animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out",
                "border-l-[3px]",
                tierBorder(insight.tier),
                showDecision && "ring-2 ring-brand-300/40",
                focusDimmed && "opacity-45 saturate-50",
            )}
        >
            {insight.strategicHints && insight.strategicHints.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                    {insight.strategicHints.map((h) => (
                        <span
                            key={h}
                            className="rounded-md border border-border-secondary bg-bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-tertiary"
                        >
                            {h}
                        </span>
                    ))}
                </div>
            )}

            {showDecision && (
                <div className="mb-4">
                    <DecisionBlockStrategic insight={insight} onChoose={onDecision} />
                </div>
            )}

            <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-primary">{insight.title}</h3>
                <Button
                    size="sm"
                    color="tertiary"
                    className="shrink-0 p-1"
                    aria-label={pinned ? t("unpin") : t("pin")}
                    onClick={onPin}
                >
                    {pinned ? <Pin02 className="size-4" /> : <Pin01 className="size-4 text-fg-quaternary" />}
                </Button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
                <Tooltip title={t("tooltipScore")} description={t("tooltipScoreDesc")} placement="top" delay={200}>
                    <span className="cursor-help text-xs font-medium text-tertiary">{t("confidenceLabel")}</span>
                </Tooltip>
                <ConfidenceMeter level={insight.confidence} emphasis={strongConfidence} />
                {!strongConfidence && (
                    <span className="text-xs capitalize text-tertiary">({t(`confidence.${insight.confidence}`)})</span>
                )}
            </div>

            {insight.confidenceSignals && insight.confidenceSignals.length > 0 && (
                <div className="mt-2">
                    <Button color="link-gray" size="sm" className="h-auto gap-1 p-0" onClick={() => setSignalsOpen(!signalsOpen)}>
                        {signalsOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        {t("confidenceSignals")}
                    </Button>
                    {signalsOpen && (
                        <ul className="mt-2 space-y-2">
                            {insight.confidenceSignals.map((s) => (
                                <li key={s.id}>
                                    <Tooltip title={s.label} description={s.hint} placement="left" delay={150}>
                                        <span className="inline-flex cursor-help rounded-md bg-bg-secondary/50 px-2 py-1 text-xs text-secondary">
                                            {s.label}
                                        </span>
                                    </Tooltip>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {insight.impactTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {insight.impactTags.map((tag) => {
                        const hint = insight.impactTagHints?.[tag];
                        const badge = (
                            <Badge type="pill-color" size="sm" color="gray">
                                {tag}
                            </Badge>
                        );
                        if (hint) {
                            return (
                                <Tooltip key={tag} title={tag} description={hint} placement="top" delay={200}>
                                    <span className="inline-flex cursor-help">{badge}</span>
                                </Tooltip>
                            );
                        }
                        return <span key={tag}>{badge}</span>;
                    })}
                </div>
            )}

            <div className="mt-3">
                <LayerTabs layer={layer} setLayer={setLayer} />
                <div className="mt-4">{layerBody}</div>
            </div>

            {insight.whyBullets && insight.whyBullets[0] && (
                <div className="mt-2">
                    <Button color="link-gray" size="sm" className="h-auto p-0" onClick={() => setWhyOpen(!whyOpen)}>
                        {t("whyRating")}
                    </Button>
                    {whyOpen && (
                        <ul className="mt-2 list-inside list-disc text-xs text-tertiary">
                            {insight.whyBullets.filter(Boolean).map((b) => (
                                <li key={b}>{b}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {insight.applyRecommendationLabel && (
                <div className="mt-4 flex">
                    <Button
                        size="sm"
                        color="primary"
                        className={cx(
                            "w-full sm:w-auto transition-transform duration-150 ease-out hover:scale-[1.01] active:scale-[0.98]",
                            applyPulse && "copilot-apply-pulse ring-2 ring-brand-400/35 ring-offset-2 ring-offset-primary",
                        )}
                        onClick={() => {
                            setApplyPulse(true);
                            onApply(insight);
                            window.setTimeout(() => setApplyPulse(false), 450);
                        }}
                    >
                        {insight.applyRecommendationLabel}
                    </Button>
                </div>
            )}

            {insight.quickActions.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                    <span className="text-xs font-medium text-tertiary">{t("quickActions")}</span>
                    <div className="flex flex-wrap gap-2">
                        {insight.quickActions.map((a) => {
                            const btn = (
                                <Button
                                    size="sm"
                                    color={a.variant === "primary" ? "primary" : "secondary"}
                                    onClick={() => onQuickAction(a.label, a.preview)}
                                    className="transition-transform duration-150 active:scale-[0.98]"
                                >
                                    {a.label}
                                </Button>
                            );
                            const hasPreview = a.preview || a.screenHint || a.dataEffect;
                            if (hasPreview) {
                                return (
                                    <Tooltip
                                        key={a.id}
                                        title={t("actionPreview")}
                                        description={
                                            <span className="block max-w-xs space-y-1 whitespace-pre-line text-left">
                                                {a.preview && <span className="block">{a.preview}</span>}
                                                {a.screenHint && (
                                                    <span className="block text-tooltip-supporting-text">
                                                        {t("screenOpens")}: {a.screenHint}
                                                    </span>
                                                )}
                                                {a.dataEffect && (
                                                    <span className="block text-tooltip-supporting-text">
                                                        {t("dataEffect")}: {a.dataEffect}
                                                    </span>
                                                )}
                                            </span>
                                        }
                                        placement="left"
                                        delay={200}
                                    >
                                        <span className="inline-flex">{btn}</span>
                                    </Tooltip>
                                );
                            }
                            return <span key={a.id}>{btn}</span>;
                        })}
                    </div>
                </div>
            )}
        </article>
    );
}

function WhatIfBlock() {
    const { t } = useTranslation("copilot");
    const { whatIfIndex, setWhatIfIndex, whatIfRows } = useCopilot();
    const presets = [
        { i: 0, label: t("whatIfBaseline") },
        { i: 1, label: t("whatIfDelay") },
        { i: 2, label: t("whatIfScope") },
    ];
    const defaultDeltas = [
        { risk: "→", time: "→", conf: "→" },
        { risk: "↑", time: "↑", conf: "↓" },
        { risk: "↓", time: "→", conf: "↑" },
    ];
    const deltas =
        whatIfRows && whatIfRows.length >= 3
            ? whatIfRows.map((r) => ({ risk: r.risk, time: r.time, conf: r.conf }))
            : defaultDeltas;
    const d = deltas[whatIfIndex] ?? deltas[0];

    return (
        <details className="group rounded-xl border border-dashed border-secondary bg-primary_alt/30 p-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-primary marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                    {t("whatIfTitle")}
                    <span className="text-xs font-normal text-tertiary">{t("whatIfHint")}</span>
                </span>
            </summary>
            <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                        <Button
                            key={p.i}
                            size="sm"
                            color={whatIfIndex === p.i ? "primary" : "secondary"}
                            onClick={() => setWhatIfIndex(p.i)}
                        >
                            {p.label}
                        </Button>
                    ))}
                </div>
                <p className="text-xs text-tertiary">{t("whatIfDisclaimer")}</p>
                <div className="flex flex-wrap gap-3 text-sm text-secondary">
                    <span>
                        {t("deltaRisk")} <strong className="text-primary">{d.risk}</strong>
                    </span>
                    <span>
                        {t("deltaTime")} <strong className="text-primary">{d.time}</strong>
                    </span>
                    <span>
                        {t("deltaConfidence")} <strong className="text-primary">{d.conf}</strong>
                    </span>
                </div>
                <Button size="sm" color="link-gray" className="h-auto p-0" onClick={() => setWhatIfIndex(0)}>
                    {t("resetWhatIf")}
                </Button>
            </div>
        </details>
    );
}

function HistoryStrip() {
    const { t } = useTranslation("copilot");
    const { batches, activeBatchIndex, selectHistoryBatch } = useCopilot();
    if (batches.length <= 1) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-secondary pb-3">
            <span className="text-xs font-medium text-tertiary">{t("historyLabel")}</span>
            <div className="flex gap-1">
                {batches.map((b, i) => (
                    <Button
                        key={b.id}
                        size="sm"
                        color={activeBatchIndex === i ? "primary" : "secondary"}
                        className="min-w-10 px-2"
                        onClick={() => selectHistoryBatch(i)}
                    >
                        {i === 0 ? t("historyLatest") : `#${i + 1}`}
                    </Button>
                ))}
            </div>
        </div>
    );
}

function LiveScoreStrip() {
    const { t } = useTranslation("copilot");
    const { liveViabilityScore, lastViabilityDelta } = useCopilot();
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-secondary bg-primary px-3 py-2 text-xs transition-colors duration-200 ease-out">
            <span className="font-medium text-tertiary">{t("liveViability")}</span>
            <div className="flex items-center gap-2">
                <span
                    key={liveViabilityScore}
                    className="inline-block text-lg font-semibold tabular-nums text-primary animate-in fade-in zoom-in-95 duration-150 ease-out"
                >
                    {liveViabilityScore.toFixed(1)}
                </span>
                <span className="text-tertiary">/10</span>
                {lastViabilityDelta && (
                    <Badge
                        key={lastViabilityDelta}
                        type="pill-color"
                        size="sm"
                        color="success"
                        className="animate-in fade-in slide-in-from-right-0.5 duration-150 ease-out"
                    >
                        Δ {lastViabilityDelta}
                    </Badge>
                )}
            </div>
        </div>
    );
}

function DecisionTimelineStrip({ highlightEntryId }: { highlightEntryId: string | null }) {
    const { t } = useTranslation("copilot");
    const { decisionTimeline } = useCopilot();
    if (decisionTimeline.length === 0) return null;

    return (
        <div className="rounded-lg border border-secondary bg-primary px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-quaternary">{t("timelineTitle")}</p>
            <ul className="mt-2 max-h-28 space-y-1.5 overflow-y-auto text-xs">
                {decisionTimeline.slice(0, 5).map((e) => (
                    <li
                        key={e.id}
                        className={cx(
                            "flex flex-wrap items-baseline justify-between gap-1 border-b border-secondary/60 pb-1 transition-[background-color,box-shadow] duration-200 ease-out last:border-0",
                            highlightEntryId === e.id &&
                                "animate-in fade-in slide-in-from-top-1 rounded-md bg-brand-50/90 py-1.5 ring-1 ring-brand-200/70 duration-200 ease-out dark:bg-brand-950/35 dark:ring-brand-800/60",
                        )}
                    >
                        <span className="text-tertiary">{strategicLabel(e.decisionId, t)}</span>
                        <span className="font-medium text-primary">{e.deltaDisplay}</span>
                        <span className="w-full truncate text-[11px] text-quaternary">{e.insightTitle}</span>
                        <span className="text-[11px] text-quaternary">
                            → {e.viabilityAfter.toFixed(1)} {t("viabilityUnit")}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function MemoryContinuationRow({
    onContinue,
    onReevaluate,
}: {
    onContinue: () => void;
    onReevaluate: () => void;
}) {
    const { t } = useTranslation("copilot");
    const mem = useMemo(() => readCopilotMemory(), []);
    if (!mem?.suggestionId) return null;

    return (
        <div className="flex flex-wrap gap-2">
            <Button size="sm" color="secondary" onClick={onContinue}>
                {t("memoryContinue")}
            </Button>
            <Button size="sm" color="link-gray" className="h-auto p-0" onClick={onReevaluate}>
                {t("memoryReevaluate")}
            </Button>
        </div>
    );
}

function InsightSections({
    insights,
    pinnedId,
    setPinnedId,
    onQuickAction,
    onDecision,
    onApply,
    decisionModeActive,
    focusInsightId,
}: {
    insights: CopilotInsight[];
    pinnedId: string | null;
    setPinnedId: (id: string | null) => void;
    onQuickAction: (label: string, preview?: string) => void;
    onDecision: (id: CopilotDecisionId) => void;
    onApply: (insight: CopilotInsight) => void;
    decisionModeActive: boolean;
    focusInsightId: string | null;
}) {
    const { t } = useTranslation("copilot");

    const ordered = useMemo(() => {
        if (!pinnedId) return insights;
        const pin = insights.find((i) => i.id === pinnedId);
        const rest = insights.filter((i) => i.id !== pinnedId);
        return pin ? [pin, ...rest] : insights;
    }, [insights, pinnedId]);

    const must = ordered.filter((i) => i.tier === "must");
    const should = ordered.filter((i) => i.tier === "should");
    const optional = ordered.filter((i) => i.tier === "optional");

    const renderGroup = (label: string, items: CopilotInsight[]) =>
        items.length === 0 ? null : (
            <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{label}</p>
                {items.map((insight) => (
                    <InsightCard
                        key={insight.id}
                        insight={insight}
                        pinned={pinnedId === insight.id}
                        onPin={() => setPinnedId(pinnedId === insight.id ? null : insight.id)}
                        onQuickAction={onQuickAction}
                        onDecision={onDecision}
                        onApply={onApply}
                        decisionModeActive={decisionModeActive}
                        focusDimmed={!!focusInsightId && insight.id !== focusInsightId}
                    />
                ))}
            </div>
        );

    return (
        <div className="space-y-6">
            {renderGroup(t("tierMust"), must)}
            {renderGroup(t("tierShould"), should)}
            {renderGroup(t("tierOptional"), optional)}
        </div>
    );
}

export function CopilotPanel() {
    const { t } = useTranslation("copilot");
    const { t: tCommon } = useTranslation("common");
    const {
        isOpen,
        setIsOpen,
        pageContext,
        insights,
        loading,
        insightsError,
        insightsEmpty,
        clearInsightsError,
        lastSuggestionId,
        runSuggestion,
        clearInsights,
        pinnedId,
        setPinnedId,
        actionFeedback,
        setActionFeedback,
        lastCompletedSuggestionId,
        contextStamp,
        recordDecision,
        decisionTimeline,
    } = useCopilot();

    const [contextBanner, setContextBanner] = useState(false);
    const [topPrompt, setTopPrompt] = useState<string | null>(null);
    const [timelineHighlightId, setTimelineHighlightId] = useState<string | null>(null);
    const [feedbackPulse, setFeedbackPulse] = useState(false);
    const prevTimelineHeadRef = useRef<string | undefined>(undefined);

    const pulseFeedbackBanner = () => {
        setFeedbackPulse(true);
        window.setTimeout(() => setFeedbackPulse(false), 380);
    };

    useEffect(() => {
        if (contextStamp === 0) return;
        setContextBanner(true);
        const id = window.setTimeout(() => setContextBanner(false), 2600);
        return () => window.clearTimeout(id);
    }, [contextStamp]);

    useEffect(() => {
        if (decisionTimeline.length === 0) {
            prevTimelineHeadRef.current = undefined;
            return;
        }
        const head = decisionTimeline[0]?.id;
        if (!head) return;
        if (prevTimelineHeadRef.current === undefined) {
            prevTimelineHeadRef.current = head;
            return;
        }
        if (head !== prevTimelineHeadRef.current) {
            prevTimelineHeadRef.current = head;
            setTimelineHighlightId(head);
            const tid = window.setTimeout(() => setTimelineHighlightId(null), 1100);
            return () => window.clearTimeout(tid);
        }
    }, [decisionTimeline]);

    const { ordered: suggestions, primaryId } = useMemo(() => {
        if (!pageContext) return { ordered: [], primaryId: null as string | null };
        return getOrderedSuggestions(pageContext.routeKey, lastCompletedSuggestionId, pageContext.entityId);
    }, [pageContext, lastCompletedSuggestionId]);

    useEffect(() => {
        setTopPrompt(primaryId);
    }, [primaryId]);

    const contextLabel = pageContext
        ? [pageContext.pageLabel, pageContext.entityLabel].filter(Boolean).join(" · ")
        : t("noContext");

    const showEntityEmpty =
        pageContext &&
        !pageContext.entityId &&
        ["dashboard", "projects"].includes(pageContext.routeKey) &&
        insights.length === 0 &&
        !loading &&
        !insightsError &&
        !insightsEmpty;

    const panelDecisionMode = insights.some((i) => insightInDecisionMode(i));
    const focusInsightId = useMemo(() => {
        const critical = insights.find((i) => insightInDecisionMode(i));
        return critical?.id ?? null;
    }, [insights]);

    const handleQuick = (label: string, preview?: string) => {
        pulseFeedbackBanner();
        setActionFeedback(t("actionQueued", { label }));
        window.setTimeout(() => setActionFeedback(null), 3200);
        if (preview) console.info("[Copilot]", label, preview);
    };

    const handleApply = (insight: CopilotInsight) => {
        pulseFeedbackBanner();
        setActionFeedback(t("applyFeedback", { title: insight.title }));
        window.setTimeout(() => setActionFeedback(null), 3400);
    };

    const handleDecision = (id: CopilotDecisionId) => {
        const title = insights.find((i) => insightInDecisionMode(i))?.title ?? "Insight";
        recordDecision(id, title);
        pulseFeedbackBanner();
        setActionFeedback(t("decisionLiveFeedback", { label: strategicLabel(id, t) }));
        window.setTimeout(() => setActionFeedback(null), 4200);
    };

    const mem = useMemo(() => readCopilotMemory(), [contextStamp]);

    return (
        <SlideoutMenu isOpen={isOpen} onOpenChange={setIsOpen} isDismissable dialogClassName="bg-primary_alt">
            {({ close }) => (
                <div
                    id="ai-copilot-panel"
                    role="complementary"
                    aria-label={t("title")}
                    className={cx(
                        "flex h-full min-h-0 flex-col transition-[background-color] duration-200 ease-out",
                        panelDecisionMode && insights.length > 0 && "bg-primary",
                    )}
                >
                    <SlideoutMenu.Header onClose={close} className="border-b border-secondary pb-5 md:pb-6">
                        <div className="flex items-center gap-2 pr-10">
                            <Stars01 className="size-5 shrink-0 text-brand-600" aria-hidden />
                            <Heading slot="title" className="text-lg font-semibold text-primary">
                                {t("strategicTitle")}
                            </Heading>
                        </div>
                        <p className="mt-2 text-xs text-tertiary">{t("sortedBy")}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Badge type="pill-color" size="sm" color="brand">
                                {contextLabel}
                            </Badge>
                            {panelDecisionMode && (
                                <Badge type="pill-color" size="sm" color="brand">
                                    {t("decisionModeBadge")}
                                </Badge>
                            )}
                        </div>
                    </SlideoutMenu.Header>

                    <SlideoutMenu.Content className="gap-5 pb-10 pt-1">
                        {!loading && !insightsError && (insights.length > 0 || lastCompletedSuggestionId) && (
                            <LiveScoreStrip />
                        )}

                        {mem?.suggestionId && !loading && (
                            <MemoryContinuationRow
                                onContinue={() => runSuggestion(mem.suggestionId!)}
                                onReevaluate={() => runSuggestion(lastCompletedSuggestionId ?? mem.suggestionId!)}
                            />
                        )}

                        {decisionTimeline.length > 0 && (
                            <DecisionTimelineStrip highlightEntryId={timelineHighlightId} />
                        )}

                        {insightsError && (
                            <div className="flex flex-col gap-2 rounded-lg border border-utility-error-200 bg-utility-error-50 px-3 py-2.5 text-xs text-utility-error-800 ring-1 ring-utility-error-100 dark:border-utility-error-800 dark:bg-utility-error-950/40 dark:text-utility-error-100 dark:ring-utility-error-900">
                                <p className="font-medium">{insightsError}</p>
                                <div>
                                    <Button
                                        size="sm"
                                        color="secondary"
                                        isDisabled={loading || !lastSuggestionId}
                                        onClick={() => {
                                            clearInsightsError();
                                            if (lastSuggestionId) runSuggestion(lastSuggestionId);
                                        }}
                                    >
                                        {tCommon("retry")}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {contextBanner && (
                            <p className="animate-in fade-in slide-in-from-top-1 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800 ring-1 ring-brand-100 duration-200 ease-in-out dark:bg-brand-950/40 dark:text-brand-100 dark:ring-brand-900">
                                {t("contextUpdated")}
                            </p>
                        )}

                        {topPrompt && suggestions.length > 0 && !loading && (
                            <p className="text-xs text-tertiary">
                                {t("suggestedNext", {
                                    label: t(suggestions.find((s) => s.id === topPrompt)?.labelKey ?? "suggestions.priorities"),
                                })}
                            </p>
                        )}

                        {actionFeedback && (
                            <p
                                key={actionFeedback}
                                className={cx(
                                    "animate-in fade-in zoom-in-95 rounded-lg bg-utility-success-50 px-3 py-2 text-xs font-medium text-utility-success-800 ring-1 ring-utility-success-200 duration-200 ease-out",
                                    feedbackPulse && "copilot-apply-pulse ring-2 ring-utility-success-400/35",
                                )}
                            >
                                {actionFeedback}
                            </p>
                        )}

                        {showEntityEmpty && (
                            <div className="rounded-xl border border-dashed border-secondary bg-primary_alt/40 p-4">
                                <p className="text-sm font-medium text-primary">{t("emptyEntityTitle")}</p>
                                <p className="mt-1 text-xs text-tertiary">{t("emptyEntityBody")}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {STARTER_PROMPT_IDS.map((sid) => {
                                        const labelKey =
                                            sid === "portfolio_summary"
                                                ? "suggestions.portfolioSummary"
                                                : sid === "priorities"
                                                  ? "suggestions.priorities"
                                                  : "suggestions.risks";
                                        return (
                                            <Button
                                                key={sid}
                                                size="sm"
                                                color="secondary"
                                                onClick={() => runSuggestion(sid)}
                                                isLoading={loading}
                                            >
                                                {t(labelKey)}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <section
                            aria-label={t("suggestionsLabel")}
                            className={cx(
                                "transition-opacity duration-200 ease-out",
                                panelDecisionMode && insights.length > 0 && "opacity-50",
                            )}
                        >
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-quaternary">
                                {t("suggestionsLabel")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {suggestions.map((s) => (
                                    <Button
                                        key={s.id}
                                        size="sm"
                                        color={primaryId === s.id ? "primary" : "secondary"}
                                        className={cx(
                                            "transition-all duration-200 active:scale-[0.98]",
                                            primaryId === s.id && "ring-2 ring-brand-200 ring-offset-2 ring-offset-primary",
                                        )}
                                        isLoading={loading}
                                        onClick={() => runSuggestion(s.id)}
                                    >
                                        {t(s.labelKey)}
                                    </Button>
                                ))}
                            </div>
                        </section>

                        {loading && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out" aria-busy="true">
                                <div className="copilot-skeleton-line h-3 w-full" />
                                <div className="copilot-skeleton-line h-3 w-[92%]" />
                                <div className="copilot-skeleton-line h-3 w-4/5" />
                                <div className="copilot-skeleton-line h-24 w-full rounded-xl" />
                                <p className="text-xs text-tertiary">{t("loading")}</p>
                            </div>
                        )}

                        {!loading && insightsEmpty && (
                            <div className="flex flex-col gap-2 rounded-lg border border-secondary bg-bg-secondary/40 px-3 py-2.5 text-xs text-secondary ring-1 ring-secondary/80">
                                <p>{t("insightsEmpty")}</p>
                                <Button size="sm" color="link-gray" className="h-auto self-start p-0" onClick={clearInsights}>
                                    {t("clearInsights")}
                                </Button>
                            </div>
                        )}

                        {!loading && insights.length > 0 && (
                            <div
                                key={`${contextStamp}-${insights[0]?.id ?? "0"}`}
                                className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-in-out"
                            >
                                <HistoryStrip />
                                <InsightSections
                                    insights={insights}
                                    pinnedId={pinnedId}
                                    setPinnedId={setPinnedId}
                                    onQuickAction={handleQuick}
                                    onDecision={handleDecision}
                                    onApply={handleApply}
                                    decisionModeActive={panelDecisionMode}
                                    focusInsightId={focusInsightId}
                                />
                                <div className="mt-6">
                                    <WhatIfBlock />
                                </div>
                                <Button size="sm" color="link-gray" className="mt-4 h-auto p-0" onClick={clearInsights}>
                                    {t("clearInsights")}
                                </Button>
                            </div>
                        )}
                    </SlideoutMenu.Content>
                </div>
            )}
        </SlideoutMenu>
    );
}
