import { isAxiosError } from "axios";
import {
    getTalentOpportunityDetailGetUrl,
    getTalentOpportunityInterestPostUrl,
    TALENT_OPPORTUNITIES_BASE_PATH,
} from "@/config/talent-opportunities-api.config";
import { httpClient } from "@/lib/http-client";
import {
    normalizeOpportunitiesList,
    normalizeOpportunitiesSummary,
    normalizeOpportunityDetail,
} from "@/lib/talent-opportunities-normalize";
import type {
    ExpressInterestPayload,
    OpportunitiesSummary,
    OpportunityDetail,
    OpportunityListItem,
    TalentOpportunitiesListFilters,
} from "@/types/talent-opportunities";
import type { ApiClientOptions } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export class TalentOpportunitiesApiError extends Error {
    readonly httpStatus: number;
    readonly code?: string;

    constructor(message: string, httpStatus = 0, code?: string) {
        super(message);
        this.name = "TalentOpportunitiesApiError";
        this.httpStatus = httpStatus;
        this.code = code;
    }
}

function readErrorMessage(err: unknown, fallback: string): never {
    if (isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const root = unwrapN8nRoot(err.response?.data);
        const code = root.code != null ? String(root.code) : undefined;
        const message = String(root.message ?? root.error ?? fallback);
        throw new TalentOpportunitiesApiError(message, status, code);
    }
    if (err instanceof TalentOpportunitiesApiError) throw err;
    throw new TalentOpportunitiesApiError(err instanceof Error ? err.message : fallback);
}

function buildListParams(filters: TalentOpportunitiesListFilters): Record<string, string> {
    const params: Record<string, string> = {};
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.min_score != null) params.min_score = String(filters.min_score);
    return params;
}

export const talentOpportunitiesApi = {
    list: async (
        filters: TalentOpportunitiesListFilters = {},
        options?: ApiClientOptions,
    ): Promise<OpportunityListItem[]> => {
        try {
            const { data } = await httpClient.get<unknown>(TALENT_OPPORTUNITIES_BASE_PATH, {
                params: buildListParams({ limit: 50, ...filters }),
                signal: options?.signal,
            });
            return normalizeOpportunitiesList(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger les opportunités.");
        }
    },

    summary: async (options?: ApiClientOptions): Promise<OpportunitiesSummary> => {
        try {
            const { data } = await httpClient.get<unknown>(`${TALENT_OPPORTUNITIES_BASE_PATH}/summary`, { signal: options?.signal });
            return normalizeOpportunitiesSummary(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le résumé des opportunités.");
        }
    },

    detail: async (projectId: string, options?: ApiClientOptions): Promise<OpportunityDetail> => {
        try {
            const { data } = await httpClient.get<unknown>(getTalentOpportunityDetailGetUrl(projectId), { signal: options?.signal });
            return normalizeOpportunityDetail(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le détail de l'opportunité.");
        }
    },

    expressInterest: async (projectId: string, payload: ExpressInterestPayload = {}): Promise<unknown> => {
        try {
            const { data } = await httpClient.post<unknown>(getTalentOpportunityInterestPostUrl(projectId), payload);
            return unwrapN8nRoot(data);
        } catch (err) {
            readErrorMessage(err, "Impossible d'enregistrer votre intérêt.");
        }
    },
};
