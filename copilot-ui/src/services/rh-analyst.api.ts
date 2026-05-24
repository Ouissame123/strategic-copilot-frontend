/**
 * Services WF Analyst RH — insights IPI & 9-Box pour le dashboard.
 */
export {
    fetchRhAnalystIpi,
    fetchRhAnalystNineBox,
    fetchRhAnalystInsights,
    normalizeRhAnalystIpiResponse,
    normalizeRhAnalystNineBoxResponse,
    RhAnalystApiError,
    RH_ANALYST_IPI_URL,
    RH_ANALYST_NINE_BOX_URL,
} from "@/api/rh-analyst.api";

export type {
    RhAnalystFetchBody,
    RhAnalystInsightsResult,
    RhAnalystIpiDistribution,
    RhAnalystIpiResponse,
    RhAnalystNineBoxCell,
    RhAnalystNineBoxDistributionItem,
    RhAnalystNineBoxResponse,
    RhAnalystNineBoxTalent,
    RhAnalystTopTalentRow,
} from "@/types/rh-analyst.types";
