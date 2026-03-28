/**
 * Wire / backend contract for Copilot. Maps to UI models via map-copilot-response.ts.
 * Keep in sync with your API OpenAPI or backend team.
 */

export type ApiConfidenceWire = "low" | "medium" | "high" | "LOW" | "MEDIUM" | "HIGH";

export type ApiDecisionIdWire = "approve" | "adjust" | "reject";

export type ApiInsightTierWire = "must" | "should" | "optional";

/** Viability / composite score (e.g. 0–10). */
export interface CopilotScoreDto {
    value: number;
    /** Display scale, default 10 */
    max?: number;
    /** Optional label from backend */
    label?: string;
}

export interface CopilotDecisionOptionDto {
    id: ApiDecisionIdWire;
    impact: string;
    predictiveOutcome?: string;
    scorePreview?: string;
    workloadPreview?: string;
    assignmentPreview?: string;
}

export interface CopilotExplanationDto {
    quickLine?: string;
    body: string;
    keyFactors?: string[];
    reasoningSteps?: string[];
}

export interface CopilotRecommendationDto {
    /** Maps to applyRecommendationLabel on insight */
    applyLabel?: string;
}

export interface CopilotConfidenceSignalDto {
    id: string;
    label: string;
    hint: string;
}

export interface CopilotQuickActionDto {
    id: string;
    label: string;
    variant?: "primary" | "secondary";
    preview?: string;
    screenHint?: string;
    dataEffect?: string;
}

export interface CopilotDeepExplainDto {
    keyFactors: string[];
    reasoningSteps: string[];
}

export interface CopilotInsightDto {
    id: string;
    title: string;
    body: string;
    tier: ApiInsightTierWire;
    confidence: ApiConfidenceWire;
    quickLine?: string;
    impactTags?: string[];
    impactTagHints?: Record<string, string>;
    whyBullets?: string[];
    strategicHints?: string[];
    decisionOptions?: CopilotDecisionOptionDto[];
    confidenceSignals?: CopilotConfidenceSignalDto[];
    deepExplain?: CopilotDeepExplainDto;
    quickActions?: CopilotQuickActionDto[];
    applyRecommendationLabel?: string;
    recommendation?: CopilotRecommendationDto;
}

export interface CopilotTimelineEntryDto {
    id: string;
    decisionId: ApiDecisionIdWire;
    insightTitle: string;
    deltaDisplay: string;
    viabilityAfter: number;
    at: number;
}

/** One row of what-if deltas (risk / time / confidence columns). */
export interface CopilotWhatIfRowDto {
    risk: string;
    time: string;
    conf: string;
}

export interface CopilotWhatIfResultDto {
    /** Typically 3 rows aligned with presets (baseline, scenario A, …) */
    rows: CopilotWhatIfRowDto[];
}

/** POST `{base}/v1/copilot/insights` (ou URL surchargée — voir copilot-api.config.ts) */
export interface CopilotInsightsRequestDto {
    suggestionId: string;
    context: {
        routeKey: string;
        pageLabel: string;
        entityLabel?: string;
        entityId?: string;
    };
}

/**
 * Strict response body for POST insights (wire contract).
 * Parsed at runtime by copilot-api.parse.ts before mapping to UI.
 */
export interface CopilotInsightsResponseDto {
    suggestionId: string;
    insights: CopilotInsightDto[];
    score?: CopilotScoreDto;
    viabilityDelta?: string | null;
    timeline?: CopilotTimelineEntryDto[];
    whatIf?: CopilotWhatIfResultDto | null;
}

/** POST `{base}/v1/copilot/decisions` — synchro optionnelle après Continue / Adjust / Stop */
export interface CopilotDecisionSubmitDto {
    decisionId: ApiDecisionIdWire;
    insightTitle: string;
    suggestionId?: string | null;
    context?: {
        routeKey: string;
        entityId?: string | null;
    };
}

/** Response for POST decisions — server may return any subset for reconciliation. */
export interface CopilotDecisionResponseDto {
    viabilityScore?: number;
    deltaDisplay?: string;
    timelineEntry?: CopilotTimelineEntryDto;
}
