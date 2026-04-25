import { buildQuery, normalizeListPayload, parseMutationResult, unwrapEntity } from "@/api/crud/parse-response";
import { crudApi } from "@/config/crud-api";
import type { CrudMutationResult, TalentSkill, TalentSkillCreateDTO, TalentSkillUpdateDTO } from "@/types/crud-domain";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiClientOptions } from "@/utils/apiClient";

/** GET /api/talent-skills — filtre fréquent : `talent_id`. */
export async function list(
    query?: Record<string, string | number | undefined | null>,
    opts?: ApiClientOptions,
): Promise<TalentSkill[]> {
    const path = `${crudApi.talentSkills.collection()}${buildQuery(query ?? {})}`;
    const raw = await apiGet<unknown>(path, opts);
    return normalizeListPayload(raw) as TalentSkill[];
}

export async function getById(id: string, opts?: ApiClientOptions): Promise<TalentSkill> {
    const raw = await apiGet<unknown>(crudApi.talentSkills.one(id), opts);
    return unwrapEntity<TalentSkill>(raw);
}

export async function create(
    body: TalentSkillCreateDTO,
    opts?: ApiClientOptions,
): Promise<CrudMutationResult<TalentSkill>> {
    const raw = await apiPost<unknown>(crudApi.talentSkills.collection(), body, opts);
    return parseMutationResult<TalentSkill>(raw);
}

export async function update(
    id: string,
    body: TalentSkillUpdateDTO,
    opts?: ApiClientOptions,
): Promise<CrudMutationResult<TalentSkill>> {
    const raw = await apiPatch<unknown>(crudApi.talentSkills.one(id), body, opts);
    return parseMutationResult<TalentSkill>(raw);
}

export async function remove(id: string, opts?: ApiClientOptions): Promise<CrudMutationResult<unknown>> {
    const raw = await apiDelete<unknown>(crudApi.talentSkills.one(id), opts);
    return parseMutationResult<unknown>(raw);
}
