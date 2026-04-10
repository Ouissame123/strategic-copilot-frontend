export type CopilotConfidence = "low" | "medium" | "high";

export type CopilotInsightTier = "must" | "should" | "optional";

export type CopilotDecisionId = "approve" | "adjust" | "reject";

export type CopilotDetailLayer = "quick" | "structured" | "deep";

export interface CopilotQuickAction {
    id: string;
    label: string;
    variant?: "primary" | "secondary";
    /** Short line for hover (legacy) */
    preview?: string;
    /** Screen or area that will open */
    screenHint?: string;
    /** What data / records will be affected */
    dataEffect?: string;
}

export interface CopilotDecisionOption {
    id: CopilotDecisionId;
    /** One-line impact preview for this path */
    impact: string;
    /** Immediate outcome if user picks this (hover preview) */
    predictiveOutcome?: string;
    /** Score / viability line */
    scorePreview?: string;
    workloadPreview?: string;
    assignmentPreview?: string;
}

export interface CopilotConfidenceSignal {
    id: string;
    label: string;
    hint: string;
}

export interface CopilotDeepExplain {
    keyFactors: string[];
    reasoningSteps: string[];
}

export interface CopilotInsight {
    id: string;
    title: string;
    body: string;
    /** One-line quick read (layer: quick) */
    quickLine?: string;
    confidence: CopilotConfidence;
    impactTags: string[];
    /** Tooltip copy per tag (risk, skill, etc.) */
    impactTagHints?: Record<string, string>;
    whyBullets?: [string, string?];
    quickActions: CopilotQuickAction[];
    tier: CopilotInsightTier;
    /** Structured deep dive (short) */
    deepExplain?: CopilotDeepExplain;
    /** Approve / Adjust / Reject with impact — triggers decision mode UI when present (or tier must + high confidence) */
    decisionOptions?: CopilotDecisionOption[];
    /** Expandable confidence drivers */
    confidenceSignals?: CopilotConfidenceSignal[];
    /** Soft non-blocking hints */
    strategicHints?: string[];
    /** Apply shortcut label */
    applyRecommendationLabel?: string;
}

export interface CopilotPageContext {
    /** Stable key for suggestions lookup */
    routeKey: string;
    /** Human-readable page label */
    pageLabel: string;
    /** Optional entity (project id, user email, etc.) */
    entityLabel?: string;
    entityId?: string;
}

export interface CopilotSuggestion {
    id: string;
    labelKey: string;
}

export interface CopilotHistoryBatch {
    id: string;
    insights: CopilotInsight[];
    suggestionId: string;
}

export interface CopilotTimelineEntry {
    id: string;
    decisionId: CopilotDecisionId;
    insightTitle: string;
    deltaDisplay: string;
    viabilityAfter: number;
    at: number;
}

/** True when insight should show decision block (must + high confidence or explicit options). */
export function insightInDecisionMode(insight: CopilotInsight): boolean {
    if (insight.decisionOptions && insight.decisionOptions.length >= 3) return true;
    return insight.tier === "must" && insight.confidence === "high";
}
