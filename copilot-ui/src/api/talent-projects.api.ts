import { isAxiosError } from "axios";
import { getTalentProjectDetailGetUrl, TALENT_PROJECTS_LIST_PATH } from "@/config/talent-projects-api.config";
import { httpClient } from "@/lib/http-client";
import {
    normalizeTalentProjectDetail,
    normalizeTalentProjectsList,
    normalizeTalentProjectsSummary,
} from "@/lib/talent-projects-normalize";
import type { ProjectTab, TalentProjectDetail, TalentProjectListItem, TalentProjectsSummary } from "@/types/talent-projects";
import type { ApiClientOptions } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export class TalentProjectsApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus = 0) {
        super(message);
        this.name = "TalentProjectsApiError";
        this.httpStatus = httpStatus;
    }
}

function readErrorMessage(err: unknown, fallback: string): never {
    if (isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const root = unwrapN8nRoot(err.response?.data);
        const message = String(root.message ?? root.error ?? fallback);
        throw new TalentProjectsApiError(message, status);
    }
    if (err instanceof TalentProjectsApiError) throw err;
    throw new TalentProjectsApiError(err instanceof Error ? err.message : fallback);
}

export const talentProjectsApi = {
    list: async (tab: ProjectTab = "active", limit = 50, options?: ApiClientOptions): Promise<TalentProjectListItem[]> => {
        try {
            const { data } = await httpClient.get<unknown>(TALENT_PROJECTS_LIST_PATH, {
                params: { tab, limit },
                signal: options?.signal,
            });
            return normalizeTalentProjectsList(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger vos projets.");
        }
    },

    summary: async (options?: ApiClientOptions): Promise<TalentProjectsSummary> => {
        try {
            const { data } = await httpClient.get<unknown>(`${TALENT_PROJECTS_LIST_PATH}/summary`, { signal: options?.signal });
            return normalizeTalentProjectsSummary(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le résumé des projets.");
        }
    },

    detail: async (id: string, options?: ApiClientOptions): Promise<TalentProjectDetail> => {
        try {
            const { data } = await httpClient.get<unknown>(getTalentProjectDetailGetUrl(id), {
                signal: options?.signal,
            });
            return normalizeTalentProjectDetail(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le détail du projet.");
        }
    },
};
