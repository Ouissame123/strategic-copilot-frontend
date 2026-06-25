/**
 * WF_RH_Talents_Profile_CRUD — 4 endpoints stricts prod :
 *   POST/GET  `${API_BASE}/webhook/rh/accounts/talent`
 *   PATCH     `${API_BASE}/webhook/wf-rh-talent-patch-v1/rh/accounts/talent/:id`  (body vide)
 *   DELETE    `${API_BASE}/webhook/wf-rh-talent-delete-v1/rh/accounts/talent/:id`
 */
import { isAxiosError } from "axios";
import { ApiError } from "@/api/errors";
import {
    rhAccountsTalentProfileDeletePath,
    rhAccountsTalentProfilePatchPath,
    rhAccountsTalentProfilePath,
} from "@/lib/api-config";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";
import type {
    TalentCreateInput,
    TalentCreateResponse,
    TalentDeleteResponse,
    TalentProfile,
    TalentStatus,
    TalentToggleResponse,
    TalentsListFilters,
    TalentsListResponse,
    TalentsListSummary,
} from "@/types/rh-talents-profile.types";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const AXIOS_OPTS: HttpClientRequestConfig = { skipGlobalHttpErrorToast: true };

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function parseStatus(raw: unknown): TalentStatus {
    return str(raw).toLowerCase() === "inactive" ? "inactive" : "active";
}

export function normalizeTalentProfile(raw: unknown): TalentProfile | null {
    const r = asRecord(raw);
    const talent_id = str(r.talent_id ?? r.id ?? r.talentId);
    const email = str(r.email);
    const name = str(r.name ?? r.full_name ?? r.fullName);
    if (!talent_id || !email) return null;

    const manager_user_id = str(r.manager_user_id ?? r.managerUserId) || null;
    const manager_name = str(r.manager_name ?? r.managerName) || null;

    return {
        talent_id,
        user_id: str(r.user_id ?? r.userId) || null,
        has_portal_access: r.has_portal_access === true || r.hasPortalAccess === true,
        name: name || email,
        email,
        job_title: str(r.job_title ?? r.jobTitle) || "—",
        department: str(r.department) || null,
        seniority_level: str(r.seniority_level ?? r.seniority) || null,
        status: parseStatus(r.status),
        hire_date: str(r.hire_date ?? r.hireDate) || null,
        phone: str(r.phone) || null,
        contract_end_date: str(r.contract_end_date ?? r.contractEndDate) || null,
        manager_user_id,
        manager_name,
        manager_email: str(r.manager_email ?? r.managerEmail) || null,
        has_manager: r.has_manager === true || r.hasManager === true,
        created_at: str(r.created_at ?? r.createdAt) || new Date().toISOString(),
        updated_at: str(r.updated_at ?? r.updatedAt) || str(r.created_at) || new Date().toISOString(),
    };
}

function normalizeListResponse(raw: unknown): TalentsListResponse {
    const root = unwrapN8nRoot(raw);
    const listRaw = Array.isArray(root.items)
        ? root.items
        : Array.isArray(root.talents)
          ? root.talents
          : [];
    const items = listRaw.map(normalizeTalentProfile).filter((t): t is TalentProfile => t != null);
    const summaryRaw = asRecord(root.summary);
    const filtersRaw = asRecord(root.filters_applied);

    const summary: TalentsListSummary = {
        total: num(summaryRaw.total, items.length),
        with_manager: num(summaryRaw.with_manager),
        without_manager: num(summaryRaw.without_manager),
        with_portal: num(summaryRaw.with_portal),
    };

    return {
        status: "success",
        workflow: str(root.workflow) || undefined,
        operation: "list",
        enterprise_id: str(root.enterprise_id) || undefined,
        count: num(root.count, items.length),
        items,
        talents: items,
        filters_applied: {
            status: parseStatus(filtersRaw.status ?? "active"),
            search: str(filtersRaw.search) || undefined,
            limit: num(filtersRaw.limit, 100),
            offset: num(filtersRaw.offset, 0),
        },
        summary,
        meta: asRecord(root.meta) as TalentsListResponse["meta"],
    };
}

function messageFromAxios(err: unknown, fallback: string): string {
    if (isAxiosError(err)) {
        const data = err.response?.data;
        const root = data != null ? unwrapN8nRoot(data) : {};
        const errors = root.errors;
        if (Array.isArray(errors) && errors.length) return errors.map(String).join(" · ");
        return str(root.message ?? root.error) || fallback;
    }
    return err instanceof Error ? err.message : fallback;
}

function throwApiError(err: unknown, fallback: string): never {
    if (isAxiosError(err)) {
        throw new ApiError(messageFromAxios(err, fallback), err.response?.status, err.response?.data);
    }
    throw err instanceof ApiError ? err : new ApiError(fallback);
}

export async function listTalentsProfile(filters: TalentsListFilters = {}): Promise<TalentsListResponse> {
    const params: Record<string, string | number> = {};
    if (filters.status) params.status = filters.status;
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.limit != null) params.limit = filters.limit;
    if (filters.offset != null) params.offset = filters.offset;

    try {
        const { data } = await httpClient.get<unknown>(rhAccountsTalentProfilePath(), { params, ...AXIOS_OPTS });
        return normalizeListResponse(data);
    } catch (err) {
        throwApiError(err, "Impossible de charger les profils talents.");
    }
}

export async function createTalentProfile(input: TalentCreateInput): Promise<TalentCreateResponse> {
    try {
        const { data } = await httpClient.post<unknown>(rhAccountsTalentProfilePath(), input, AXIOS_OPTS);
        const root = unwrapN8nRoot(data);
        if (root.status === "error") {
            throw new ApiError(str(root.message) || "Échec de création", undefined, root);
        }
        const talent = asRecord(root.talent ?? root);
        return {
            status: "success",
            operation: "create",
            talent: {
                talent_id: str(talent.talent_id ?? talent.id),
                name: str(talent.name),
                email: str(talent.email),
                job_title: str(talent.job_title ?? talent.jobTitle),
                department: str(talent.department) || null,
                seniority_level: str(talent.seniority_level ?? talent.seniority) || null,
                manager_user_id: str(talent.manager_user_id ?? talent.managerUserId) || null,
                enterprise_id: str(talent.enterprise_id ?? talent.enterpriseId),
                created_at: str(talent.created_at ?? talent.createdAt),
            },
            message: str(root.message) || "Profil talent créé",
        };
    } catch (err) {
        throwApiError(err, "Échec de création du profil talent.");
    }
}

export async function toggleTalentProfileStatus(talentId: string): Promise<TalentToggleResponse> {
    try {
        const { data } = await httpClient.patch<unknown>(rhAccountsTalentProfilePatchPath(talentId), {}, AXIOS_OPTS);
        const root = unwrapN8nRoot(data);
        if (root.status === "error") {
            throw new ApiError(str(root.message) || "Échec du changement de statut", undefined, root);
        }
        const talent = asRecord(root.talent);
        return {
            status: "success",
            operation: "toggle_status",
            talent: {
                talent_id: str(talent.talent_id ?? talent.id ?? talentId),
                name: str(talent.name),
                email: str(talent.email),
                job_title: str(talent.job_title ?? talent.jobTitle),
                status: parseStatus(talent.status),
                updated_at: str(talent.updated_at ?? talent.updatedAt),
            },
            message: str(root.message) || "Statut mis à jour",
        };
    } catch (err) {
        throwApiError(err, "Échec du changement de statut.");
    }
}

export async function deleteTalentProfile(talentId: string): Promise<TalentDeleteResponse> {
    try {
        const { data } = await httpClient.delete<unknown>(rhAccountsTalentProfileDeletePath(talentId), AXIOS_OPTS);
        const root = unwrapN8nRoot(data);
        if (root.status === "error") {
            throw new ApiError(str(root.message) || "Échec de la suppression", undefined, root);
        }
        const talent = asRecord(root.talent);
        const cascade = asRecord(root.cascade);
        return {
            status: "success",
            operation: "delete",
            already_inactive: root.already_inactive === true,
            talent: {
                id: str(talent.id ?? talent.talent_id ?? talentId),
                name: str(talent.name),
                email: str(talent.email),
                job_title: str(talent.job_title ?? talent.jobTitle),
                new_status: "inactive",
            },
            cascade: { assignments_ended: num(cascade.assignments_ended) },
            message: str(root.message) || "Talent désactivé",
        };
    } catch (err) {
        throwApiError(err, "Échec de la suppression du talent.");
    }
}
