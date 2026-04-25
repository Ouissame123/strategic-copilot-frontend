import { buildQuery, normalizeListPayload, parseMutationResult, unwrapEntity } from "@/api/crud/parse-response";
import { crudApi } from "@/config/crud-api";
import type { Assignment, AssignmentCreateDTO, AssignmentUpdateDTO, CrudMutationResult } from "@/types/crud-domain";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiClientOptions } from "@/utils/apiClient";

export async function list(
    query?: Record<string, string | number | undefined | null>,
    opts?: ApiClientOptions,
): Promise<Assignment[]> {
    const path = `${crudApi.assignments.collection()}${buildQuery(query ?? {})}`;
    const raw = await apiGet<unknown>(path, opts);
    return normalizeListPayload(raw) as Assignment[];
}

export async function getById(id: string, opts?: ApiClientOptions): Promise<Assignment> {
    const raw = await apiGet<unknown>(crudApi.assignments.one(id), opts);
    return unwrapEntity<Assignment>(raw);
}

export async function create(
    body: AssignmentCreateDTO,
    opts?: ApiClientOptions,
): Promise<CrudMutationResult<Assignment>> {
    const raw = await apiPost<unknown>(crudApi.assignments.collection(), body, opts);
    return parseMutationResult<Assignment>(raw);
}

export async function update(
    id: string,
    body: AssignmentUpdateDTO,
    opts?: ApiClientOptions,
): Promise<CrudMutationResult<Assignment>> {
    const raw = await apiPatch<unknown>(crudApi.assignments.one(id), body, opts);
    return parseMutationResult<Assignment>(raw);
}

export async function remove(id: string, opts?: ApiClientOptions): Promise<CrudMutationResult<unknown>> {
    const raw = await apiDelete<unknown>(crudApi.assignments.one(id), opts);
    return parseMutationResult<unknown>(raw);
}
