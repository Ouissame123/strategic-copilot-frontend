import { isAxiosError } from "axios";
import {
    MANAGER_TALENT_REQUESTS_LIST_PATH,
    managerTalentRequestDecisionPath,
    managerTalentRequestDetailPath,
    managerTalentRequestStatusPath,
} from "@/api/manager-talent-requests.constants";
import { httpClient } from "@/lib/http-client";
import {
    normalizeTalentRequestDetail,
    normalizeTalentRequestsList,
    normalizeTalentRequestsSummary,
} from "@/lib/talent-requests-normalize";
import type {
    ManagerTalentRequestDecisionBody,
    ManagerTalentRequestStatusPatch,
    TalentRequest,
    TalentRequestsFilters,
    TalentRequestsSummary,
} from "@/types/talent-requests";
import type { ApiClientOptions } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const silent = { skipGlobalHttpErrorToast: true as const };

function buildListParams(filters: TalentRequestsFilters): Record<string, string> {
    const params: Record<string, string> = {};
    if (filters.status && filters.status !== "all") params.status = filters.status;
    if (filters.request_type && filters.request_type !== "all") params.request_type = filters.request_type;
    if (filters.priority && filters.priority !== "all") params.priority = filters.priority;
    if (filters.talent_id?.trim()) params.talent_id = filters.talent_id.trim();
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.limit) params.limit = String(filters.limit);
    return params;
}

function readErrorMessage(err: unknown, fallback: string): never {
    if (isAxiosError(err)) {
        const root = unwrapN8nRoot(err.response?.data);
        throw new Error(String(root.message ?? root.error ?? fallback));
    }
    throw new Error(err instanceof Error ? err.message : fallback);
}

export type TalentRequestDecision = "accept" | "refuse" | "transfer_to_hr";

/**
 * PATCH `.../manager/talent-requests/{id}/decision` — body `{ decision, reason }`.
 * Contrat Validations Copilot (Approuver / Rejeter).
 */
export async function decideTalentRequest(
    id: string,
    decision: TalentRequestDecision,
    reason?: string,
) {
    if ((decision === "refuse" || decision === "transfer_to_hr") && !reason) {
        throw new Error("Un motif est requis pour refuser ou transférer à la RH.");
    }
    const requestId = id.trim();
    if (!requestId) throw new Error("Identifiant de demande manquant.");
    try {
        const { data } = await httpClient.patch<unknown>(
            `${MANAGER_TALENT_REQUESTS_LIST_PATH}/${encodeURIComponent(requestId)}/decision`,
            { decision, reason },
            silent,
        );
        return data;
    } catch (err) {
        readErrorMessage(err, "Impossible de mettre à jour la demande.");
    }
}

export const managerTalentRequestsApi = {
    list: async (filters: TalentRequestsFilters = {}, options?: ApiClientOptions): Promise<TalentRequest[]> => {
        try {
            const { data } = await httpClient.get<unknown>(MANAGER_TALENT_REQUESTS_LIST_PATH, {
                params: buildListParams(filters),
                signal: options?.signal,
                ...silent,
            });
            return normalizeTalentRequestsList(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger les demandes talents.");
        }
    },

    summary: async (options?: ApiClientOptions): Promise<TalentRequestsSummary> => {
        try {
            const { data } = await httpClient.get<unknown>(`${MANAGER_TALENT_REQUESTS_LIST_PATH}/summary`, {
                signal: options?.signal,
                ...silent,
            });
            return normalizeTalentRequestsSummary(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le résumé des demandes talents.");
        }
    },

    detail: async (id: string, options?: ApiClientOptions): Promise<TalentRequest> => {
        try {
            const { data } = await httpClient.get<unknown>(managerTalentRequestDetailPath(id), {
                signal: options?.signal,
                ...silent,
            });
            return normalizeTalentRequestDetail(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le détail de la demande.");
        }
    },

    decide: async (id: string, body: ManagerTalentRequestDecisionBody): Promise<TalentRequest> => {
        try {
            const { data } = await httpClient.patch<unknown>(managerTalentRequestDecisionPath(id), body, silent);
            return normalizeTalentRequestDetail(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de mettre à jour la demande.");
        }
    },

    /** PATCH statut direct (BDD : pending | accepted | rejected | refused | transferred_to_hr). */
    patchStatus: async (id: string, status: ManagerTalentRequestStatusPatch): Promise<TalentRequest> => {
        try {
            const { data } = await httpClient.patch<unknown>(managerTalentRequestStatusPath(id), { status }, silent);
            const root = unwrapN8nRoot(data) as Record<string, unknown>;
            const apiStatus = String(root.status ?? "").toLowerCase();
            if (apiStatus && apiStatus !== "success") {
                throw new Error(String(root.message ?? root.error ?? "Erreur"));
            }
            return normalizeTalentRequestDetail(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de mettre à jour la demande.");
        }
    },
};
