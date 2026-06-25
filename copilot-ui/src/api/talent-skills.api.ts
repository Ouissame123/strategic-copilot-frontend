import { isAxiosError } from "axios";
import { getTalentSkillDeleteUrl, getTalentSkillUpdatePatchUrl, TALENT_SKILLS_BASE_PATH } from "@/config/talent-skills-api.config";
import { httpClient } from "@/lib/http-client";
import {
    normalizeCatalogSkills,
    normalizeMySkill,
    normalizeMySkillsList,
    normalizeSkillGaps,
    normalizeSkillsSummary,
} from "@/lib/talent-skills-normalize";
import type {
    CatalogSkill,
    CreateSkillPayload,
    MySkill,
    SkillGap,
    SkillsSummary,
    TalentSkillsListFilters,
    UpdateSkillPayload,
} from "@/types/talent-skills";
import type { ApiClientOptions } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export class TalentSkillsApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus = 0) {
        super(message);
        this.name = "TalentSkillsApiError";
        this.httpStatus = httpStatus;
    }
}

function readErrorMessage(err: unknown, fallback: string): never {
    if (isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const root = unwrapN8nRoot(err.response?.data);
        const message = String(root.message ?? root.error ?? fallback);
        throw new TalentSkillsApiError(message, status);
    }
    if (err instanceof TalentSkillsApiError) throw err;
    throw new TalentSkillsApiError(err instanceof Error ? err.message : fallback);
}

function buildListParams(filters: TalentSkillsListFilters): Record<string, string> {
    const params: Record<string, string> = {};
    if (filters.category && filters.category !== "all") params.category = filters.category;
    if (filters.certified) params.certified = "true";
    if (filters.limit) params.limit = String(filters.limit);
    return params;
}

export const talentSkillsApi = {
    list: async (filters: TalentSkillsListFilters = {}, options?: ApiClientOptions): Promise<MySkill[]> => {
        try {
            const { data } = await httpClient.get<unknown>(TALENT_SKILLS_BASE_PATH, {
                params: buildListParams(filters),
                signal: options?.signal,
            });
            return normalizeMySkillsList(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger vos compétences.");
        }
    },

    summary: async (options?: ApiClientOptions): Promise<SkillsSummary> => {
        try {
            const { data } = await httpClient.get<unknown>(`${TALENT_SKILLS_BASE_PATH}/summary`, { signal: options?.signal });
            return normalizeSkillsSummary(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le résumé des compétences.");
        }
    },

    catalog: async (search = "", limit = 50, options?: ApiClientOptions): Promise<CatalogSkill[]> => {
        try {
            const params: Record<string, string> = { limit: String(limit) };
            if (search.trim()) params.search = search.trim();
            const { data } = await httpClient.get<unknown>(`${TALENT_SKILLS_BASE_PATH}/catalog`, {
                params,
                signal: options?.signal,
            });
            return normalizeCatalogSkills(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le catalogue.");
        }
    },

    gaps: async (options?: ApiClientOptions): Promise<SkillGap[]> => {
        try {
            const { data } = await httpClient.get<unknown>(`${TALENT_SKILLS_BASE_PATH}/gaps`, { signal: options?.signal });
            return normalizeSkillGaps(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger les écarts de compétences.");
        }
    },

    create: async (payload: CreateSkillPayload): Promise<MySkill> => {
        try {
            const { data } = await httpClient.post<unknown>(TALENT_SKILLS_BASE_PATH, payload);
            return normalizeMySkill(data);
        } catch (err) {
            readErrorMessage(err, "Impossible d'ajouter la compétence.");
        }
    },

    update: async (skillId: string, payload: UpdateSkillPayload): Promise<MySkill> => {
        try {
            const { data } = await httpClient.patch<unknown>(getTalentSkillUpdatePatchUrl(skillId), payload);
            return normalizeMySkill(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de mettre à jour la compétence.");
        }
    },

    delete: async (skillId: string): Promise<void> => {
        try {
            await httpClient.delete(getTalentSkillDeleteUrl(skillId));
        } catch (err) {
            readErrorMessage(err, "Impossible de supprimer la compétence.");
        }
    },
};
