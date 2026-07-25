/**
 * Gestion des comptes RH — GET/POST/PATCH/DELETE sous `/webhook/rh/users` et `/webhook/rh/accounts/talent`.
 */
import { ApiError } from "@/api/errors";
import { httpDelete, httpGet, httpPatch, httpPost, type HttpRequestOptions } from "@/api/api";
import { getN8nBaseUrl } from "@/lib/build-n8n-url";
import type {
    CreateRhStaffAccountBody,
    CreateRhTalentAccountBody,
    RhAccountsListParams,
    RhCreateStaffAccountResponse,
    RhCreateTalentAccountResponse,
    RhDeletedAccount,
    RhDeleteStaffAccountResponse,
    RhDeleteTalentAccountResponse,
    RhExistingTalentListItem,
    RhPatchStaffAccountResponse,
    RhPatchTalentAccountResponse,
    RhStaffAccount,
    RhStaffAccountsListResponse,
    RhStaffPatchAction,
    RhStaffRole,
    RhTalentAccount,
    RhTalentAccountsListResponse,
    RhTalentPatchAction,
} from "@/types/rh-accounts.types";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const DEFAULT_LIST_LIMIT = 100;

function trimHostBase(base: string): string {
    return base.replace(/\/+$/, "");
}

/** URL absolue ou relative — toujours préfixée `/webhook/` pour le proxy Vite. */
function rhAccountsWebhookUrl(path: string): string {
    const segment = path.startsWith("/") ? path : `/${path}`;
    const webhookPath = segment.startsWith("/webhook/") ? segment : `/webhook${segment}`;
    const host = trimHostBase(getN8nBaseUrl());
    return host ? `${host}${webhookPath}` : webhookPath;
}

function readRhAccountsEnv(name: string): string | undefined {
    const v = (import.meta.env as Record<string, string | undefined>)[name];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** PATCH manager/RH — `…/webhook/wf-rh-users-patch-v1/rh/users/:id` */
function rhAccountsUsersPatchItemUrl(id: string): string {
    const explicit = readRhAccountsEnv("VITE_API_RH_USERS_PATCH_BASE");
    if (explicit) {
        const base = explicit.replace(/\/+$/, "");
        if (/^https?:\/\//i.test(base)) {
            return `${base}/${encodeURIComponent(id)}`;
        }
        const path = base.startsWith("/") ? base : `/${base}`;
        return rhAccountsWebhookUrl(`${path}/${encodeURIComponent(id)}`);
    }
    return rhAccountsWebhookUrl(`/wf-rh-users-patch-v1/rh/users/${encodeURIComponent(id)}`);
}

/** PATCH talent — `…/webhook/wf-rh-talent-patch-v1/rh/accounts/talent/:id` */
function rhAccountsTalentPatchItemUrl(id: string): string {
    const explicit = readRhAccountsEnv("VITE_API_RH_TALENT_PATCH_BASE");
    if (explicit) {
        const base = explicit.replace(/\/+$/, "");
        if (/^https?:\/\//i.test(base)) {
            return `${base}/${encodeURIComponent(id)}`;
        }
        const path = base.startsWith("/") ? base : `/${base}`;
        return rhAccountsWebhookUrl(`${path}/${encodeURIComponent(id)}`);
    }
    return rhAccountsWebhookUrl(`/wf-rh-talent-patch-v1/rh/accounts/talent/${encodeURIComponent(id)}`);
}

/** DELETE manager/RH — `…/webhook/wf-rh-users-delete-v1/rh/users/:id` */
function rhAccountsUsersDeleteItemUrl(id: string): string {
    const explicit = readRhAccountsEnv("VITE_API_RH_USER_DELETE_BASE");
    if (explicit) {
        const base = explicit.replace(/\/+$/, "");
        if (/^https?:\/\//i.test(base)) {
            return `${base}/${encodeURIComponent(id)}`;
        }
        const path = base.startsWith("/") ? base : `/${base}`;
        return rhAccountsWebhookUrl(`${path}/${encodeURIComponent(id)}`);
    }
    return rhAccountsWebhookUrl(`/wf-rh-users-delete-v1/rh/users/${encodeURIComponent(id)}`);
}

/** DELETE talent — `…/webhook/wf-rh-talent-delete-v1/rh/accounts/talent/:id` */
function rhAccountsTalentDeleteItemUrl(id: string): string {
    const explicit = readRhAccountsEnv("VITE_API_RH_TALENT_DELETE_BASE");
    if (explicit) {
        const base = explicit.replace(/\/+$/, "");
        if (/^https?:\/\//i.test(base)) {
            return `${base}/${encodeURIComponent(id)}`;
        }
        const path = base.startsWith("/") ? base : `/${base}`;
        return rhAccountsWebhookUrl(`${path}/${encodeURIComponent(id)}`);
    }
    return rhAccountsWebhookUrl(`/wf-rh-talent-delete-v1/rh/accounts/talent/${encodeURIComponent(id)}`);
}

/** Workflow n8n `wf-rh-list-talents-v1` — liste talents pour modal « existant ». */
const RH_LIST_TALENTS_WEBHOOK_PATH = "/wf-rh-list-talents-v1/rh/accounts/talent";

/** Workflow n8n `wf-rh-create-user-v2` — création compte user depuis talent existant. */
const RH_CREATE_USER_V2_WEBHOOK_PATH = "/wf-rh-create-user-v2/rh/users";

function rhAccountsListExistingTalentsUrl(): string {
    const explicit = readRhAccountsEnv("VITE_API_RH_LIST_TALENTS_BASE");
    if (explicit) {
        const base = explicit.replace(/\/+$/, "");
        if (/^https?:\/\//i.test(base)) return base;
        const path = base.startsWith("/") ? base : `/${base}`;
        return rhAccountsWebhookUrl(path);
    }
    return rhAccountsWebhookUrl(RH_LIST_TALENTS_WEBHOOK_PATH);
}

function extractExistingTalentsArray(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw;
    const root = unwrapN8nRoot(raw);
    if (Array.isArray(root.talents)) return root.talents;
    const data = root.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(asRecord(data).talents)) return asRecord(data).talents as unknown[];
    return [];
}

function rhAccountsCreateUserV2Url(): string {
    const explicit = readRhAccountsEnv("VITE_API_RH_CREATE_USER_V2_BASE");
    if (explicit) {
        const base = explicit.replace(/\/+$/, "");
        if (/^https?:\/\//i.test(base)) return base;
        const path = base.startsWith("/") ? base : `/${base}`;
        return rhAccountsWebhookUrl(path);
    }
    return rhAccountsWebhookUrl(RH_CREATE_USER_V2_WEBHOOK_PATH);
}

const rhAccountsUrls = {
    usersList: () => rhAccountsWebhookUrl("/rh/users"),
    usersItem: (id: string) => rhAccountsWebhookUrl(`/rh/users/${encodeURIComponent(id)}`),
    talentList: () => rhAccountsWebhookUrl("/rh/accounts/talent"),
    talentItem: (id: string) => rhAccountsWebhookUrl(`/rh/accounts/talent/${encodeURIComponent(id)}`),
} as const;

function parseExistingTalentListItem(raw: unknown): RhExistingTalentListItem | null {
    const r = asRecord(raw);
    const talent_id = str(r.talent_id ?? r.id ?? r.talentId);
    const email = str(r.email);
    const name = str(r.name ?? r.full_name ?? r.fullName) || email.split("@")[0] || "";
    if (!talent_id || !name) return null;
    return {
        talent_id,
        name,
        email: email || undefined,
        job_title: str(r.job_title ?? r.jobTitle) || undefined,
        department: str(r.department) || undefined,
        seniority_level: str(r.seniority_level ?? r.seniority) || undefined,
        manager_user_id: str(r.manager_user_id ?? r.managerUserId) || undefined,
        phone: str(r.phone) || undefined,
    };
}

export function mapRhTalentAccountToExistingListItem(t: RhTalentAccount): RhExistingTalentListItem {
    return {
        talent_id: t.id,
        name: t.name,
        email: t.email,
        job_title: t.job_title,
        department: t.department,
        seniority_level: t.seniority,
        manager_user_id: t.manager_user_id,
        phone: t.phone,
    };
}

function parseExistingTalentsFromRaw(raw: unknown): RhExistingTalentListItem[] {
    console.log("talents:", raw);
    return extractExistingTalentsArray(raw)
        .map(parseExistingTalentListItem)
        .filter((t): t is RhExistingTalentListItem => t != null);
}

async function fetchExistingTalentsFromListWorkflow(opts?: HttpRequestOptions): Promise<RhExistingTalentListItem[]> {
    try {
        const raw = await httpGet<unknown>(rhAccountsListExistingTalentsUrl(), opts);
        return parseExistingTalentsFromRaw(raw);
    } catch (err) {
        console.warn("wf-rh-list-talents-v1 indisponible:", err);
        return [];
    }
}

async function fetchExistingTalentsFromAccountsList(opts?: HttpRequestOptions): Promise<RhExistingTalentListItem[]> {
    const res = await fetchRhTalentAccountsList({}, opts);
    console.log("talents (fallback /rh/accounts/talent):", res);
    return res.talents.map(mapRhTalentAccountToExistingListItem);
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function messageFromPayload(payload: unknown, fallback: string): string {
    if (typeof payload === "string") {
        const t = payload.trim();
        return t && t.length <= 400 ? t : fallback;
    }
    if (!payload || typeof payload !== "object") return fallback;
    const o = payload as Record<string, unknown>;
    const nested = o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : null;
    const msg = str(
        o.message ?? o.error ?? o.detail ?? o.description ?? o.hint ?? o.cause ?? nested?.message ?? nested?.error,
    );
    return msg || fallback;
}

function enrichRhAccountsApiError(err: ApiError, context: Parameters<typeof mapRhAccountsApiError>[1]): ApiError {
    return new ApiError(mapRhAccountsApiError(err, context), err.status, err.payload);
}

export function mapRhAccountsApiError(
    err: unknown,
    context:
        | "create-staff"
        | "create-talent"
        | "delete-staff"
        | "delete-talent"
        | "list"
        | "patch-staff"
        | "patch-talent"
        | "change-password",
): string {
    if (err instanceof ApiError) {
        if (context === "create-staff" && err.status === 409) return "Cet email est déjà utilisé.";
        if (context === "create-staff" && err.status === 400) {
            return messageFromPayload(err.payload, "Champs invalides ou manquants.");
        }
        if (context === "create-talent" && err.status === 409) return "Cet email est déjà utilisé.";
        if (context === "create-talent" && err.status === 400) {
            return messageFromPayload(err.payload, "Champs invalides ou manquants.");
        }
        if (context === "delete-staff" && err.status === 404) return "Compte introuvable.";
        if (context === "delete-staff" && err.status === 409) return "Vous ne pouvez pas supprimer votre propre compte.";
        if (context === "delete-talent" && err.status === 404) return "Compte introuvable.";
        if (context === "change-password" && err.status === 400) {
            return messageFromPayload(err.payload, "Mot de passe invalide.");
        }
        if ((context === "patch-staff" || context === "patch-talent" || context === "change-password") && err.status === 404) {
            return "Compte introuvable.";
        }
        if (err.status === 500) {
            const detail = messageFromPayload(err.payload, "");
            if (detail) return detail;
            if (context === "change-password" || context === "patch-staff") {
                return "Erreur serveur (n8n) lors de la mise à jour du compte. Vérifiez que le workflow PATCH /rh/users est publié et actif.";
            }
            return "Erreur serveur (n8n). Réessayez ou contactez l'administrateur.";
        }
        if (err.payload) return messageFromPayload(err.payload, err.message);
        return err.message;
    }
    return err instanceof Error ? err.message : context === "list" ? "Impossible de charger les comptes." : "Erreur inconnue.";
}

function normalizeStaffRole(raw: unknown): RhStaffRole | null {
    const s = str(raw).toLowerCase();
    if (s === "manager") return "manager";
    if (s === "rh" || s === "hr") return "rh";
    return null;
}

function parseStaffAccount(raw: unknown): RhStaffAccount | null {
    const r = asRecord(raw);
    const id = str(r.id);
    const email = str(r.email);
    if (!id || !email) return null;
    const role = normalizeStaffRole(r.role);
    if (!role) return null;
    const full_name = str(r.full_name ?? r.fullName ?? r.name) || email;
    return {
        id,
        full_name,
        email,
        role,
        status: str(r.status) || undefined,
        managed_talents_count: num(r.managed_talents_count ?? r.managedTalentsCount),
        created_at: str(r.created_at ?? r.createdAt) || undefined,
    };
}

function parseHasPortalAccess(r: Record<string, unknown>): boolean {
    const explicit = r.has_portal_access ?? r.hasPortalAccess ?? r.portal_access ?? r.portalAccess;
    if (explicit === true) return true;
    if (explicit === false) return false;
    if (typeof explicit === "string") {
        const s = explicit.trim().toLowerCase();
        if (s === "true" || s === "1" || s === "yes") return true;
        if (s === "false" || s === "0" || s === "no") return false;
    }
    const userId = str(r.user_id ?? r.userId ?? r.portal_user_id ?? r.portalUserId);
    return Boolean(userId);
}

function parseTalentAccount(raw: unknown): RhTalentAccount | null {
    const r = asRecord(raw);
    const id = str(r.talent_id ?? r.id ?? r.talentId);
    const email = str(r.email);
    const name = str(r.name ?? r.full_name ?? r.fullName);
    const job_title = str(r.job_title ?? r.jobTitle);
    if (!id || !email) return null;
    const manager_name = str(r.manager_name ?? r.managerName);
    const manager_user_id = str(r.manager_user_id ?? r.managerUserId);
    const has_manager = r.has_manager === true || r.hasManager === true || Boolean(manager_user_id && manager_name);
    const user_id = str(r.user_id ?? r.userId ?? r.portal_user_id ?? r.portalUserId) || undefined;
    return {
        id,
        talent_id: id,
        name: name || email,
        email,
        job_title: job_title || "—",
        department: str(r.department) || undefined,
        seniority: str(r.seniority ?? r.seniority_level) || undefined,
        seniority_level: str(r.seniority_level ?? r.seniority) || undefined,
        contract_type: str(r.contract_type ?? r.contractType) || undefined,
        manager_user_id: manager_user_id || undefined,
        manager_name: manager_name || undefined,
        manager_email: str(r.manager_email ?? r.managerEmail) || undefined,
        has_manager,
        phone: str(r.phone) || undefined,
        user_id,
        has_portal_access: parseHasPortalAccess(r),
        status: str(r.status) || undefined,
        created_at: str(r.created_at ?? r.createdAt) || undefined,
        updated_at: str(r.updated_at ?? r.updatedAt) || undefined,
    };
}

function buildListQueryUrl(base: string, params: RhAccountsListParams): string {
    const sp = new URLSearchParams();
    if (params.role) sp.set("role", params.role);
    if (params.status) sp.set("status", params.status);
    if (params.search) sp.set("search", params.search);
    sp.set("limit", String(params.limit ?? DEFAULT_LIST_LIMIT));
    sp.set("offset", String(params.offset ?? 0));
    const q = sp.toString();
    return q ? `${base}?${q}` : base;
}

function parseStaffListResponse(raw: unknown): RhStaffAccountsListResponse {
    const root = unwrapN8nRoot(raw);
    const usersRaw = root.users ?? asRecord(root.data).users;
    const users = Array.isArray(usersRaw)
        ? usersRaw.map(parseStaffAccount).filter((u): u is RhStaffAccount => u != null)
        : [];
    const summaryRaw = asRecord(root.summary);
    const summary =
        Object.keys(summaryRaw).length > 0
            ? {
                  total: num(summaryRaw.total, users.length),
                  managers: num(summaryRaw.managers),
                  rh: num(summaryRaw.rh),
              }
            : undefined;
    return {
        status: str(root.status) || "success",
        count: num(root.count, users.length),
        users,
        summary,
    };
}

function parseTalentListResponse(raw: unknown): RhTalentAccountsListResponse {
    const root = unwrapN8nRoot(raw);
    const talentsRaw = root.talents ?? asRecord(root.data).talents;
    const talents = Array.isArray(talentsRaw)
        ? talentsRaw.map(parseTalentAccount).filter((t): t is RhTalentAccount => t != null)
        : [];
    const summaryRaw = asRecord(root.summary);
    const summary =
        Object.keys(summaryRaw).length > 0
            ? {
                  total: num(summaryRaw.total, talents.length),
                  with_manager: num(summaryRaw.with_manager ?? summaryRaw.withManager),
                  without_manager: num(summaryRaw.without_manager ?? summaryRaw.withoutManager),
              }
            : undefined;
    return {
        status: str(root.status) || "success",
        count: num(root.count, talents.length),
        talents,
        summary,
    };
}

/** GET `/webhook/rh/users` — liste managers/RH (onglet comptes). */
export async function fetchRhStaffAccountsList(
    params: RhAccountsListParams = {},
    opts?: HttpRequestOptions,
): Promise<RhStaffAccountsListResponse> {
    const url = buildListQueryUrl(rhAccountsUrls.usersList(), { status: "active", ...params });
    try {
        const raw = await httpGet<unknown>(url, opts);
        const parsed = parseStaffListResponse(raw);
        return {
            ...parsed,
            users: parsed.users.filter((u) => u.role === "manager" || u.role === "rh"),
        };
    } catch (err) {
        throw new ApiError(mapRhAccountsApiError(err, "list"), err instanceof ApiError ? err.status : undefined);
    }
}

/** GET `/webhook/rh/accounts/talent` — liste talents (onglet comptes). */
export async function fetchRhTalentAccountsList(
    params: RhAccountsListParams = {},
    opts?: HttpRequestOptions,
): Promise<RhTalentAccountsListResponse> {
    const url = buildListQueryUrl(rhAccountsUrls.talentList(), { status: "active", ...params });
    try {
        const raw = await httpGet<unknown>(url, opts);
        return parseTalentListResponse(raw);
    } catch (err) {
        throw new ApiError(mapRhAccountsApiError(err, "list"), err instanceof ApiError ? err.status : undefined);
    }
}

export async function listRhStaffAccounts(opts?: HttpRequestOptions): Promise<RhStaffAccount[]> {
    const res = await fetchRhStaffAccountsList({}, opts);
    return res.users;
}

export async function listRhTalentAccounts(opts?: HttpRequestOptions): Promise<RhTalentAccount[]> {
    const res = await fetchRhTalentAccountsList({}, opts);
    return res.talents;
}

export async function listRhDeletedStaffAccounts(opts?: HttpRequestOptions): Promise<RhDeletedAccount[]> {
    const url = buildListQueryUrl(rhAccountsUrls.usersList(), { status: "disabled" });
    try {
        const raw = await httpGet<unknown>(url, opts);
        const parsed = parseStaffListResponse(raw);
        return parsed.users
            .filter((u) => u.role === "manager" || u.role === "rh")
            .map((u) => ({
                id: u.id,
                kind: "staff" as const,
                name: u.full_name,
                email: u.email,
                role: u.role,
                deleted_at: u.created_at,
            }));
    } catch (err) {
        throw new ApiError(mapRhAccountsApiError(err, "list"), err instanceof ApiError ? err.status : undefined);
    }
}

export async function listRhDeletedTalentAccounts(opts?: HttpRequestOptions): Promise<RhDeletedAccount[]> {
    const url = buildListQueryUrl(rhAccountsUrls.talentList(), { status: "deleted" });
    try {
        const raw = await httpGet<unknown>(url, opts);
        const parsed = parseTalentListResponse(raw);
        return parsed.talents.map((t) => ({
            id: t.id,
            kind: "talent" as const,
            name: t.name,
            email: t.email,
            job_title: t.job_title,
            deleted_at: undefined,
        }));
    } catch (err) {
        throw new ApiError(mapRhAccountsApiError(err, "list"), err instanceof ApiError ? err.status : undefined);
    }
}

export async function listRhDeletedAccounts(opts?: HttpRequestOptions): Promise<RhDeletedAccount[]> {
    const [staff, talents] = await Promise.all([listRhDeletedStaffAccounts(opts), listRhDeletedTalentAccounts(opts)]);
    return [...staff, ...talents];
}

/** Chargement initial page comptes — les deux listes en parallèle. */
export async function fetchRhAccountsPageData(opts?: HttpRequestOptions): Promise<{
    staff: RhStaffAccountsListResponse;
    talents: RhTalentAccountsListResponse;
}> {
    const [staff, talents] = await Promise.all([
        fetchRhStaffAccountsList({}, opts),
        fetchRhTalentAccountsList({}, opts),
    ]);
    return { staff, talents };
}

/** GET talents — dropdown modal « Talent existant » (wf-rh-list-talents-v1, repli sur /rh/accounts/talent). */
export async function fetchRhExistingTalentsForAccounts(
    opts?: HttpRequestOptions,
): Promise<RhExistingTalentListItem[]> {
    try {
        let items = await fetchExistingTalentsFromListWorkflow(opts);
        if (items.length === 0) {
            items = await fetchExistingTalentsFromAccountsList(opts);
        }
        console.log("talents (parsed):", items);
        return items;
    } catch (err) {
        if (err instanceof ApiError) throw enrichRhAccountsApiError(err, "list");
        throw new ApiError(mapRhAccountsApiError(err, "list"));
    }
}

/** POST compte user (manager/RH) depuis un talent existant — wf-rh-create-user-v2. */
export async function createRhUserFromExistingTalent(
    body: CreateRhStaffAccountBody,
    opts?: HttpRequestOptions,
): Promise<RhCreateStaffAccountResponse> {
    try {
        const raw = await httpPost<unknown>(rhAccountsCreateUserV2Url(), body, opts);
        const root = unwrapN8nRoot(raw);
        const user = parseStaffAccount(root.user ?? root);
        if (!user) {
            throw new ApiError("Réponse création compte invalide.", 500, raw);
        }
        return { status: str(root.status) || "success", user };
    } catch (err) {
        if (err instanceof ApiError) throw enrichRhAccountsApiError(err, "create-staff");
        throw new ApiError(mapRhAccountsApiError(err, "create-staff"));
    }
}

export async function createRhStaffAccount(
    body: CreateRhStaffAccountBody,
    opts?: HttpRequestOptions,
): Promise<RhCreateStaffAccountResponse> {
    try {
        const raw = await httpPost<unknown>(rhAccountsUrls.usersList(), body, opts);
        const root = unwrapN8nRoot(raw);
        const user = parseStaffAccount(root.user ?? root);
        if (!user) {
            throw new ApiError("Réponse création compte invalide.", 500, raw);
        }
        return { status: str(root.status) || "success", user };
    } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(mapRhAccountsApiError(err, "create-staff"));
    }
}

export async function createRhTalentAccount(
    body: CreateRhTalentAccountBody,
    opts?: HttpRequestOptions,
): Promise<RhCreateTalentAccountResponse> {
    try {
        const raw = await httpPost<unknown>(rhAccountsUrls.talentList(), body, opts);
        const root = unwrapN8nRoot(raw);
        const talent = parseTalentAccount(root.talent ?? root);
        if (!talent) {
            throw new ApiError("Réponse création talent invalide.", 500, raw);
        }
        return { status: str(root.status) || "success", talent };
    } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(mapRhAccountsApiError(err, "create-talent"));
    }
}

function parsePatchStaffResponse(raw: unknown): RhPatchStaffAccountResponse {
    const root = unwrapN8nRoot(raw);
    const user = parseStaffAccount(root.user ?? root);
    return {
        status: str(root.status) || "success",
        user: user ?? undefined,
        message: str(root.message) || undefined,
    };
}

function parsePatchTalentResponse(raw: unknown): RhPatchTalentAccountResponse {
    const root = unwrapN8nRoot(raw);
    const talent = parseTalentAccount(root.talent ?? root);
    return {
        status: str(root.status) || "success",
        talent: talent ?? undefined,
        message: str(root.message) || undefined,
    };
}

export async function patchRhStaffAccount(
    userId: string,
    body: RhStaffPatchAction,
    opts?: HttpRequestOptions,
): Promise<RhPatchStaffAccountResponse> {
    const ctx = body.action === "change_password" ? "change-password" : "patch-staff";
    try {
        const raw = await httpPatch<unknown>(rhAccountsUsersPatchItemUrl(userId), body, opts);
        return parsePatchStaffResponse(raw);
    } catch (err) {
        if (err instanceof ApiError) throw enrichRhAccountsApiError(err, ctx);
        throw new ApiError(mapRhAccountsApiError(err, ctx));
    }
}

export async function patchRhTalentAccount(
    talentId: string,
    body: RhTalentPatchAction,
    opts?: HttpRequestOptions,
): Promise<RhPatchTalentAccountResponse> {
    try {
        const raw = await httpPatch<unknown>(rhAccountsTalentPatchItemUrl(talentId), body, opts);
        return parsePatchTalentResponse(raw);
    } catch (err) {
        if (err instanceof ApiError) throw enrichRhAccountsApiError(err, "patch-talent");
        throw new ApiError(mapRhAccountsApiError(err, "patch-talent"));
    }
}

export async function changeRhStaffPassword(
    userId: string,
    newPassword: string,
    opts?: HttpRequestOptions,
): Promise<RhPatchStaffAccountResponse> {
    return patchRhStaffAccount(userId, { action: "change_password", new_password: newPassword }, opts);
}

export async function toggleRhStaffStatus(
    userId: string,
    opts?: HttpRequestOptions,
): Promise<RhPatchStaffAccountResponse> {
    return patchRhStaffAccount(userId, { action: "toggle_status" }, opts);
}

export async function toggleRhTalentStatus(
    talentId: string,
    opts?: HttpRequestOptions,
): Promise<RhPatchTalentAccountResponse> {
    return patchRhTalentAccount(talentId, { action: "toggle_status" }, opts);
}

function assertRhAccountsDeleteSuccess(raw: unknown): void {
    const root = unwrapN8nRoot(raw);
    if (str(root.status).toLowerCase() === "error") {
        throw new ApiError(messageFromPayload(root, "Suppression échouée."), undefined, root);
    }
}

export async function deleteRhStaffAccount(
    userId: string,
    opts?: HttpRequestOptions,
): Promise<RhDeleteStaffAccountResponse> {
    try {
        const raw = await httpDelete<unknown>(rhAccountsUsersDeleteItemUrl(userId), opts);
        assertRhAccountsDeleteSuccess(raw);
        const root = unwrapN8nRoot(raw);
        const user = parseStaffAccount(root.user ?? root);
        const cascadeRaw = asRecord(root.cascade);
        const cascade =
            Object.keys(cascadeRaw).length > 0
                ? {
                      sessions_revoked: num(cascadeRaw.sessions_revoked),
                      talents_unassigned: num(cascadeRaw.talents_unassigned),
                  }
                : undefined;
        if (!user) {
            return {
                status: str(root.status) || "success",
                user: {
                    id: userId,
                    full_name: "",
                    email: "",
                    role: "manager",
                    managed_talents_count: 0,
                },
                cascade,
            };
        }
        return { status: str(root.status) || "success", user, cascade };
    } catch (err) {
        if (err instanceof ApiError) throw enrichRhAccountsApiError(err, "delete-staff");
        throw new ApiError(mapRhAccountsApiError(err, "delete-staff"));
    }
}

export async function deleteRhTalentAccount(
    talentId: string,
    opts?: HttpRequestOptions,
): Promise<RhDeleteTalentAccountResponse> {
    try {
        const raw = await httpDelete<unknown>(rhAccountsTalentDeleteItemUrl(talentId), opts);
        assertRhAccountsDeleteSuccess(raw);
        const root = unwrapN8nRoot(raw);
        const talent = parseTalentAccount(root.talent ?? root);
        if (!talent) {
            return {
                status: str(root.status) || "success",
                talent: { id: talentId, name: "", email: "", job_title: "", has_manager: false },
            };
        }
        return { status: str(root.status) || "success", talent };
    } catch (err) {
        if (err instanceof ApiError) throw enrichRhAccountsApiError(err, "delete-talent");
        throw new ApiError(mapRhAccountsApiError(err, "delete-talent"));
    }
}

/** Alias service demandé par la spec intégration. */
export const accountsService = {
    fetchRhStaffAccountsList,
    fetchRhTalentAccountsList,
    fetchRhAccountsPageData,
    listRhStaffAccounts,
    listRhTalentAccounts,
    listRhDeletedAccounts,
    fetchRhExistingTalentsForAccounts,
    createRhUserFromExistingTalent,
    createRhStaffAccount,
    createRhTalentAccount,
    patchRhStaffAccount,
    patchRhTalentAccount,
    changeRhStaffPassword,
    toggleRhStaffStatus,
    toggleRhTalentStatus,
    deleteRhStaffAccount,
    deleteRhTalentAccount,
    mapRhAccountsApiError,
};
