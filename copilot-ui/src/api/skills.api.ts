import { buildQuery, normalizeListPayload, parseMutationResult, unwrapEntity } from "@/api/crud/parse-response";
import { crudApi } from "@/config/crud-api";
import type { CrudMutationResult, Skill, SkillCreateDTO, SkillUpdateDTO } from "@/types/crud-domain";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiClientOptions } from "@/utils/apiClient";

export async function list(
    query?: Record<string, string | number | undefined | null>,
    opts?: ApiClientOptions,
): Promise<Skill[]> {
    const path = `${crudApi.skills.collection()}${buildQuery(query ?? {})}`;
    const raw = await apiGet<unknown>(path, opts);
    return normalizeListPayload(raw) as Skill[];
}

export async function getById(id: string, opts?: ApiClientOptions): Promise<Skill> {
    const raw = await apiGet<unknown>(crudApi.skills.one(id), opts);
    return unwrapEntity<Skill>(raw);
}

export async function create(body: SkillCreateDTO, opts?: ApiClientOptions): Promise<CrudMutationResult<Skill>> {
    const raw = await apiPost<unknown>(crudApi.skills.collection(), body, opts);
    return parseMutationResult<Skill>(raw);
}

export async function update(id: string, body: SkillUpdateDTO, opts?: ApiClientOptions): Promise<CrudMutationResult<Skill>> {
    const raw = await apiPatch<unknown>(crudApi.skills.one(id), body, opts);
    return parseMutationResult<Skill>(raw);
}

export async function remove(id: string, opts?: ApiClientOptions): Promise<CrudMutationResult<unknown>> {
    const raw = await apiDelete<unknown>(crudApi.skills.one(id), opts);
    return parseMutationResult<unknown>(raw);
}
