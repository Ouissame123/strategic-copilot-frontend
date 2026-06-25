/**
 * WF_RH_Accounts_Audit_View — 3 endpoints :
 *   GET `${API_BASE}/webhook/rh/accounts/stats`
 *   GET `${API_BASE}/webhook/rh/accounts/orphaned`
 *   GET `${API_BASE}/webhook/rh/accounts/audit`
 */
import { isAxiosError } from "axios";
import { ApiError } from "@/api/errors";
import { rhAccountsAuditPath, rhAccountsOrphanedPath, rhAccountsStatsPath } from "@/lib/api-config";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";
import type {
    AccountsStatsResponse,
    AuditEvent,
    AuditEventType,
    AuditListFilters,
    AuditListResponse,
    OrphanedIssue,
    OrphanedItem,
    OrphanedResponse,
} from "@/types/rh-accounts-audit.types";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const AXIOS_OPTS: HttpClientRequestConfig = { skipGlobalHttpErrorToast: true };

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function parseOrphanedIssue(raw: unknown): OrphanedIssue {
    return str(raw) === "account_without_talent" ? "account_without_talent" : "talent_without_account";
}

function parseAuditEventType(raw: unknown): AuditEventType {
    const s = str(raw).toLowerCase();
    if (s === "created" || s === "updated" || s === "disabled" || s === "deactivated") return s;
    return "updated";
}

function parseOrphanedItem(raw: unknown): OrphanedItem | null {
    const r = asRecord(raw);
    const talent_id = str(r.talent_id ?? r.id);
    const name = str(r.name);
    const email = str(r.email);
    if (!talent_id || !name || !email) return null;

    return {
        talent_id,
        name,
        email,
        job_title: str(r.job_title ?? r.jobTitle) || null,
        status: str(r.status) || "active",
        created_at: str(r.created_at ?? r.createdAt),
        issue: parseOrphanedIssue(r.issue),
    };
}

function parseAuditEvent(raw: unknown): AuditEvent | null {
    const r = asRecord(raw);
    const entity_id = str(r.entity_id ?? r.entityId ?? r.id);
    const name = str(r.name);
    const email = str(r.email);
    if (!entity_id || !name) return null;

    const entityTypeRaw = str(r.entity_type ?? r.entityType).toLowerCase();

    return {
        entity_type: entityTypeRaw === "talent" ? "talent" : "user",
        entity_id,
        name,
        email,
        role: str(r.role) || null,
        status: str(r.status) || "active",
        event_type: parseAuditEventType(r.event_type ?? r.eventType),
        created_at: str(r.created_at ?? r.createdAt),
        updated_at: str(r.updated_at ?? r.updatedAt) || str(r.created_at),
    };
}

function normalizeStatsResponse(raw: unknown): AccountsStatsResponse {
    const root = unwrapN8nRoot(raw);
    const statsRaw = asRecord(root.stats);
    const usersRaw = asRecord(statsRaw.users);
    const talentsRaw = asRecord(statsRaw.talents);
    const activityRaw = asRecord(statsRaw.activity_7d ?? statsRaw.activity7d);

    return {
        status: "success",
        workflow: str(root.workflow) || undefined,
        operation: "stats",
        enterprise_id: str(root.enterprise_id),
        stats: {
            users: {
                managers_active: num(usersRaw.managers_active),
                rh_active: num(usersRaw.rh_active),
                talent_accounts_active: num(usersRaw.talent_accounts_active),
                disabled: num(usersRaw.disabled),
                total_active: num(usersRaw.total_active),
            },
            talents: {
                active: num(talentsRaw.active),
                inactive: num(talentsRaw.inactive),
                with_portal: num(talentsRaw.with_portal),
                without_portal: num(talentsRaw.without_portal),
                without_manager: num(talentsRaw.without_manager),
                portal_coverage_pct: num(talentsRaw.portal_coverage_pct),
            },
            activity_7d: {
                users_created: num(activityRaw.users_created),
                talents_created: num(activityRaw.talents_created),
            },
        },
        meta: asRecord(root.meta) as AccountsStatsResponse["meta"],
    };
}

function normalizeOrphanedResponse(raw: unknown): OrphanedResponse {
    const root = unwrapN8nRoot(raw);
    const listRaw = Array.isArray(root.items) ? root.items : [];
    const items = listRaw.map(parseOrphanedItem).filter((i): i is OrphanedItem => i != null);
    const summaryRaw = asRecord(root.summary);

    return {
        status: "success",
        workflow: str(root.workflow) || undefined,
        operation: "orphaned",
        enterprise_id: str(root.enterprise_id),
        count: num(root.count, items.length),
        summary: {
            talents_without_account: num(summaryRaw.talents_without_account),
            accounts_without_talent: num(summaryRaw.accounts_without_talent),
            total_orphaned: num(summaryRaw.total_orphaned, items.length),
        },
        items,
    };
}

function normalizeAuditResponse(raw: unknown): AuditListResponse {
    const root = unwrapN8nRoot(raw);
    const listRaw = Array.isArray(root.items)
        ? root.items
        : Array.isArray(root.events)
          ? root.events
          : [];
    const items = listRaw.map(parseAuditEvent).filter((e): e is AuditEvent => e != null);
    const filtersRaw = asRecord(root.filters_applied ?? root.filters);

    return {
        status: "success",
        workflow: str(root.workflow) || undefined,
        operation: "audit",
        enterprise_id: str(root.enterprise_id),
        filters_applied: {
            since_days: num(filtersRaw.since_days, 30),
            limit: num(filtersRaw.limit, 100),
            offset: num(filtersRaw.offset, 0),
            search: str(filtersRaw.search) || null,
        },
        count: num(root.count, items.length),
        items,
        events: items,
        meta: asRecord(root.meta) as AuditListResponse["meta"],
    };
}

function throwApiError(err: unknown, fallback: string): never {
    if (isAxiosError(err)) {
        const data = err.response?.data;
        const root = data != null ? unwrapN8nRoot(data) : {};
        throw new ApiError(str(root.message) || fallback, err.response?.status, data);
    }
    throw err instanceof ApiError ? err : new ApiError(fallback);
}

export async function getAccountsStats(): Promise<AccountsStatsResponse> {
    try {
        const { data } = await httpClient.get<unknown>(rhAccountsStatsPath(), AXIOS_OPTS);
        return normalizeStatsResponse(data);
    } catch (err) {
        throwApiError(err, "Impossible de charger les statistiques comptes.");
    }
}

export async function getOrphanedAccounts(limit = 100): Promise<OrphanedResponse> {
    try {
        const { data } = await httpClient.get<unknown>(rhAccountsOrphanedPath(), {
            params: { limit },
            ...AXIOS_OPTS,
        });
        return normalizeOrphanedResponse(data);
    } catch (err) {
        throwApiError(err, "Impossible de charger les anomalies.");
    }
}

export async function getAccountsAudit(filters: AuditListFilters = {}): Promise<AuditListResponse> {
    const params: Record<string, string | number> = {};
    if (filters.since_days != null) params.since_days = filters.since_days;
    if (filters.limit != null) params.limit = filters.limit;
    if (filters.offset != null) params.offset = filters.offset;
    if (filters.search?.trim()) params.search = filters.search.trim();

    try {
        const { data } = await httpClient.get<unknown>(rhAccountsAuditPath(), { params, ...AXIOS_OPTS });
        return normalizeAuditResponse(data);
    } catch (err) {
        throwApiError(err, "Impossible de charger l'audit.");
    }
}
