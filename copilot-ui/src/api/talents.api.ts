import { buildQuery, normalizeListPayload, parseMutationResult, unwrapEntity } from "@/api/crud/parse-response";
import { crudApi } from "@/config/crud-api";
import type { CrudMutationResult, Talent, TalentCreateDTO, TalentUpdateDTO } from "@/types/crud-domain";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiClientOptions } from "@/utils/apiClient";

export async function list(
    query?: Record<string, string | number | undefined | null>,
    opts?: ApiClientOptions,
): Promise<Talent[]> {
    const path = `${crudApi.talents.collection()}${buildQuery(query ?? {})}`;
    const raw = await apiGet<unknown>(path, opts);
    return normalizeListPayload(raw) as Talent[];
}

export async function getById(id: string, opts?: ApiClientOptions): Promise<Talent> {
    const raw = await apiGet<unknown>(crudApi.talents.one(id), opts);
    return unwrapEntity<Talent>(raw);
}

export async function create(body: TalentCreateDTO, opts?: ApiClientOptions): Promise<CrudMutationResult<Talent>> {
    const raw = await apiPost<unknown>(crudApi.talents.collection(), body, opts);
    return parseMutationResult<Talent>(raw);
}

export async function update(
    id: string,
    body: TalentUpdateDTO,
    opts?: ApiClientOptions,
): Promise<CrudMutationResult<Talent>> {
    const raw = await apiPatch<unknown>(crudApi.talents.one(id), body, opts);
    return parseMutationResult<Talent>(raw);
}

export async function remove(id: string, opts?: ApiClientOptions): Promise<CrudMutationResult<unknown>> {
    const raw = await apiDelete<unknown>(crudApi.talents.one(id), opts);
    return parseMutationResult<unknown>(raw);
}
