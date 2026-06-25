import { isAxiosError } from "axios";
import { TALENT_REQUESTS_BASE_PATH, talentRequestDetailPath } from "@/api/talent-requests.constants";
import { httpClient } from "@/lib/http-client";
import {
    normalizeTalentRequestDetail,
    normalizeTalentRequestsList,
    normalizeTalentRequestsSummary,
} from "@/lib/talent-requests-normalize";
import type {
    CreateTalentRequestPayload,
    TalentRequest,
    TalentRequestsFilters,
    TalentRequestsSummary,
} from "@/types/talent-requests";
import type { ApiClientOptions } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export class TalentRequestsApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus = 0) {
        super(message);
        this.name = "TalentRequestsApiError";
        this.httpStatus = httpStatus;
    }
}

function readErrorMessage(err: unknown, fallback: string): string {
    if (isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const root = unwrapN8nRoot(err.response?.data);
        const message = String(root.message ?? root.error ?? fallback);
        throw new TalentRequestsApiError(message, status);
    }
    if (err instanceof TalentRequestsApiError) throw err;
    throw new TalentRequestsApiError(err instanceof Error ? err.message : fallback);
}

function buildListParams(filters: TalentRequestsFilters): Record<string, string> {
    const params: Record<string, string> = {};
    if (filters.status && filters.status !== "all") params.status = filters.status;
    if (filters.request_type && filters.request_type !== "all") params.request_type = filters.request_type;
    if (filters.limit) params.limit = String(filters.limit);
    return params;
}

export const talentRequestsApi = {
    list: async (filters: TalentRequestsFilters = {}, options?: ApiClientOptions): Promise<TalentRequest[]> => {
        try {
            const { data } = await httpClient.get<unknown>(TALENT_REQUESTS_BASE_PATH, {
                params: buildListParams(filters),
                signal: options?.signal,
            });
            return normalizeTalentRequestsList(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger vos demandes.");
        }
    },

    summary: async (options?: ApiClientOptions): Promise<TalentRequestsSummary> => {
        try {
            const { data } = await httpClient.get<unknown>(`${TALENT_REQUESTS_BASE_PATH}/summary`, {
                signal: options?.signal,
            });
            return normalizeTalentRequestsSummary(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le résumé des demandes.");
        }
    },

    detail: async (id: string, options?: ApiClientOptions): Promise<TalentRequest> => {
        try {
            const { data } = await httpClient.get<unknown>(talentRequestDetailPath(id), {
                signal: options?.signal,
            });
            return normalizeTalentRequestDetail(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le détail de la demande.");
        }
    },

    create: async (payload: CreateTalentRequestPayload): Promise<TalentRequest> => {
        try {
            const { data } = await httpClient.post<unknown>(TALENT_REQUESTS_BASE_PATH, payload);
            return normalizeTalentRequestDetail(data);
        } catch (err) {
            readErrorMessage(err, "Erreur lors de la création.");
        }
    },

    cancel: async (id: string): Promise<TalentRequest> => {
        try {
            const { data } = await httpClient.patch<unknown>(talentRequestDetailPath(id));
            return normalizeTalentRequestDetail(data);
        } catch (err) {
            readErrorMessage(err, "Impossible d'annuler.");
        }
    },

    delete: async (id: string): Promise<void> => {
        try {
            await httpClient.delete(talentRequestDetailPath(id));
        } catch (err) {
            readErrorMessage(err, "Impossible de supprimer.");
        }
    },
};
