import type { CopilotSuggestion } from "./copilot-types";

const DEFAULT: CopilotSuggestion[] = [
    { id: "summarize", labelKey: "suggestions.summarize" },
    { id: "priorities", labelKey: "suggestions.priorities" },
    { id: "risks", labelKey: "suggestions.risks" },
];

const DASHBOARD: CopilotSuggestion[] = [
    { id: "portfolio_summary", labelKey: "suggestions.portfolioSummary" },
    { id: "priorities", labelKey: "suggestions.priorities" },
    { id: "risks", labelKey: "suggestions.risks" },
];

const PROJECT: CopilotSuggestion[] = [
    { id: "why_at_risk", labelKey: "suggestions.whyAtRisk" },
    { id: "best_team", labelKey: "suggestions.bestTeam" },
    { id: "explain_score", labelKey: "suggestions.explainScore" },
    { id: "next_action", labelKey: "suggestions.nextAction" },
];

const USERS: CopilotSuggestion[] = [
    { id: "access_patterns", labelKey: "suggestions.accessPatterns" },
    { id: "permission_review", labelKey: "suggestions.permissionReview" },
    { id: "summarize", labelKey: "suggestions.summarize" },
];

const DECISIONS: CopilotSuggestion[] = [
    { id: "explain_score", labelKey: "suggestions.explainScore" },
    { id: "trend", labelKey: "suggestions.trend" },
    { id: "next_action", labelKey: "suggestions.nextAction" },
];

export function getSuggestionsForRoute(routeKey: string): CopilotSuggestion[] {
    switch (routeKey) {
        case "dashboard":
            return DASHBOARD;
        case "projects":
            return PROJECT.slice(0, 3);
        case "project-detail":
            return PROJECT;
        case "users":
            return USERS;
        case "decision-log":
            return DECISIONS;
        default:
            return DEFAULT;
    }
}

/** Reorder chips: boost relevance from last completed suggestion + entity context. */
export function getOrderedSuggestions(
    routeKey: string,
    lastCompletedSuggestionId: string | null,
    entityId?: string,
): { ordered: CopilotSuggestion[]; primaryId: string | null } {
    const base = [...getSuggestionsForRoute(routeKey)];
    if (base.length === 0) return { ordered: [], primaryId: null };

    const score = (s: CopilotSuggestion): number => {
        let n = 0;
        if (entityId) {
            if (s.id === "why_at_risk" || s.id === "best_team") n += 2;
            if (s.id === "explain_score") n += 1;
        } else {
            if (s.id === "portfolio_summary" || s.id === "priorities") n += 2;
        }
        if (lastCompletedSuggestionId === s.id) n -= 1;
        if (lastCompletedSuggestionId === "why_at_risk" && s.id === "best_team") n += 2;
        if (lastCompletedSuggestionId === "explain_score" && s.id === "next_action") n += 2;
        return n;
    };

    base.sort((a, b) => score(b) - score(a));
    const primaryId = base[0]?.id ?? null;
    return { ordered: base, primaryId };
}

export const STARTER_PROMPT_IDS = ["portfolio_summary", "priorities", "risks"] as const;
