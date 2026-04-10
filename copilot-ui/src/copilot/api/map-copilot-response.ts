import type {
    ApiConfidenceWire,
    ApiDecisionIdWire,
    CopilotDecisionOptionDto,
    CopilotDecisionResponseDto,
    CopilotInsightsResponseDto,
    CopilotInsightDto,
    CopilotTimelineEntryDto,
    CopilotWhatIfResultDto,
} from "@/copilot/api/copilot-api.types";
import type {
    CopilotConfidence,
    CopilotDecisionId,
    CopilotInsight,
    CopilotInsightTier,
    CopilotQuickAction,
    CopilotTimelineEntry,
} from "@/copilot/copilot-types";

function normalizeConfidence(c: ApiConfidenceWire): CopilotConfidence {
    const v = String(c).toLowerCase();
    if (v === "low" || v === "medium" || v === "high") return v;
    return "medium";
}

function normalizeTier(t: CopilotInsightDto["tier"]): CopilotInsightTier {
    const v = String(t).toLowerCase();
    if (v === "must" || v === "should" || v === "optional") return v;
    return "should";
}

function normalizeDecisionId(id: ApiDecisionIdWire): CopilotDecisionId {
    const v = String(id).toLowerCase();
    if (v === "approve" || v === "adjust" || v === "reject") return v;
    return "adjust";
}

function mapDecisionOption(o: CopilotDecisionOptionDto) {
    return {
        id: normalizeDecisionId(o.id),
        impact: o.impact,
        predictiveOutcome: o.predictiveOutcome,
        scorePreview: o.scorePreview,
        workloadPreview: o.workloadPreview,
        assignmentPreview: o.assignmentPreview,
    };
}

function mapQuickAction(a: NonNullable<CopilotInsightDto["quickActions"]>[number]): CopilotQuickAction {
    return {
        id: a.id,
        label: a.label,
        variant: a.variant,
        preview: a.preview,
        screenHint: a.screenHint,
        dataEffect: a.dataEffect,
    };
}

export function mapInsightDto(dto: CopilotInsightDto): CopilotInsight {
    const applyFromRec = dto.recommendation?.applyLabel;
    return {
        id: dto.id,
        title: dto.title,
        body: dto.body,
        quickLine: dto.quickLine,
        confidence: normalizeConfidence(dto.confidence),
        impactTags: Array.isArray(dto.impactTags) ? dto.impactTags : [],
        impactTagHints: dto.impactTagHints,
        whyBullets: dto.whyBullets?.length
            ? ([dto.whyBullets[0], dto.whyBullets[1]] as [string, string?])
            : undefined,
        quickActions: (dto.quickActions ?? []).map(mapQuickAction),
        tier: normalizeTier(dto.tier),
        deepExplain: dto.deepExplain
            ? {
                  keyFactors: dto.deepExplain.keyFactors ?? [],
                  reasoningSteps: dto.deepExplain.reasoningSteps ?? [],
              }
            : undefined,
        decisionOptions: dto.decisionOptions?.map(mapDecisionOption),
        confidenceSignals: dto.confidenceSignals?.map((s) => ({
            id: s.id,
            label: s.label,
            hint: s.hint,
        })),
        strategicHints: dto.strategicHints,
        applyRecommendationLabel: dto.applyRecommendationLabel ?? applyFromRec,
    };
}

export function mapTimelineEntryDto(e: CopilotTimelineEntryDto): CopilotTimelineEntry {
    return {
        id: e.id,
        decisionId: normalizeDecisionId(e.decisionId),
        insightTitle: e.insightTitle,
        deltaDisplay: e.deltaDisplay,
        viabilityAfter: e.viabilityAfter,
        at: e.at,
    };
}

export function mapWhatIfResult(dto: CopilotWhatIfResultDto | null | undefined): Array<{ risk: string; time: string; conf: string }> | null {
    if (!dto?.rows?.length) return null;
    return dto.rows.map((r) => ({ risk: r.risk, time: r.time, conf: r.conf }));
}

/** UI-ready payload after insights API — consumed only by CopilotProvider. */
export interface MappedCopilotBatchPayload {
    suggestionId: string;
    insights: CopilotInsight[];
    viabilityScore?: number;
    viabilityDelta?: string | null;
    timeline?: CopilotTimelineEntry[];
    whatIfRows?: Array<{ risk: string; time: string; conf: string }> | null;
}

/** UI-ready slice after decision API — optional reconciliation with optimistic state. */
export interface MappedDecisionPayload {
    viabilityScore?: number;
    deltaDisplay?: string;
    timelineEntry?: CopilotTimelineEntry;
}

/** Maps a validated insights DTO into UI models for CopilotPanel. */
export function mapCopilotInsightsResponse(dto: CopilotInsightsResponseDto): MappedCopilotBatchPayload {
    const insights = (dto.insights ?? []).map(mapInsightDto);
    const timeline = dto.timeline?.length ? dto.timeline.map(mapTimelineEntryDto) : undefined;
    const whatIfRows = mapWhatIfResult(dto.whatIf ?? undefined);

    return {
        suggestionId: dto.suggestionId,
        insights,
        viabilityScore: dto.score?.value,
        viabilityDelta: dto.viabilityDelta ?? undefined,
        timeline,
        whatIfRows,
    };
}

/** Maps a validated decision DTO into UI timeline/score fields. */
export function mapCopilotDecisionResponse(dto: CopilotDecisionResponseDto): MappedDecisionPayload {
    return {
        viabilityScore: dto.viabilityScore,
        deltaDisplay: dto.deltaDisplay,
        timelineEntry: dto.timelineEntry ? mapTimelineEntryDto(dto.timelineEntry) : undefined,
    };
}
