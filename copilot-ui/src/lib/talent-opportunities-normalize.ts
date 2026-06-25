import type {
    OpportunitiesSummary,
    OpportunityDetail,
    OpportunityListItem,
} from "@/types/talent-opportunities";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function arr<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeOpportunitiesList(raw: unknown): OpportunityListItem[] {
    const root = unwrapN8nRoot(raw);
    return arr<OpportunityListItem>(root.items ?? root.opportunities ?? root.data);
}

export function normalizeOpportunitiesSummary(raw: unknown): OpportunitiesSummary {
    const root = unwrapN8nRoot(raw);
    const summary = asRecord(root.summary ?? root);
    const byTier = asRecord(summary.by_tier);
    const byReco = asRecord(summary.by_recommendation);
    return {
        total_matches: Number(summary.total_matches ?? 0),
        by_tier: {
            excellent: Number(byTier.excellent ?? 0),
            good: Number(byTier.good ?? 0),
            fair: Number(byTier.fair ?? 0),
        },
        top_score: Number(summary.top_score ?? 0),
        by_recommendation: {
            redeploy: Number(byReco.redeploy ?? 0),
            training: Number(byReco.training ?? 0),
            recruitment: Number(byReco.recruitment ?? 0),
        },
    };
}

export function normalizeOpportunityDetail(raw: unknown): OpportunityDetail {
    const root = unwrapN8nRoot(raw);
    return {
        opportunity: (root.opportunity ?? root) as OpportunityDetail["opportunity"],
        skill_details: arr(root.skill_details),
        recommended_actions: arr(root.recommended_actions),
        my_interest: (root.my_interest as OpportunityDetail["my_interest"]) ?? null,
    };
}
