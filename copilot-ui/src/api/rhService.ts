/**
 * Endpoints RH : utilisateurs et sessions.
 */
import { backendApi } from "@/config/backend-api";
import { httpGet, httpPatch, httpPost, type HttpRequestOptions } from "@/api/api";

export interface RhUsersListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    status?: string;
}

export function rhUsersListUrl(params: RhUsersListParams): string {
    const sp = new URLSearchParams();
    if (params.page != null) sp.set("page", String(params.page));
    if (params.pageSize != null) sp.set("pageSize", String(params.pageSize));
    if (params.search != null && params.search !== "") sp.set("search", params.search);
    if (params.role != null && params.role !== "") sp.set("role", params.role);
    if (params.status != null && params.status !== "") sp.set("status", params.status);
    const q = sp.toString();
    return q ? `${backendApi.rhUsersList}?${q}` : backendApi.rhUsersList;
}

export async function listRhUsers(params: RhUsersListParams, opts?: HttpRequestOptions): Promise<unknown> {
    return httpGet<unknown>(rhUsersListUrl(params), opts);
}

export interface RhCreateUserBody {
    fullName: string;
    email: string;
    role: "manager" | "talent";
    password: string;
    mustChangePassword: boolean;
}

export async function createRhUser(body: RhCreateUserBody, opts?: HttpRequestOptions): Promise<unknown> {
    return httpPost<unknown>(backendApi.rhUsersCreate, body, opts);
}

export async function patchRhUserStatus(
    userId: string,
    body: { status: "active" | "disabled" },
    opts?: HttpRequestOptions,
): Promise<unknown> {
    const url = `${backendApi.rhUsersStatus}?id=${encodeURIComponent(userId)}`;
    return httpPatch<unknown>(url, body, opts);
}

export async function patchRhUserRole(
    userId: string,
    body: { role: "manager" | "talent" },
    opts?: HttpRequestOptions,
): Promise<unknown> {
    const url = `${backendApi.rhUsersRole}?id=${encodeURIComponent(userId)}`;
    return httpPatch<unknown>(url, body, opts);
}

export async function patchRhUserPasswordReset(
    userId: string,
    body: { newPassword: string; mustChangePassword: boolean },
    opts?: HttpRequestOptions,
): Promise<unknown> {
    return httpPatch<unknown>(backendApi.rhUserPasswordReset(userId), body, opts);
}

export function rhSessionsListUrl(page: number, pageSize: number): string {
    const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const base = backendApi.rhSessions;
    return base.includes("?") ? `${base}&${q}` : `${base}?${q}`;
}

export async function listRhSessions(page: number, pageSize: number, opts?: HttpRequestOptions): Promise<unknown> {
    return httpGet<unknown>(rhSessionsListUrl(page, pageSize), opts);
}
