/**
 * WF_RH_Talent_Portal_Access — 3 endpoints stricts prod :
 *   POST `${API_BASE}/webhook/rh/talents/onboard`
 *   POST `${API_BASE}/webhook/wf-rh-talent-grant-v1/rh/talents/:id/grant-access`  (body `{ password }` uniquement)
 *   GET  `${API_BASE}/webhook/rh/talents/unlinked`
 */
import { isAxiosError } from "axios";
import { ApiError } from "@/api/errors";
import { rhTalentGrantAccessPath, rhTalentOnboardPath, rhTalentUnlinkedPath } from "@/lib/api-config";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";
import type {
    GrantAccessInput,
    GrantAccessResponse,
    OnboardResponse,
    OnboardTalentInput,
    UnlinkedListResponse,
    UnlinkedTalent,
} from "@/types/rh-portal-access.types";
import type { OnboardTalentResponse } from "@/types/talent-onboard";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const AXIOS_OPTS: HttpClientRequestConfig = { skipGlobalHttpErrorToast: true };

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function parsePortalUser(raw: unknown): GrantAccessResponse["user"] {
    const u = asRecord(raw);
    return {
        id: str(u.id),
        full_name: str(u.full_name ?? u.fullName ?? u.name),
        email: str(u.email),
        role: "talent",
        status: "active",
        created_at: str(u.created_at ?? u.createdAt),
    };
}

function parseLoginInfo(raw: unknown): OnboardResponse["login_info"] {
    const info = asRecord(raw);
    return {
        email: str(info.email),
        portal_url: str(info.portal_url ?? info.portalUrl),
        note: str(info.note),
    };
}

function parseUnlinkedTalent(raw: unknown): UnlinkedTalent | null {
    const r = asRecord(raw);
    const talent_id = str(r.talent_id ?? r.id ?? r.talentId);
    const name = str(r.name ?? r.full_name ?? r.fullName);
    const email = str(r.email);
    const job_title = str(r.job_title ?? r.jobTitle);
    if (!talent_id || !name || !email) return null;

    const manager_user_id = str(r.manager_user_id ?? r.managerUserId) || null;
    const manager_name = str(r.manager_name ?? r.managerName) || null;

    return {
        talent_id,
        name,
        email,
        job_title: job_title || "—",
        department: str(r.department) || null,
        seniority_level: str(r.seniority_level ?? r.seniority) || null,
        status: (str(r.status) || "active") as "active",
        phone: str(r.phone) || null,
        contract_end_date: str(r.contract_end_date ?? r.contractEndDate) || null,
        manager_user_id,
        manager_name,
        manager_email: str(r.manager_email ?? r.managerEmail) || null,
        has_manager: r.has_manager === true || r.hasManager === true,
        created_at: str(r.created_at ?? r.createdAt),
        updated_at: str(r.updated_at ?? r.updatedAt),
    };
}

function normalizeUnlinkedList(raw: unknown): UnlinkedListResponse {
    const root = unwrapN8nRoot(raw);
    const listRaw = Array.isArray(root.items)
        ? root.items
        : Array.isArray(root.talents)
          ? root.talents
          : [];
    const items = listRaw.map(parseUnlinkedTalent).filter((t): t is UnlinkedTalent => t != null);
    const filtersRaw = asRecord(root.filters_applied ?? root.filters);

    return {
        status: "success",
        workflow: str(root.workflow) || undefined,
        operation: "list_unlinked",
        enterprise_id: str(root.enterprise_id),
        count: num(root.count, items.length),
        items,
        talents: items,
        filters_applied: {
            search: str(filtersRaw.search) || null,
            limit: num(filtersRaw.limit, 200),
        },
    };
}

function normalizeOnboardResponse(raw: unknown): OnboardResponse {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") {
        throw new ApiError(str(root.message) || "Échec onboard", undefined, root);
    }
    const user = parsePortalUser(root.user);
    const talent = asRecord(root.talent);
    const talentId = str(talent.talent_id ?? talent.id);
    const userId = str(talent.user_id ?? talent.userId ?? user.id);

    return {
        status: "success",
        workflow: str(root.workflow) || undefined,
        operation: "onboard",
        user,
        talent: {
            talent_id: talentId,
            name: str(talent.name),
            email: str(talent.email),
            job_title: str(talent.job_title ?? talent.jobTitle),
            department: str(talent.department) || null,
            seniority_level: str(talent.seniority_level ?? talent.seniority) || null,
            manager_user_id: str(talent.manager_user_id ?? talent.managerUserId) || null,
            user_id: userId,
            enterprise_id: str(talent.enterprise_id ?? talent.enterpriseId),
            created_at: str(talent.created_at ?? talent.createdAt),
        },
        message: str(root.message),
        login_info: parseLoginInfo(root.login_info ?? root.loginInfo),
    };
}

function normalizeGrantAccessResponse(raw: unknown): GrantAccessResponse {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") {
        throw new ApiError(str(root.message) || "Échec création accès", undefined, root);
    }
    const user = parsePortalUser(root.user);
    const talent = asRecord(root.talent);
    const talentId = str(talent.talent_id ?? talent.id);
    const userId = str(talent.user_id ?? talent.userId ?? user.id);

    return {
        status: "success",
        workflow: str(root.workflow) || undefined,
        operation: "grant_portal_access",
        user,
        talent: {
            talent_id: talentId,
            name: str(talent.name),
            email: str(talent.email),
            job_title: str(talent.job_title ?? talent.jobTitle),
            user_id: userId,
            manager_user_id: str(talent.manager_user_id ?? talent.managerUserId) || null,
        },
        message: str(root.message),
        login_info: parseLoginInfo(root.login_info ?? root.loginInfo),
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

/** POST onboard — nouveau talent + compte login atomique */
export async function onboardTalent(input: OnboardTalentInput): Promise<OnboardResponse> {
    try {
        const { data } = await httpClient.post<unknown>(rhTalentOnboardPath(), input, AXIOS_OPTS);
        return normalizeOnboardResponse(data);
    } catch (err) {
        throwApiError(err, "Échec de l'onboard talent.");
    }
}

/** POST grant-access — talent existant, body `{ password }` UNIQUEMENT */
export async function grantPortalAccess(talentId: string, input: GrantAccessInput): Promise<GrantAccessResponse> {
    const id = talentId.trim();
    if (!id) throw new ApiError("Identifiant talent invalide.", 400);

    try {
        const { data } = await httpClient.post<unknown>(
            rhTalentGrantAccessPath(id),
            { password: input.password },
            AXIOS_OPTS,
        );
        return normalizeGrantAccessResponse(data);
    } catch (err) {
        throwApiError(err, "Échec de la création d'accès portail.");
    }
}

/** GET talents actifs sans compte portail */
export async function listUnlinkedTalents(
    params: { search?: string; limit?: number } = {},
): Promise<UnlinkedListResponse> {
    const qp: Record<string, string | number> = {};
    if (params.search?.trim()) qp.search = params.search.trim();
    if (params.limit != null) qp.limit = params.limit;

    try {
        const { data } = await httpClient.get<unknown>(rhTalentUnlinkedPath(), { params: qp, ...AXIOS_OPTS });
        return normalizeUnlinkedList(data);
    } catch (err) {
        throwApiError(err, "Impossible de charger les talents sans compte.");
    }
}

/** Adaptateur UI legacy (`OnboardTalentResponse` dans talent-onboard.ts) */
export function toLegacyOnboardResponse(data: OnboardResponse | GrantAccessResponse): OnboardTalentResponse {
    const isGrant = data.operation === "grant_portal_access";
    const seniorityRaw = "seniority_level" in data.talent ? str(data.talent.seniority_level) : "";
    const seniority_level = seniorityRaw || null;

    return {
        status: "success",
        operation: isGrant ? "grant_access" : "onboard_talent",
        user: data.user,
        talent: {
            talent_id: data.talent.talent_id,
            name: data.talent.name,
            email: data.talent.email,
            job_title: data.talent.job_title,
            department: "department" in data.talent ? data.talent.department : null,
            seniority_level,
            manager_user_id: data.talent.manager_user_id,
            user_id: data.talent.user_id,
            enterprise_id: "enterprise_id" in data.talent ? data.talent.enterprise_id : "",
        },
        message: data.message,
        login_info: data.login_info,
    };
}
