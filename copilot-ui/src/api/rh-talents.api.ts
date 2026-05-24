/**
 * WF_RH_Talents — GET `{apiBase}/rh/talents` et GET `{apiBase}/rh/talents/:id`
 */
import { resolveRhWebhookBase, RH_DASHBOARD_WEBHOOK_BASE } from "@/api/rh-dashboard.api";
import { authStorage } from "@/lib/auth-storage";
import type {
    CreateRhTalentPayload,
    CreateRhTalentResponse,
    UpdateRhTalentPayload,
    UpdateRhTalentResponse,
    RhTalentAlert,
    RhTalentAnalyst,
    RhTalentAssignment,
    RhTalentBestMatch,
    RhTalentCapacity,
    RhTalentDetail,
    RhTalentDetailSkill,
    RhTalentEmployment,
    RhTalentListItem,
    RhTalentListSkill,
    RhTalentProfile,
    RhTalentsListResponse,
    RhTalentSummary,
} from "@/types/rh-talents.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export const RH_TALENTS_WEBHOOK_BASE = RH_DASHBOARD_WEBHOOK_BASE;

/** Slug workflow n8n détail talent — GET `…/wf-rh-talents-detail-v1/rh/talents/:id`. */
export const RH_TALENT_DETAIL_WORKFLOW_SLUG = "wf-rh-talents-detail-v1";

/** Slug workflow n8n DELETE — WF_RH_Talents_Delete_v1. */
export const RH_TALENT_DELETE_WORKFLOW_SLUG = "wf-rh-talents-delete-v1";

/** Slug workflow n8n PATCH — WF_RH_Talents_Update_v1. */
export const RH_TALENT_UPDATE_WORKFLOW_SLUG = "wf-rh-talents-update-v1";

/** Prod : `https://n8nprod.aphelionxinnovations.com/webhook/wf-rh-talents-detail-v1` */
export const RH_TALENT_DETAIL_WEBHOOK_BASE_PROD = `${RH_DASHBOARD_WEBHOOK_BASE.replace(/\/$/, "")}/${RH_TALENT_DETAIL_WORKFLOW_SLUG}`;

/** Préfixe DELETE par défaut — WF_RH_Talents_Delete_v1 */
export const RH_TALENT_DELETE_WEBHOOK_PREFIX_DEFAULT = `/webhook/${RH_TALENT_DELETE_WORKFLOW_SLUG}/rh/talents`;

/** Préfixe PATCH par défaut — WF_RH_Talents_Update_v1 */
export const RH_TALENT_UPDATE_WEBHOOK_PREFIX_DEFAULT = `/webhook/${RH_TALENT_UPDATE_WORKFLOW_SLUG}/rh/talents`;

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function recordNumbers(raw: unknown): Record<string, number> {
    const o = asRecord(raw);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(o)) {
        out[k] = num(v);
    }
    return out;
}

function getRhBearerToken(token?: string | null): string | null {
    return token?.trim() || authStorage.getAccessToken()?.trim() || null;
}

export function buildRhTalentsAuthHeaders(token?: string | null): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };
    const t = getRhBearerToken(token);
    if (t) headers.Authorization = `Bearer ${t}`;
    return headers;
}

function messageFromRhBody(raw: unknown, fallback: string): string {
    const root = unwrapN8nRoot(raw);
    const msg = String(root.message ?? root.error ?? root.detail ?? "").trim();
    if (msg.toLowerCase().includes("workflow execution failed")) {
        return "Le workflow WF_RH_Talents a échoué sur n8n — consultez les exécutions.";
    }
    return msg || fallback;
}

function isWebhookNotRegisteredMessage(msg: string): boolean {
    return msg.toLowerCase().includes("not registered");
}

/** Message court pour l’UI (drawer, toasts). */
export function toRhTalentsUserMessage(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err);
    if (isWebhookNotRegisteredMessage(raw)) {
        return `Webhook détail non publié — activez WF ${RH_TALENT_DETAIL_WORKFLOW_SLUG} en production (GET …/rh/talents/:id).`;
    }
    if (raw.length > 280) return `${raw.slice(0, 280)}…`;
    return raw;
}

/**
 * Base du webhook détail RH.
 * Dev : `/webhook-test/wf-rh-talents-detail-v1` (proxy Vite, aligné URL test n8n).
 * Prod : `{apiBase}/wf-rh-talents-detail-v1` ou `VITE_RH_TALENT_DETAIL_WEBHOOK_PREFIX`.
 */
export function resolveRhTalentDetailBase(apiBase?: string): string {
    const fromPrefix = (import.meta.env.VITE_RH_TALENT_DETAIL_WEBHOOK_PREFIX as string | undefined)?.trim();
    if (fromPrefix) {
        return fromPrefix.replace(/\/$/, "");
    }
    if (import.meta.env.DEV) {
        return `/webhook-test/${RH_TALENT_DETAIL_WORKFLOW_SLUG}`;
    }
    const webhookRoot = resolveRhWebhookBase(apiBase).replace(/\/$/, "");
    return `${webhookRoot}/${RH_TALENT_DETAIL_WORKFLOW_SLUG}`;
}

/** URL GET détail — ex. `…/wf-rh-talents-detail-v1/rh/talents/{id}`. */
export function rhTalentDetailUrl(talentId: string, apiBase?: string): string {
    const fromTemplate = (import.meta.env.VITE_RH_TALENT_DETAIL_URL as string | undefined)?.trim();
    const id = encodeURIComponent(talentId.trim());
    if (fromTemplate) {
        return fromTemplate.replace(/\{id\}/g, id).replace(/:id\b/g, id);
    }
    const base = resolveRhTalentDetailBase(apiBase);
    return `${base}/rh/talents/${id}`;
}

function buildRhTalentDetailUrls(apiBase: string | undefined, talentId: string): string[] {
    const primary = rhTalentDetailUrl(talentId, apiBase);
    const urls = [primary];
    if (import.meta.env.DEV) {
        const prodStyle = `${resolveRhWebhookBase(apiBase).replace(/\/$/, "")}/${RH_TALENT_DETAIL_WORKFLOW_SLUG}/rh/talents/${encodeURIComponent(talentId.trim())}`;
        if (prodStyle !== primary) urls.push(prodStyle);
    }
    return urls;
}

/** URL PATCH — `/webhook/wf-rh-talents-update-v1/rh/talents/{uuid}` */
function buildRhTalentUpdateUrl(talentId: string): string {
    const id = encodeURIComponent(talentId.trim());
    const explicitUrl = (import.meta.env.VITE_RH_TALENT_UPDATE_URL as string | undefined)?.trim();
    if (explicitUrl) {
        return explicitUrl.replace(/\{id\}/g, id).replace(/:id\b/g, id);
    }
    const prefix =
        (import.meta.env.VITE_RH_TALENT_UPDATE_WEBHOOK_PREFIX as string | undefined)?.trim() ||
        RH_TALENT_UPDATE_WEBHOOK_PREFIX_DEFAULT;
    return `${prefix.replace(/\/$/, "")}/${id}`;
}

/** URL DELETE — `/webhook/wf-rh-talents-delete-v1/rh/talents/{uuid}` */
function buildRhTalentDeleteUrl(talentId: string): string {
    const id = encodeURIComponent(talentId.trim());
    const explicitUrl = (import.meta.env.VITE_RH_TALENT_DELETE_URL as string | undefined)?.trim();
    if (explicitUrl) {
        return explicitUrl.replace(/\{id\}/g, id).replace(/:id\b/g, id);
    }
    const prefix =
        (import.meta.env.VITE_RH_TALENT_DELETE_WEBHOOK_PREFIX as string | undefined)?.trim() ||
        RH_TALENT_DELETE_WEBHOOK_PREFIX_DEFAULT;
    return `${prefix.replace(/\/$/, "")}/${id}`;
}

function parseListSkill(row: unknown): RhTalentListSkill | null {
    const r = asRecord(row);
    const name = str(r.name ?? r.skill_name);
    if (!name) return null;
    return {
        name,
        level: num(r.level ?? r.proficiency_level),
        category: str(r.category ?? r.skill_category) || undefined,
    };
}

function parseListItem(row: unknown): RhTalentListItem | null {
    const r = asRecord(row);
    const id = str(r.id ?? r.talent_id);
    const name = str(r.name ?? r.full_name ?? r.talent_name);
    if (!id || !name) return null;

    const skillsRaw = r.top_skills ?? r.skills;
    const top_skills = Array.isArray(skillsRaw)
        ? skillsRaw.map(parseListSkill).filter((x): x is RhTalentListSkill => x != null)
        : [];

    return {
        id,
        name,
        email: r.email != null ? str(r.email) : null,
        phone: r.phone != null ? str(r.phone) : null,
        job_title: str(r.job_title ?? r.position) || null,
        department: str(r.department) || null,
        seniority_level: str(r.seniority_level ?? r.seniority) || null,
        status: str(r.status ?? r.employment_status) || "active",
        hire_date: r.hire_date != null ? str(r.hire_date) : null,
        current_load_pct: num(r.current_load_pct ?? r.load_pct ?? r.total_allocation_pct),
        available_pct: num(r.available_pct ?? r.availability_pct),
        active_projects_count: num(r.active_projects_count ?? r.projects_count),
        top_skills,
    };
}

/** Normalise GET /rh/talents (`status: success`, `talents`, `distribution`). */
export function normalizeRhTalentsList(raw: unknown): RhTalentsListResponse | null {
    if (raw == null) return null;
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") return null;

    const talentsRaw = root.talents;
    const talents = Array.isArray(talentsRaw)
        ? talentsRaw.map(parseListItem).filter((x): x is RhTalentListItem => x != null)
        : [];

    if (!talents.length && root.status !== "success" && !Array.isArray(talentsRaw)) {
        return null;
    }

    const dist = asRecord(root.distribution);
    return {
        status: str(root.status) || undefined,
        talents,
        count: num(root.count, talents.length),
        distribution: {
            available: num(dist.available),
            fully_loaded: num(dist.fully_loaded ?? dist.fullyLoaded),
            by_department: recordNumbers(dist.by_department ?? dist.byDepartment),
        },
    };
}

function parseDetailSkill(row: unknown): RhTalentDetailSkill | null {
    const r = asRecord(row);
    const skill_name = str(r.skill_name ?? r.name);
    if (!skill_name) return null;
    return {
        id: str(r.id ?? r.skill_id) || undefined,
        skill_name,
        skill_category: str(r.skill_category ?? r.category) || undefined,
        proficiency_level: num(r.proficiency_level ?? r.level),
        years_experience: r.years_experience != null ? num(r.years_experience, NaN) : null,
    };
}

function parseAssignment(row: unknown): RhTalentAssignment | null {
    const r = asRecord(row);
    const project_name = str(r.project_name ?? r.name);
    if (!project_name && !str(r.project_id)) return null;
    return {
        id: str(r.id ?? r.assignment_id) || undefined,
        project_id: str(r.project_id) || undefined,
        project_name: project_name || undefined,
        role_on_project: str(r.role_on_project ?? r.role) || undefined,
        allocation_pct: r.allocation_pct != null ? num(r.allocation_pct) : undefined,
        status: str(r.status ?? r.project_status) || undefined,
        start_date: r.start_date != null ? str(r.start_date) : undefined,
        end_date: r.end_date != null ? str(r.end_date) : undefined,
        project_priority: r.project_priority != null ? num(r.project_priority, NaN) : null,
        criticality: str(r.criticality ?? r.project_criticality) || null,
    };
}

function parseEmployment(raw: unknown): RhTalentEmployment | null {
    const r = asRecord(raw);
    if (!Object.keys(r).length) return null;
    return {
        role: str(r.role ?? r.job_title) || null,
        contract_type: str(r.contract_type ?? r.contract) || null,
        salary: r.salary ?? r.salary_amount ?? null,
        integration_date: str(r.integration_date ?? r.hire_date) || null,
        manager_name: str(r.manager_name ?? r.manager) || null,
        manager_id: str(r.manager_id) || null,
    };
}

function parseProfile(raw: unknown): RhTalentProfile | null {
    const r = asRecord(raw);
    const city = str(r.city ?? r.location);
    const country = str(r.country);
    if (!city && !country) return null;
    return { city: city || null, country: country || null };
}

function parseCapacity(raw: unknown): RhTalentCapacity | null {
    const r = asRecord(raw);
    const h = r.capacity_hours_per_week ?? r.hours_per_week ?? r.weekly_hours;
    if (h == null) return null;
    return { capacity_hours_per_week: num(h, NaN) || null };
}

function parseSummary(raw: unknown): RhTalentSummary | null {
    const r = asRecord(raw);
    if (!Object.keys(r).length) return null;
    return {
        total_allocation_pct: num(r.total_allocation_pct ?? r.allocation_pct, NaN) || undefined,
        overload: Boolean(r.overload ?? r.is_overloaded),
        tension: Boolean(r.tension),
        active_projects_count: num(r.active_projects_count, NaN) || undefined,
        active_alerts_count: num(r.active_alerts_count ?? r.alerts_count, NaN) || undefined,
        contract_ending_soon: Boolean(r.contract_ending_soon),
        risk_level: str(r.risk_level) || undefined,
    };
}

function parseAlert(row: unknown): RhTalentAlert | null {
    const r = asRecord(row);
    const message = str(r.message ?? r.title ?? r.detail);
    if (!message && !str(r.id)) return null;
    return {
        id: str(r.id) || undefined,
        severity: str(r.severity) || undefined,
        message: message || undefined,
        risk_type: str(r.risk_type ?? r.category) || undefined,
        detected_at: str(r.detected_at ?? r.created_at) || null,
    };
}

function parseAnalyst(raw: unknown): RhTalentAnalyst | null {
    const r = asRecord(raw);
    if (!Object.keys(r).length) return null;
    const nine = asRecord(r.nine_box ?? r.nineBox);
    const ipi = asRecord(r.ipi);
    const mob = asRecord(r.mobility);
    return {
        nine_box: Object.keys(nine).length
            ? {
                  performance_score: num(nine.performance_score, NaN) || undefined,
                  potential_score: num(nine.potential_score, NaN) || undefined,
                  box_label: str(nine.box_label) || null,
                  rationale: str(nine.rationale) || null,
              }
            : null,
        ipi: Object.keys(ipi).length
            ? {
                  ipi_score: num(ipi.ipi_score, NaN) || undefined,
                  tech_score: num(ipi.tech_score, NaN) || undefined,
                  exp_score: num(ipi.exp_score, NaN) || undefined,
                  stability_score: num(ipi.stability_score, NaN) || undefined,
                  band: str(ipi.band) || null,
              }
            : null,
        mobility: Object.keys(mob).length
            ? {
                  mobility_flag: str(mob.mobility_flag ?? mob.flag) || null,
                  mobility_score: num(mob.mobility_score, NaN) || undefined,
                  drivers: Array.isArray(mob.drivers) ? mob.drivers : null,
              }
            : null,
        recommendation: str(r.recommendation ?? r.ai_recommendation) || null,
    };
}

function mergeDetailExtras(detail: RhTalentDetail, root: Record<string, unknown>): RhTalentDetail {
    const block = asRecord(root.talent ?? root.data);
    const employmentRaw =
        root.talent_employment ?? block.talent_employment ?? root.employment ?? block.employment;
    const alertsRaw = root.active_alerts ?? block.active_alerts ?? root.alerts;

    return {
        ...detail,
        contract_end_date:
            detail.contract_end_date ??
            (str(root.contract_end_date ?? block.contract_end_date) || null),
        employment: detail.employment ?? parseEmployment(employmentRaw),
        profile: detail.profile ?? parseProfile(root.profile ?? block.profile),
        capacity: detail.capacity ?? parseCapacity(root.capacity ?? block.capacity),
        summary: detail.summary ?? parseSummary(root.summary ?? block.summary),
        active_alerts:
            detail.active_alerts?.length
                ? detail.active_alerts
                : Array.isArray(alertsRaw)
                  ? alertsRaw.map(parseAlert).filter((x): x is RhTalentAlert => x != null)
                  : [],
        analyst: detail.analyst ?? parseAnalyst(root.analyst ?? block.analyst),
    };
}

function parseBestMatch(raw: unknown): RhTalentBestMatch | null {
    const r = asRecord(raw);
    const project_name = str(r.project_name ?? r.name);
    if (!project_name) return null;
    return {
        project_id: str(r.project_id) || undefined,
        project_name,
        overall_score: r.overall_score != null ? num(r.overall_score, NaN) : undefined,
        recommendation_type: str(r.recommendation_type) || undefined,
    };
}

function parseTalentDetailBlock(block: Record<string, unknown>): RhTalentDetail | null {
    const id = str(block.id ?? block.talent_id);
    const name = str(block.name ?? block.full_name);
    if (!id || !name) return null;

    const skillsRaw = block.skills ?? block.competencies;
    const skills = Array.isArray(skillsRaw)
        ? skillsRaw.map(parseDetailSkill).filter((x): x is RhTalentDetailSkill => x != null)
        : [];

    const activeRaw = block.active_assignments ?? block.active_missions ?? block.assignments;
    const active_assignments = Array.isArray(activeRaw)
        ? activeRaw.map(parseAssignment).filter((x): x is RhTalentAssignment => x != null)
        : [];

    const pastRaw = block.past_assignments ?? block.history ?? block.assignment_history;
    const past_assignments = Array.isArray(pastRaw)
        ? pastRaw.map(parseAssignment).filter((x): x is RhTalentAssignment => x != null)
        : [];

    const best_match = parseBestMatch(block.best_match ?? block.best_matching);

    return {
        id,
        name,
        email: block.email != null ? str(block.email) : null,
        phone: block.phone != null ? str(block.phone) : null,
        job_title: str(block.job_title ?? block.position) || null,
        department: str(block.department) || null,
        seniority_level: str(block.seniority_level ?? block.seniority) || null,
        bio: str(block.bio) || null,
        status: str(block.status) || "active",
        hire_date: block.hire_date != null ? str(block.hire_date) : null,
        current_load_pct: num(block.current_load_pct ?? block.load_pct),
        available_pct: num(block.available_pct),
        skills,
        active_assignments,
        past_assignments,
        best_match,
    };
}

/** Normalise GET /rh/talents/:id (`status: success`, `talent`). */
export function normalizeRhTalentDetail(raw: unknown): RhTalentDetail | null {
    if (raw == null) return null;
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") return null;

    const talentBlock = asRecord(root.talent ?? root.data);
    const detail = parseTalentDetailBlock(talentBlock) ?? parseTalentDetailBlock(root);
    if (!detail) return null;
    return mergeDetailExtras(detail, root);
}

export type RhTalentsListParams = {
    enterprise_id: string;
    status?: string;
    limit?: number;
    search?: string;
    department?: string;
    available_only?: boolean;
};

export type RhTalentsFetchOptions = ApiClientOptions & {
    apiBase?: string;
    token?: string | null;
    /** Requis par certains workflows n8n pour GET détail via query. */
    enterprise_id?: string;
};

function buildListQuery(params: RhTalentsListParams): string {
    const q = new URLSearchParams({
        enterprise_id: params.enterprise_id.trim(),
        status: params.status?.trim() || "all",
        limit: String(Math.min(Math.max(params.limit ?? 100, 1), 500)),
    });
    if (params.search?.trim()) q.set("search", params.search.trim());
    if (params.department?.trim()) q.set("department", params.department.trim());
    if (params.available_only) q.set("available_only", "true");
    return q.toString();
}

export async function fetchRhTalentsList(
    params: RhTalentsListParams,
    options?: RhTalentsFetchOptions,
): Promise<RhTalentsListResponse> {
    const base = resolveRhWebhookBase(options?.apiBase);
    const url = `${base}/rh/talents?${buildListQuery(params)}`;

    const res = await fetch(url, {
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });

    let json: unknown = {};
    try {
        json = await res.json();
    } catch {
        json = {};
    }

    if (!res.ok) {
        throw new Error(messageFromRhBody(json, `Liste talents : HTTP ${res.status}`));
    }

    const normalized = normalizeRhTalentsList(json);
    if (normalized) return normalized;

    const root = unwrapN8nRoot(json);
    if (root.status !== "success" && !Array.isArray(root.talents)) {
        throw new Error(messageFromRhBody(json, "Réponse liste talents RH invalide"));
    }
    throw new Error(messageFromRhBody(json, "Réponse liste talents RH vide"));
}

export async function fetchRhTalentDetail(
    talentId: string,
    options?: RhTalentsFetchOptions,
): Promise<RhTalentDetail> {
    const urls = buildRhTalentDetailUrls(options?.apiBase, talentId);
    const headers = buildRhTalentsAuthHeaders(options?.token);

    let lastMsg = "Talent introuvable";
    let sawNotRegistered = false;

    for (const url of urls) {
        if (import.meta.env.DEV) {
            console.log("[RH API] GET talent detail (try)", url);
        }

        let res: Response;
        try {
            res = await fetch(url, {
                headers,
                credentials: "omit",
                signal: options?.signal,
            });
        } catch (e) {
            lastMsg = e instanceof Error ? e.message : "Erreur réseau";
            continue;
        }

        let json: unknown = {};
        try {
            json = await res.json();
        } catch {
            json = {};
        }

        const msg = messageFromRhBody(json, `Détail talent : HTTP ${res.status}`);
        if (!res.ok) {
            lastMsg = msg;
            if (isWebhookNotRegisteredMessage(msg)) {
                sawNotRegistered = true;
                continue;
            }
            if (res.status === 404) continue;
            throw new Error(toRhTalentsUserMessage(new Error(msg)));
        }

        const normalized = normalizeRhTalentDetail(json);
        if (normalized && normalized.id === talentId.trim()) {
            return normalized;
        }
        if (normalized) return normalized;

        const root = unwrapN8nRoot(json);
        if (root.status === "error") {
            lastMsg = msg;
            continue;
        }
        lastMsg = messageFromRhBody(json, "Réponse détail talent RH invalide");
    }

    if (sawNotRegistered) {
        throw new Error(toRhTalentsUserMessage(new Error(lastMsg)));
    }
    throw new Error(lastMsg);
}

/** Erreur POST /rh/talents (code métier n8n, ex. EMAIL_CONFLICT). */
export class RhTalentCreateError extends Error {
    readonly code?: string;
    readonly httpStatus: number;

    constructor(message: string, options?: { code?: string; httpStatus?: number }) {
        super(message);
        this.name = "RhTalentCreateError";
        this.code = options?.code;
        this.httpStatus = options?.httpStatus ?? 0;
    }
}

function slimCreateTalentBody(payload: CreateRhTalentPayload): Record<string, unknown> {
    const out: Record<string, unknown> = {
        name: payload.name.trim(),
        email: payload.email.trim(),
        status: payload.status?.trim() || "active",
    };
    const phone = payload.phone?.trim();
    if (phone) out.phone = phone;
    const job = payload.job_title?.trim();
    if (job) out.job_title = job;
    const dept = payload.department?.trim();
    if (dept) out.department = dept;
    const seniority = payload.seniority_level?.trim();
    if (seniority) out.seniority_level = seniority;
    const hire = payload.hire_date?.trim();
    if (hire) out.hire_date = hire;
    const bio = payload.bio?.trim();
    if (bio) out.bio = bio;
    return out;
}

export function mapRhTalentCreateError(err: unknown): string {
    if (err instanceof RhTalentCreateError) {
        if (err.httpStatus === 401 || err.code === "UNAUTHORIZED") {
            return "Session expirée, reconnectez-vous.";
        }
        if (err.code === "EMAIL_CONFLICT" || err.httpStatus === 409) {
            return "Cet email existe déjà.";
        }
        return err.message;
    }
    return err instanceof Error ? err.message : "Impossible de créer le talent";
}

/**
 * POST `{apiBase}/rh/talents` — WF_RH_Talents_CRUD (operation: create).
 */
export async function createRhTalent(
    payload: CreateRhTalentPayload,
    options?: RhTalentsFetchOptions,
): Promise<CreateRhTalentResponse> {
    const base = resolveRhWebhookBase(options?.apiBase);
    const url = `${base}/rh/talents`;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            ...buildRhTalentsAuthHeaders(options?.token),
            "Content-Type": "application/json",
        },
        credentials: "omit",
        signal: options?.signal,
        body: JSON.stringify(slimCreateTalentBody(payload)),
    });

    let json: unknown = {};
    try {
        json = await res.json();
    } catch {
        json = {};
    }

    const root = unwrapN8nRoot(json);
    const code = str(root.code ?? root.__code);
    const msg = messageFromRhBody(json, `Création talent : HTTP ${res.status}`);

    if (res.status === 401) {
        throw new RhTalentCreateError("Session expirée, reconnectez-vous.", { code: "UNAUTHORIZED", httpStatus: 401 });
    }

    if (
        res.status === 409 ||
        code === "EMAIL_CONFLICT" ||
        (root.status === "error" && code === "EMAIL_CONFLICT")
    ) {
        throw new RhTalentCreateError("Cet email existe déjà.", { code: "EMAIL_CONFLICT", httpStatus: res.status || 409 });
    }

    if (!res.ok || root.status === "error") {
        throw new RhTalentCreateError(msg, { code: code || undefined, httpStatus: res.status });
    }

    const created = parseListItem(root.talent ?? root.data);
    if (!created) {
        throw new RhTalentCreateError(messageFromRhBody(json, "Réponse création talent invalide"), {
            httpStatus: res.status,
        });
    }

    return {
        talent: created,
        message: str(root.message) || "Talent créé avec succès",
    };
}

function slimUpdateTalentBody(payload: UpdateRhTalentPayload): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (payload.name !== undefined) out.name = payload.name.trim();
    if (payload.email !== undefined) out.email = payload.email.trim();
    if (payload.phone !== undefined) out.phone = payload.phone?.trim() || null;
    if (payload.job_title !== undefined) out.job_title = payload.job_title?.trim() || null;
    if (payload.department !== undefined) out.department = payload.department?.trim() || null;
    if (payload.seniority_level !== undefined) out.seniority_level = payload.seniority_level?.trim() || null;
    if (payload.status !== undefined) out.status = payload.status.trim();
    if (payload.hire_date !== undefined) out.hire_date = payload.hire_date?.trim() || null;
    if (payload.bio !== undefined) out.bio = payload.bio?.trim() || null;
    return out;
}

/** Fusionne les champs éditables d’un talent mis à jour dans une carte liste. */
export function mergeRhTalentListItem(
    prev: RhTalentListItem,
    updated: RhTalentListItem,
): RhTalentListItem {
    return {
        ...prev,
        ...updated,
        id: prev.id,
        top_skills: updated.top_skills?.length ? updated.top_skills : prev.top_skills,
        current_load_pct: updated.current_load_pct ?? prev.current_load_pct,
        available_pct: updated.available_pct ?? prev.available_pct,
        active_projects_count: updated.active_projects_count ?? prev.active_projects_count,
    };
}

/** Erreur PATCH /rh/talents/:id. */
export class RhTalentUpdateError extends Error {
    readonly code?: string;
    readonly httpStatus: number;

    constructor(message: string, options?: { code?: string; httpStatus?: number }) {
        super(message);
        this.name = "RhTalentUpdateError";
        this.code = options?.code;
        this.httpStatus = options?.httpStatus ?? 0;
    }
}

export function mapRhTalentUpdateError(err: unknown): string {
    if (err instanceof RhTalentUpdateError) {
        if (err.httpStatus === 401 || err.code === "UNAUTHORIZED") {
            return "Session expirée, reconnectez-vous.";
        }
        if (err.code === "TALENT_NOT_FOUND" || err.httpStatus === 404) {
            return err.message || "Talent introuvable.";
        }
        if (err.code === "EMAIL_CONFLICT" || err.httpStatus === 409) {
            return err.message || "Cet email existe déjà.";
        }
        if (err.message) return err.message;
    }
    return err instanceof Error ? err.message : "Impossible de modifier le talent";
}

/**
 * PATCH WF_RH_Talents_Update_v1 — `/webhook/wf-rh-talents-update-v1/rh/talents/{id}`.
 */
export async function updateRhTalent(
    talentId: string,
    payload: UpdateRhTalentPayload,
    options?: RhTalentsFetchOptions,
): Promise<UpdateRhTalentResponse> {
    const body = slimUpdateTalentBody(payload);
    const url = buildRhTalentUpdateUrl(talentId);
    console.log("[RH] Updating talent", body);
    console.log("[RH] PATCH talent URL:", url);

    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            ...buildRhTalentsAuthHeaders(options?.token),
            "Content-Type": "application/json",
        },
        credentials: "omit",
        signal: options?.signal,
        body: JSON.stringify(body),
    });

    let json: unknown = {};
    try {
        json = await res.json();
    } catch {
        json = {};
    }

    const root = unwrapN8nRoot(json);
    const code = str(root.code ?? root.__code);
    const msg = messageFromRhBody(json, `Modification talent : HTTP ${res.status}`);

    if (res.status === 401) {
        throw new RhTalentUpdateError("Session expirée, reconnectez-vous.", { code: "UNAUTHORIZED", httpStatus: 401 });
    }

    if (res.status === 404 || code === "TALENT_NOT_FOUND") {
        throw new RhTalentUpdateError(msg || "Talent introuvable.", { code: "TALENT_NOT_FOUND", httpStatus: 404 });
    }

    if (
        res.status === 409 ||
        code === "EMAIL_CONFLICT" ||
        (root.status === "error" && code === "EMAIL_CONFLICT")
    ) {
        throw new RhTalentUpdateError(msg || "Cet email existe déjà.", { code: "EMAIL_CONFLICT", httpStatus: res.status || 409 });
    }

    if (!res.ok || root.status === "error") {
        throw new RhTalentUpdateError(msg, { code: code || undefined, httpStatus: res.status });
    }

    const updated = parseListItem(root.talent ?? root.data);
    if (!updated) {
        throw new RhTalentUpdateError(messageFromRhBody(json, "Réponse modification talent invalide"), {
            httpStatus: res.status,
        });
    }

    return {
        talent: updated,
        message: str(root.message) || "Talent modifié avec succès",
    };
}

/** Erreur DELETE /rh/talents/:id (ex. ACTIVE_ASSIGNMENTS_EXIST). */
export class RhTalentDeleteError extends Error {
    readonly code?: string;
    readonly httpStatus: number;

    constructor(message: string, options?: { code?: string; httpStatus?: number }) {
        super(message);
        this.name = "RhTalentDeleteError";
        this.code = options?.code;
        this.httpStatus = options?.httpStatus ?? 0;
    }
}

export function mapRhTalentDeleteError(err: unknown): string {
    if (err instanceof RhTalentDeleteError) {
        if (err.httpStatus === 401 || err.code === "UNAUTHORIZED") {
            return "Session expirée, reconnectez-vous.";
        }
        if (err.code === "TALENT_NOT_FOUND" || err.httpStatus === 404) {
            return err.message || "Talent introuvable.";
        }
        if (err.code === "ACTIVE_ASSIGNMENTS_EXIST") {
            return err.message || "Ce talent a encore des missions actives.";
        }
        if (err.message) return err.message;
    }
    return err instanceof Error ? err.message : "Impossible de désactiver le talent";
}

export type DeleteRhTalentResult = {
    message: string;
};

/**
 * DELETE WF_RH_Talents_Delete_v1 — `DELETE /webhook/wf-rh-talents-delete-v1/rh/talents/{id}`.
 */
export async function deleteRhTalent(
    talentId: string,
    options?: RhTalentsFetchOptions,
): Promise<DeleteRhTalentResult> {
    const url = buildRhTalentDeleteUrl(talentId);
    console.log("[RH] DELETE talent URL:", url);

    const res = await fetch(url, {
        method: "DELETE",
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });

    let json: unknown = {};
    try {
        json = await res.json();
    } catch {
        json = {};
    }

    const root = unwrapN8nRoot(json);
    const code = str(root.code ?? root.__code);
    const msg = messageFromRhBody(json, `Désactivation talent : HTTP ${res.status}`);

    if (res.status === 401) {
        throw new RhTalentDeleteError("Session expirée, reconnectez-vous.", {
            code: "UNAUTHORIZED",
            httpStatus: 401,
        });
    }

    if (res.status === 404 || code === "TALENT_NOT_FOUND") {
        throw new RhTalentDeleteError(msg || "Talent introuvable.", {
            code: "TALENT_NOT_FOUND",
            httpStatus: 404,
        });
    }

    if (
        res.status === 422 ||
        code === "ACTIVE_ASSIGNMENTS_EXIST" ||
        (root.status === "error" && code === "ACTIVE_ASSIGNMENTS_EXIST")
    ) {
        throw new RhTalentDeleteError(msg, { code: "ACTIVE_ASSIGNMENTS_EXIST", httpStatus: res.status });
    }

    if (!res.ok || root.status === "error") {
        throw new RhTalentDeleteError(msg, { code: code || undefined, httpStatus: res.status });
    }

    return {
        message: str(root.message) || "Talent désactivé avec succès",
    };
}
