/**
 * Runtime parsing of JSON bodies into strict Copilot API DTOs.
 * Used only by copilot-api.service.ts — UI never imports this file.
 */
import { ApiError } from "@/utils/apiClient";
import type {
    ApiConfidenceWire,
    ApiDecisionIdWire,
    ApiInsightTierWire,
    CopilotConfidenceSignalDto,
    CopilotDecisionOptionDto,
    CopilotDecisionResponseDto,
    CopilotDeepExplainDto,
    CopilotInsightDto,
    CopilotInsightsResponseDto,
    CopilotQuickActionDto,
    CopilotRecommendationDto,
    CopilotScoreDto,
    CopilotTimelineEntryDto,
    CopilotWhatIfResultDto,
} from "@/copilot/api/copilot-api.types";

function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null && !Array.isArray(x);
}

function str(x: unknown, field: string): string {
    if (typeof x === "string" && x.length > 0) return x;
    throw new ApiError(`Invalid Copilot response: missing or invalid "${field}"`);
}

function optStr(x: unknown): string | undefined {
    if (x === undefined || x === null) return undefined;
    if (typeof x === "string") return x;
    return undefined;
}

function optNum(x: unknown): number | undefined {
    if (x === undefined || x === null) return undefined;
    if (typeof x === "number" && !Number.isNaN(x)) return x;
    return undefined;
}

function parseConfidence(x: unknown): ApiConfidenceWire {
    if (typeof x === "string") {
        const v = x.toLowerCase();
        if (v === "low" || v === "medium" || v === "high") return v;
        const u = x.toUpperCase();
        if (u === "LOW" || u === "MEDIUM" || u === "HIGH") return x as ApiConfidenceWire;
    }
    throw new ApiError('Invalid insight: "confidence" must be low | medium | high');
}

function parseTier(x: unknown): ApiInsightTierWire {
    if (typeof x === "string") {
        const v = x.toLowerCase();
        if (v === "must" || v === "should" || v === "optional") return v;
    }
    throw new ApiError('Invalid insight: "tier" must be must | should | optional');
}

function parseDecisionOption(o: Record<string, unknown>): CopilotDecisionOptionDto {
    const id = o.id;
    if (id !== "approve" && id !== "adjust" && id !== "reject") {
        throw new ApiError('Invalid decisionOption.id');
    }
    return {
        id: id as ApiDecisionIdWire,
        impact: str(o.impact, "decisionOption.impact"),
        predictiveOutcome: optStr(o.predictiveOutcome),
        scorePreview: optStr(o.scorePreview),
        workloadPreview: optStr(o.workloadPreview),
        assignmentPreview: optStr(o.assignmentPreview),
    };
}

function parseQuickAction(o: Record<string, unknown>): CopilotQuickActionDto {
    const variant = o.variant;
    return {
        id: str(o.id, "quickAction.id"),
        label: str(o.label, "quickAction.label"),
        variant:
            variant === "primary" || variant === "secondary"
                ? variant
                : undefined,
        preview: optStr(o.preview),
        screenHint: optStr(o.screenHint),
        dataEffect: optStr(o.dataEffect),
    };
}

function parseInsightDto(raw: unknown, index: number): CopilotInsightDto {
    if (!isRecord(raw)) throw new ApiError(`Invalid insights[${index}]`);
    const decisionOptions = Array.isArray(raw.decisionOptions)
        ? raw.decisionOptions.map((x, i) => {
              if (!isRecord(x)) throw new ApiError(`Invalid decisionOptions[${i}]`);
              return parseDecisionOption(x);
          })
        : undefined;
    const quickActionsRaw = raw.quickActions;
    const quickActions: CopilotQuickActionDto[] | undefined = Array.isArray(quickActionsRaw)
        ? quickActionsRaw.map((x, i) => {
              if (!isRecord(x)) throw new ApiError(`Invalid quickActions[${i}]`);
              return parseQuickAction(x);
          })
        : undefined;

    let deepExplain: CopilotDeepExplainDto | undefined;
    if (raw.deepExplain != null) {
        if (!isRecord(raw.deepExplain)) throw new ApiError("Invalid deepExplain");
        const kf = raw.deepExplain.keyFactors;
        const rs = raw.deepExplain.reasoningSteps;
        deepExplain = {
            keyFactors: Array.isArray(kf) ? kf.filter((x): x is string => typeof x === "string") : [],
            reasoningSteps: Array.isArray(rs) ? rs.filter((x): x is string => typeof x === "string") : [],
        };
    }

    let confidenceSignals: CopilotConfidenceSignalDto[] | undefined;
    if (Array.isArray(raw.confidenceSignals)) {
        confidenceSignals = raw.confidenceSignals.map((s, i) => {
            if (!isRecord(s)) throw new ApiError(`Invalid confidenceSignals[${i}]`);
            return {
                id: str(s.id, "signal.id"),
                label: str(s.label, "signal.label"),
                hint: str(s.hint, "signal.hint"),
            };
        });
    }

    let recommendation: CopilotRecommendationDto | undefined;
    if (raw.recommendation != null && isRecord(raw.recommendation)) {
        recommendation = { applyLabel: optStr(raw.recommendation.applyLabel) };
    }

    const impactTagHints = raw.impactTagHints;
    let hints: Record<string, string> | undefined;
    if (impactTagHints != null && isRecord(impactTagHints)) {
        hints = {};
        for (const [k, v] of Object.entries(impactTagHints)) {
            if (typeof v === "string") hints[k] = v;
        }
    }

    return {
        id: str(raw.id, "insight.id"),
        title: str(raw.title, "insight.title"),
        body: str(raw.body, "insight.body"),
        tier: parseTier(raw.tier),
        confidence: parseConfidence(raw.confidence),
        quickLine: optStr(raw.quickLine),
        impactTags: Array.isArray(raw.impactTags)
            ? raw.impactTags.filter((x): x is string => typeof x === "string")
            : undefined,
        impactTagHints: hints,
        whyBullets: Array.isArray(raw.whyBullets)
            ? raw.whyBullets.filter((x): x is string => typeof x === "string")
            : undefined,
        strategicHints: Array.isArray(raw.strategicHints)
            ? raw.strategicHints.filter((x): x is string => typeof x === "string")
            : undefined,
        decisionOptions,
        confidenceSignals,
        deepExplain,
        quickActions,
        applyRecommendationLabel: optStr(raw.applyRecommendationLabel),
        recommendation,
    };
}

function parseScore(raw: unknown): CopilotScoreDto | undefined {
    if (raw == null) return undefined;
    if (!isRecord(raw)) return undefined;
    const value = optNum(raw.value);
    if (value === undefined) return undefined;
    return {
        value,
        max: optNum(raw.max),
        label: optStr(raw.label),
    };
}

function parseTimelineEntry(raw: unknown, index: number): CopilotTimelineEntryDto {
    if (!isRecord(raw)) throw new ApiError(`Invalid timeline[${index}]`);
    const decisionId = raw.decisionId;
    if (decisionId !== "approve" && decisionId !== "adjust" && decisionId !== "reject") {
        throw new ApiError(`Invalid timeline[${index}].decisionId`);
    }
    const at = optNum(raw.at);
    if (at === undefined) throw new ApiError(`Invalid timeline[${index}].at`);
    return {
        id: str(raw.id, "timeline.id"),
        decisionId: decisionId as ApiDecisionIdWire,
        insightTitle: str(raw.insightTitle, "timeline.insightTitle"),
        deltaDisplay: str(raw.deltaDisplay, "timeline.deltaDisplay"),
        viabilityAfter: optNum(raw.viabilityAfter) ?? 0,
        at,
    };
}

function parseWhatIf(raw: unknown): CopilotWhatIfResultDto | null | undefined {
    if (raw == null) return undefined;
    if (!isRecord(raw)) return null;
    const rows = raw.rows;
    if (!Array.isArray(rows)) return null;
    return {
        rows: rows.map((r, i) => {
            if (!isRecord(r)) throw new ApiError(`Invalid whatIf.rows[${i}]`);
            return {
                risk: str(r.risk, "whatIf.risk"),
                time: str(r.time, "whatIf.time"),
                conf: str(r.conf, "whatIf.conf"),
            };
        }),
    };
}

/** Validates and normalizes POST /v1/copilot/insights JSON. */
export function parseCopilotInsightsResponse(data: unknown): CopilotInsightsResponseDto {
    if (!isRecord(data)) {
        throw new ApiError("Invalid Copilot insights response: expected JSON object");
    }
    const suggestionId = str(data.suggestionId, "suggestionId");
    const insightsRaw = data.insights;
    if (!Array.isArray(insightsRaw)) {
        throw new ApiError('Invalid Copilot insights response: "insights" must be an array');
    }
    const insights: CopilotInsightDto[] = insightsRaw.map((item, i) => parseInsightDto(item, i));

    let timeline: CopilotTimelineEntryDto[] | undefined;
    if (data.timeline != null) {
        if (!Array.isArray(data.timeline)) throw new ApiError('"timeline" must be an array');
        timeline = data.timeline.map((t, i) => parseTimelineEntry(t, i));
    }

    return {
        suggestionId,
        insights,
        score: parseScore(data.score),
        viabilityDelta: data.viabilityDelta === null ? null : optStr(data.viabilityDelta),
        timeline,
        whatIf: parseWhatIf(data.whatIf),
    };
}

/** Validates POST /v1/copilot/decisions JSON. Returns null for empty body. */
export function parseCopilotDecisionResponse(data: unknown): CopilotDecisionResponseDto | null {
    if (data == null) return null;
    if (typeof data === "object" && data !== null && Object.keys(data as object).length === 0) {
        return null;
    }
    if (!isRecord(data)) {
        throw new ApiError("Invalid Copilot decision response: expected JSON object");
    }
    const viabilityScore = optNum(data.viabilityScore);
    const deltaDisplay = optStr(data.deltaDisplay);
    let timelineEntry: CopilotTimelineEntryDto | undefined;
    if (data.timelineEntry != null) {
        timelineEntry = parseTimelineEntry(data.timelineEntry, 0);
    }
    const out: CopilotDecisionResponseDto = {};
    if (viabilityScore !== undefined) out.viabilityScore = viabilityScore;
    if (deltaDisplay !== undefined) out.deltaDisplay = deltaDisplay;
    if (timelineEntry !== undefined) out.timelineEntry = timelineEntry;
    return Object.keys(out).length === 0 ? null : out;
}
