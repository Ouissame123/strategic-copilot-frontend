/**
 * WF_RH_Analytics — GET `{apiBase}/rh/analytics`
 * WF_RH_Notifications — GET `{apiBase}/rh/notifications`
 */
import { ApiError } from "@/api/errors";
import { authStorage } from "@/lib/auth-storage";
import type { RhAnalytics, RhAnalyticsAlert, RhLoadTalent, RhNotificationsResponse, RhTopSkill } from "@/types/rh-dashboard.types";
import { rowsFromRhPayload } from "@/utils/rh-api-parse";
import type { ApiClientOptions } from "@/utils/apiClient";
import { asRecord, firstScalar, unwrapDataPayload, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

/** Base + URLs WF_RH_* utilisées par `DashboardRH`. */
export const RH_DASHBOARD_WEBHOOK_BASE = "https://n8nprod.aphelionxinnovations.com/webhook";
export const RH_DASHBOARD_ANALYTICS_URL = `${RH_DASHBOARD_WEBHOOK_BASE}/rh/analytics`;
export const RH_DASHBOARD_NOTIFICATIONS_URL = `${RH_DASHBOARD_WEBHOOK_BASE}/rh/notifications?limit=50`;

/** @deprecated Utiliser `RH_DASHBOARD_WEBHOOK_BASE`. */
export const DEFAULT_RH_WEBHOOK_BASE = RH_DASHBOARD_WEBHOOK_BASE;

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function recordNumbers(raw: unknown): Record<string, number> {
    const o = asRecord(raw);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(o)) {
        out[k] = num(v);
    }
    return out;
}

/** Colonnes Postgres `json` / `json_agg` parfois renvoyées en chaîne. */
function parseJsonValue<T>(raw: unknown): T | null {
    if (raw == null) return null;
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }
    return raw as T;
}

function parseJsonArray(raw: unknown): unknown[] {
    const parsed = parseJsonValue<unknown[]>(raw);
    return Array.isArray(parsed) ? parsed : [];
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

/** Objet `{ "IT": 3 }` ou tableau `[{ department, count }]`. */
function parseDistributionMap(raw: unknown): Record<string, number> {
    const fromRecord = recordNumbers(parseJsonValue<Record<string, unknown>>(raw) ?? raw);
    if (Object.keys(fromRecord).length) return fromRecord;

    const out: Record<string, number> = {};
    for (const row of parseJsonArray(raw)) {
        const r = asRecord(row);
        const label = str(r.department ?? r.dept ?? r.seniority ?? r.seniority_level ?? r.label ?? r.name ?? r.key);
        const count = num(r.count ?? r.value ?? r.total ?? r.n);
        if (label) out[label] = (out[label] ?? 0) + (count || 1);
    }
    return out;
}

function aggregateFromLoadTalents(
    talents: RhLoadTalent[],
    field: "department" | "seniority",
): Record<string, number> {
    const out: Record<string, number> = {};
    for (const t of talents) {
        const label = field === "department" ? t.department?.trim() : t.seniority?.trim();
        if (label) out[label] = (out[label] ?? 0) + 1;
    }
    return out;
}

function parseTopSkillsField(raw: unknown): RhTopSkill[] {
    const rows = parseJsonArray(raw);
    if (rows.length) {
        return rows.map(parseTopSkill).filter((x): x is RhTopSkill => x != null);
    }
    if (Array.isArray(raw)) {
        return raw.map(parseTopSkill).filter((x): x is RhTopSkill => x != null);
    }
    return [];
}

function getRhBearerToken(token?: string | null): string | null {
    return token?.trim() || authStorage.getAccessToken()?.trim() || null;
}

function extractErrorMessage(err: unknown): string {
    if (err instanceof ApiError) {
        const p = asRecord(err.payload);
        const fromPayload = String(p.message ?? p.error ?? p.detail ?? "").trim();
        if (fromPayload) return fromPayload;
        return err.message;
    }
    if (err instanceof Error) return err.message;
    return "Erreur inconnue";
}

function parseLoadTalent(row: unknown): RhLoadTalent | null {
    const r = asRecord(row);
    const name = String(r.name ?? r.talent_name ?? "").trim();
    if (!name) return null;
    return {
        name,
        load_pct: num(r.load_pct ?? r.loadPct, NaN) || undefined,
        available_pct: num(r.available_pct ?? r.availablePct, NaN) || undefined,
        department: r.department != null ? String(r.department) : null,
        seniority: str(r.seniority ?? r.seniority_level) || null,
    };
}

function parseTopSkill(row: unknown): RhTopSkill | null {
    const r = asRecord(row);
    const skill_name = String(r.skill_name ?? r.name ?? "").trim();
    if (!skill_name) return null;
    return {
        skill_name,
        skill_category: r.skill_category != null ? String(r.skill_category) : undefined,
        talent_count: num(r.talent_count),
        avg_level: num(r.avg_level),
        max_level: num(r.max_level, 5),
        projects_with_gap: num(r.projects_with_gap, 0),
    };
}

function parseAlert(row: unknown): RhAnalyticsAlert | null {
    const r = asRecord(row);
    const message = String(r.message ?? r.title ?? "").trim();
    if (!message) return null;
    const levelRaw = String(r.level ?? r.severity ?? "info").toLowerCase();
    const level =
        levelRaw === "critical" || levelRaw === "high" || levelRaw === "medium" || levelRaw === "info"
            ? levelRaw
            : "info";
    return {
        level,
        message,
        action: r.action != null ? String(r.action) : undefined,
    };
}

/** Normalise la réponse GET analytics RH. */
export function normalizeRhAnalytics(raw: unknown): RhAnalytics | null {
    if (raw == null) return null;
    const block = unwrapN8nRoot(raw);
    const kpisRaw = asRecord(block.kpis ?? block.KPIs);
    const hasScalarKpi =
        firstScalar(block, ["total_employees", "employees_count", "talents_count", "active_projects"]) != null;
    if (!Object.keys(kpisRaw).length && block.rh_score == null && !hasScalarKpi) return null;

    const talentsRaw = asRecord(kpisRaw.talents);
    const loadRaw = asRecord(kpisRaw.load);
    const skillsRaw = asRecord(kpisRaw.skills);
    const projectsRaw = asRecord(kpisRaw.projects);

    const mostLoaded = parseJsonArray(loadRaw.most_loaded)
        .map(parseLoadTalent)
        .filter((x): x is RhLoadTalent => x != null);
    const mostAvailable = parseJsonArray(loadRaw.most_available)
        .map(parseLoadTalent)
        .filter((x): x is RhLoadTalent => x != null);

    let topSkills = parseTopSkillsField(
        skillsRaw.top_skills ?? skillsRaw.topSkills ?? block.top_skills ?? block.skills_distribution,
    );
    if (!topSkills.length) {
        topSkills = parseTopSkillsField(skillsRaw.distribution ?? skillsRaw.by_skill);
    }

    const allLoadTalents = [...mostLoaded, ...mostAvailable];

    let by_department = parseDistributionMap(
        talentsRaw.by_department ?? talentsRaw.byDepartment ?? block.by_department,
    );
    if (!Object.keys(by_department).length) {
        by_department = aggregateFromLoadTalents(allLoadTalents, "department");
    }

    let by_seniority = parseDistributionMap(
        talentsRaw.by_seniority ?? talentsRaw.bySeniority ?? block.by_seniority,
    );
    if (!Object.keys(by_seniority).length) {
        by_seniority = aggregateFromLoadTalents(allLoadTalents, "seniority");
    }

    const totalUnique =
        num(skillsRaw.total_unique_skills) || (topSkills.length ? topSkills.length : 0);

    const alerts = Array.isArray(block.alerts)
        ? block.alerts.map(parseAlert).filter((x): x is RhAnalyticsAlert => x != null)
        : [];

    return {
        rh_score: num(block.rh_score),
        kpis: {
            talents: {
                total: num(talentsRaw.total),
                active: num(talentsRaw.active),
                inactive: num(talentsRaw.inactive),
                on_leave: num(talentsRaw.on_leave ?? talentsRaw.onLeave),
                by_department,
                by_seniority,
            },
            load: {
                avg_load_pct: num(loadRaw.avg_load_pct),
                avg_available_pct: num(loadRaw.avg_available_pct),
                unassigned: num(loadRaw.unassigned),
                light_load: num(loadRaw.light_load),
                heavy_load: num(loadRaw.heavy_load),
                overloaded: num(loadRaw.overloaded),
                most_loaded: mostLoaded,
                most_available: mostAvailable,
            },
            skills: {
                total_unique_skills: totalUnique,
                top_skills: topSkills,
                by_category: {},
                skills_with_gaps: num(skillsRaw.skills_with_gaps),
            },
            projects: {
                active_projects: num(projectsRaw.active_projects),
                talents_assigned: num(projectsRaw.talents_assigned),
                avg_progress_pct: num(projectsRaw.avg_progress_pct),
                projects_without_team: num(projectsRaw.projects_without_team),
                assignments_ending_soon: num(projectsRaw.assignments_ending_soon),
                critical_rh_alerts: num(projectsRaw.critical_rh_alerts),
            },
        },
        alerts,
    };
}

/**
 * Base des appels WF_RH_*.
 * En **dev** : toujours `/webhook` (proxy Vite → n8n) — jamais d’URL absolue (évite CORS).
 */
export function resolveRhWebhookBase(apiBase?: string): string {
    if (import.meta.env.DEV) {
        const override = apiBase?.trim().replace(/\/$/, "");
        if (override && !/^https?:\/\//i.test(override)) {
            return override.startsWith("/") ? override : `/${override}`;
        }
        return "/webhook";
    }

    const override = apiBase?.trim().replace(/\/$/, "");
    if (override) return override;
    const fromEnv = (import.meta.env.VITE_RH_DASHBOARD_API_BASE as string | undefined)?.trim().replace(/\/$/, "");
    if (fromEnv) return fromEnv;
    return DEFAULT_RH_WEBHOOK_BASE;
}

/** GET agrégat dashboard legacy → analytics minimal (autres pages RH). */
export function mapLegacyDashboardToRhAnalytics(raw: unknown): RhAnalytics | null {
    const summary = unwrapN8nRoot(raw);
    const totalEmployees = num(
        firstScalar(summary, ["total_employees", "employees_count", "total_staff", "talents_count"]),
    );
    if (totalEmployees === 0 && !firstScalar(summary, ["rh_score", "score"])) {
        return null;
    }

    const alertRows = rowsFromRhPayload(raw);
    const alerts = alertRows
        .map((row) => parseAlert(row))
        .filter((x): x is RhAnalyticsAlert => x != null);

    return {
        rh_score: num(firstScalar(summary, ["rh_score", "score", "health_score"]), 65),
        kpis: {
            talents: {
                total: totalEmployees,
                active: num(firstScalar(summary, ["active_employees", "active_count"]), totalEmployees),
                inactive: num(firstScalar(summary, ["inactive_employees"])),
                on_leave: num(firstScalar(summary, ["on_leave", "on_leave_count"])),
                by_department: recordNumbers(summary.by_department),
                by_seniority: recordNumbers(summary.by_seniority),
            },
            load: {
                avg_load_pct: num(firstScalar(summary, ["avg_load_pct", "capacity_load_pct"])),
                avg_available_pct: num(firstScalar(summary, ["avg_available_pct", "available_pct"])),
                unassigned: num(firstScalar(summary, ["unassigned"])),
                light_load: num(firstScalar(summary, ["light_load"])),
                heavy_load: num(firstScalar(summary, ["heavy_load"])),
                overloaded: num(firstScalar(summary, ["overloaded", "overloaded_count"])),
                most_loaded: [],
                most_available: [],
            },
            skills: {
                total_unique_skills: num(firstScalar(summary, ["total_unique_skills", "skills_count"])),
                top_skills: [],
                by_category: {},
                skills_with_gaps: num(firstScalar(summary, ["skills_with_gaps", "critical_gaps"])),
            },
            projects: {
                active_projects: num(firstScalar(summary, ["active_projects", "projects_count"])),
                talents_assigned: num(firstScalar(summary, ["talents_assigned"])),
                avg_progress_pct: num(firstScalar(summary, ["avg_progress_pct"])),
                projects_without_team: num(firstScalar(summary, ["projects_without_team"])),
                assignments_ending_soon: num(firstScalar(summary, ["assignments_ending_soon"])),
                critical_rh_alerts: num(firstScalar(summary, ["critical_rh_alerts", "pending_requests"])),
            },
        },
        alerts,
    };
}

function buildRhAuthHeaders(token?: string | null): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };
    const t = getRhBearerToken(token);
    if (t) headers.Authorization = `Bearer ${t}`;
    return headers;
}

const RH_WORKFLOW_ERROR_MESSAGES: Record<string, string> = {
    MISSING_BEARER: "Authentification requise (Bearer JWT manquant).",
    INVALID_TOKEN: "Session invalide — reconnectez-vous.",
    TOKEN_EXPIRED: "Session expirée — reconnectez-vous.",
    FORBIDDEN: "Accès réservé au rôle RH ou admin.",
    NO_ENTERPRISE: "JWT sans enterprise_id (requis par WF_RH_Analytics).",
};

function messageFromRhWorkflowBody(raw: unknown, fallback: string): string {
    const root = unwrapN8nRoot(raw);
    const code = String(root.code ?? root.__code ?? "").trim();
    if (code && RH_WORKFLOW_ERROR_MESSAGES[code]) {
        return RH_WORKFLOW_ERROR_MESSAGES[code];
    }
    const msg = String(root.message ?? root.error ?? root.detail ?? "").trim();
    return msg || fallback;
}

/** Message court pour l’UI (évite la concaténation de toutes les URLs en échec). */
export function toRhDashboardUserMessage(err: unknown): string {
    const raw = extractErrorMessage(err);
    const lower = raw.toLowerCase();
    if (lower.includes("not registered")) {
        return "Webhook RH non activé sur n8n — publiez WF_RH_Analytics / WF_RH_Notifications en mode production.";
    }
    if (lower.includes("workflow execution failed")) {
        return "Échec du workflow n8n (WF_RH_Analytics). Consultez les exécutions sur n8nprod.";
    }
    if (raw.length > 280) return `${raw.slice(0, 280)}…`;
    return raw;
}

function parseAnalyticsResponse(raw: unknown): RhAnalytics {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error" || root.success === false) {
        throw new Error(messageFromRhWorkflowBody(raw, "Erreur Analytics RH"));
    }
    const normalized = normalizeRhAnalytics(raw);
    if (normalized) return normalized;
    throw new Error(messageFromRhWorkflowBody(raw, "Réponse analytics RH invalide ou vide"));
}

export type RhNotificationsQueryParams = {
    limit?: number;
    offset?: number;
    only_unread?: boolean;
    type?: string;
    severity?: string;
};

function buildRhNotificationsQuery(params?: RhNotificationsQueryParams): string {
    const limit = Math.min(Math.max(params?.limit ?? 50, 1), 200);
    const q = new URLSearchParams({ limit: String(limit) });
    if (params?.offset != null && params.offset > 0) {
        q.set("offset", String(params.offset));
    }
    if (params?.only_unread) {
        q.set("only_unread", "true");
    }
    if (params?.type?.trim()) {
        q.set("type", params.type.trim());
    }
    if (params?.severity?.trim()) {
        q.set("severity", params.severity.trim());
    }
    return q.toString();
}

function messageFromRhNotificationsBody(raw: unknown, fallback: string): string {
    const root = unwrapN8nRoot(raw);
    if (root.success === false) {
        const err = String(root.error ?? root.message ?? "").trim();
        if (err) return err;
    }
    return messageFromRhWorkflowBody(raw, fallback);
}

/** Normalise la réponse GET WF_RH_Notifications (`success`, `summary`, `notifications`). */
export function normalizeRhNotifications(raw: unknown): RhNotificationsResponse | null {
    if (raw == null) return null;
    const root = unwrapN8nRoot(raw);
    if (root.success === false) return null;
    const block = Array.isArray(root.notifications) ? root : unwrapN8nRoot(unwrapDataPayload(raw));
    const summaryRaw = asRecord(block.summary);
    const list = Array.isArray(block.notifications) ? block.notifications : [];

    const notifications = list
        .map((row) => {
            const r = asRecord(row);
            const id = String(r.id ?? "").trim();
            const title = String(r.title ?? "").trim();
            if (!id || !title) return null;
            const sev = String(r.severity ?? "medium").toLowerCase();
            const severity =
                sev === "critical" || sev === "high" || sev === "low" || sev === "medium"
                    ? sev
                    : "medium";
            const entityType = r.entity_type != null ? String(r.entity_type).toLowerCase() : "";
            const entityId = r.entity_id != null ? String(r.entity_id).trim() : "";
            const projectIdRaw = str(r.project_id ?? r.projectId);
            const talentIdRaw = str(r.talent_id ?? r.talentId);
            const project_id =
                projectIdRaw ||
                (entityType === "project" && entityId ? entityId : "") ||
                null;
            const talent_id =
                talentIdRaw ||
                (entityType === "talent" && entityId ? entityId : "") ||
                null;

            return {
                id,
                type: String(r.type ?? ""),
                title,
                message: r.message != null ? String(r.message) : undefined,
                severity,
                entity_type: entityType || undefined,
                entity_id: entityId || undefined,
                project_id: project_id || null,
                talent_id: talent_id || null,
                is_read: Boolean(r.is_read),
                created_at: String(r.created_at ?? r.createdAt ?? new Date().toISOString()),
            };
        })
        .filter((n): n is NonNullable<typeof n> => n != null);

    return {
        summary: {
            unread_count: num(summaryRaw.unread_count),
            critical_unread: num(summaryRaw.critical_unread),
            high_unread: num(summaryRaw.high_unread),
            by_type: recordNumbers(summaryRaw.by_type),
        },
        notifications,
        count: num(block.count, notifications.length),
    };
}

export type RhDashboardFetchOptions = ApiClientOptions & {
    apiBase?: string;
    token?: string | null;
    /** Dashboard : ne pas bloquer si notifications indisponibles. */
    softFail?: boolean;
};

function parseNotificationsResponse(raw: unknown): RhNotificationsResponse {
    const root = unwrapN8nRoot(raw);
    if (root.success === false) {
        throw new Error(messageFromRhNotificationsBody(raw, "Notifications RH indisponibles"));
    }
    const normalized = normalizeRhNotifications(raw);
    if (normalized) return normalized;
    throw new Error(messageFromRhNotificationsBody(raw, "Réponse notifications RH invalide"));
}

/**
 * GET `{apiBase}/rh/analytics` — WF_RH_Analytics.
 * Périmètre entreprise : `enterprise_id` dans le JWT (paramètre ignoré par n8n si présent).
 */
export async function fetchRhAnalytics(
    _enterpriseId: string,
    options?: RhDashboardFetchOptions,
): Promise<RhAnalytics> {
    const base = resolveRhWebhookBase(options?.apiBase);
    const url = `${base}/rh/analytics`;
    if (import.meta.env.DEV) {
        console.log("[RH API] GET analytics (JWT)", url);
    }

    const res = await fetch(url, {
        headers: buildRhAuthHeaders(options?.token),
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
        throw new Error(messageFromRhWorkflowBody(json, `Analytics : HTTP ${res.status}`));
    }

    return parseAnalyticsResponse(json);
}

/**
 * GET `{apiBase}/rh/notifications` — WF_RH_Notifications (JWT, query : limit, offset, only_unread, type, severity).
 */
export async function fetchRhNotifications(
    params?: RhNotificationsQueryParams,
    options?: RhDashboardFetchOptions,
): Promise<RhNotificationsResponse | null> {
    const base = resolveRhWebhookBase(options?.apiBase);
    const url = `${base}/rh/notifications?${buildRhNotificationsQuery(params)}`;
    const softFail = options?.softFail ?? false;

    if (import.meta.env.DEV) {
        console.log("[RH API] GET notifications (JWT)", url);
    }

    let headers: Record<string, string>;
    try {
        headers = buildRhAuthHeaders(options?.token);
    } catch (err) {
        if (softFail) {
            if (import.meta.env.DEV) console.warn("[RH API] notifications auth", err);
            return null;
        }
        throw err;
    }

    try {
        const res = await fetch(url, {
            headers,
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
            const msg = messageFromRhNotificationsBody(json, `Notifications : HTTP ${res.status}`);
            if (softFail) {
                if (import.meta.env.DEV) console.warn("[RH API]", msg);
                return null;
            }
            throw new Error(msg);
        }
        return parseNotificationsResponse(json);
    } catch (err) {
        if (softFail) {
            if (import.meta.env.DEV) {
                console.warn("[RH API] notifications", err);
            }
            return null;
        }
        throw err;
    }
}

/** DELETE `{apiBase}/rh/notifications/:id` — marque comme lue (soft delete n8n). */
export async function deleteRhNotification(
    notificationId: string,
    options?: RhDashboardFetchOptions,
): Promise<{ success: boolean; message: string }> {
    const base = resolveRhWebhookBase(options?.apiBase);
    const id = encodeURIComponent(notificationId.trim());
    const url = `${base}/rh/notifications/${id}`;

    const res = await fetch(url, {
        method: "DELETE",
        headers: buildRhAuthHeaders(options?.token),
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
        throw new Error(messageFromRhNotificationsBody(json, `Suppression notification : HTTP ${res.status}`));
    }

    const root = unwrapN8nRoot(json);
    if (root.success === false) {
        throw new Error(messageFromRhNotificationsBody(json, "Suppression notification refusée"));
    }

    return {
        success: true,
        message: String(root.message ?? "Notification marquée comme lue"),
    };
}

export type RhNotificationsTriggerResult = {
    success: boolean;
    message: string;
    triggered_at?: string;
    created?: {
        urgent_requests: number;
        talents_at_risk: number;
        contracts_ending: number;
        skill_gaps: number;
        budget_overruns: number;
        total: number;
    };
};

/** POST `{apiBase}/rh/notifications/trigger` — scan sources et création de notifications. */
export async function triggerRhNotificationsScan(
    options?: RhDashboardFetchOptions,
): Promise<RhNotificationsTriggerResult> {
    const base = resolveRhWebhookBase(options?.apiBase);
    const url = `${base}/rh/notifications/trigger`;

    const res = await fetch(url, {
        method: "POST",
        headers: buildRhAuthHeaders(options?.token),
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
        throw new Error(messageFromRhNotificationsBody(json, `Trigger notifications : HTTP ${res.status}`));
    }

    const root = unwrapN8nRoot(json);
    if (root.success === false) {
        throw new Error(messageFromRhNotificationsBody(json, "Trigger notifications refusé"));
    }

    const createdRaw = asRecord(root.created);
    return {
        success: true,
        message: String(root.message ?? "Scan terminé"),
        triggered_at: root.triggered_at != null ? String(root.triggered_at) : undefined,
        created: {
            urgent_requests: num(createdRaw.urgent_requests),
            talents_at_risk: num(createdRaw.talents_at_risk),
            contracts_ending: num(createdRaw.contracts_ending),
            skill_gaps: num(createdRaw.skill_gaps),
            budget_overruns: num(createdRaw.budget_overruns),
            total: num(createdRaw.total),
        },
    };
}

/** @deprecated Utiliser `fetchRhAnalytics`. */
export async function fetchRhAnalyticsWithMeta(
    enterpriseId: string,
    options?: RhDashboardFetchOptions,
): Promise<{ data: RhAnalytics; source: "analytics" }> {
    const data = await fetchRhAnalytics(enterpriseId, options);
    return { data, source: "analytics" };
}
