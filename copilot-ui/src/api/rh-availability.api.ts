/**
 * WF_RH Availability — GET /rh/availability/overview & GET /rh/talents/:id/availability
 */
import { RH_DASHBOARD_WEBHOOK_BASE } from "@/api/rh-dashboard.api";
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import { buildN8nUrl } from "@/lib/build-n8n-url";
import type {
    RhAvailabilityAssignment,
    RhAvailabilityOverviewResponse,
    RhAvailabilityProjectRef,
    RhAvailabilityRelease,
    RhAvailabilityStatus,
    RhTalentAvailabilityDetail,
    RhTalentAvailabilitySummary,
} from "@/types/rh-availability.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export const RH_AVAILABILITY_OVERVIEW_URL_PROD = `${RH_DASHBOARD_WEBHOOK_BASE}/rh/availability/overview`;

export type RhAvailabilityFetchOptions = ApiClientOptions & {
    apiBase?: string;
    token?: string | null;
    /** Résumés overview pour fallback si GET détail → 404. */
    overviewById?: Record<string, RhTalentAvailabilitySummary>;
};

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function normalizeStatus(v: unknown): RhAvailabilityStatus | null {
    const s = str(v).toLowerCase().replace(/-/g, "_");
    return s || null;
}

function parseProjectRef(row: unknown): RhAvailabilityProjectRef | null {
    const r = asRecord(row);
    const project_name = str(r.project_name ?? r.name ?? r.title);
    const project_id = str(r.project_id ?? r.id);
    if (!project_name && !project_id) return null;
    return {
        project_id: project_id || null,
        project_name: project_name || null,
        allocation_pct: r.allocation_pct != null ? num(r.allocation_pct ?? r.load_pct) : null,
        start_date: str(r.start_date) || null,
        end_date: str(r.end_date) || null,
        status: str(r.status) || null,
    };
}

function parseAssignment(row: unknown): RhAvailabilityAssignment | null {
    const r = asRecord(row);
    const project_name = str(r.project_name ?? r.name);
    const project_id = str(r.project_id ?? r.id);
    if (!project_name && !project_id && r.allocation_pct == null) return null;
    return {
        id: str(r.id ?? r.assignment_id) || null,
        project_id: project_id || null,
        project_name: project_name || null,
        role_on_project: str(r.role_on_project ?? r.role) || null,
        allocation_pct: r.allocation_pct != null ? num(r.allocation_pct ?? r.load_pct) : null,
        start_date: str(r.start_date) || null,
        end_date: str(r.end_date) || null,
        status: str(r.status) || null,
    };
}

function parseRelease(row: unknown): RhAvailabilityRelease | null {
    const r = asRecord(row);
    const project_name = str(r.project_name ?? r.name);
    if (!project_name && !str(r.project_id)) return null;
    return {
        project_id: str(r.project_id) || null,
        project_name: project_name || null,
        release_date: str(r.release_date ?? r.end_date ?? r.available_from) || null,
        freed_allocation_pct:
            r.freed_allocation_pct != null
                ? num(r.freed_allocation_pct ?? r.allocation_pct)
                : null,
    };
}

function parseArray<T>(raw: unknown, parser: (row: unknown) => T | null): T[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(parser).filter((x): x is T => x != null);
}

function parseOverviewItem(row: unknown): RhTalentAvailabilitySummary | null {
    const r = asRecord(row);
    const talent_id = str(r.talent_id ?? r.id ?? r.talentId);
    if (!talent_id) return null;
    return {
        talent_id,
        availability_status: normalizeStatus(r.availability_status ?? r.status ?? r.load_status),
        active_load_pct: num(r.active_load_pct ?? r.current_load_pct ?? r.load_pct),
        planned_load_pct: num(r.planned_load_pct ?? r.planned_pct),
        available_pct: num(r.available_pct ?? r.availability_pct),
        active_projects_count: num(
            r.active_projects_count ?? r.active_projects ?? r.projects_count,
            Array.isArray(r.active_projects) ? r.active_projects.length : 0,
        ),
    };
}

function parseOverviewResponse(raw: unknown): RhAvailabilityOverviewResponse {
    const root = unwrapN8nRoot(raw);
    const rows =
        root.talents ??
        root.items ??
        root.availability ??
        root.data ??
        (Array.isArray(raw) ? raw : []);
    const talents = parseArray(rows, parseOverviewItem);
    return {
        status: str(root.status) || undefined,
        talents,
        count: num(root.count, talents.length),
    };
}

function parseTalentDetail(raw: unknown, talentId: string): RhTalentAvailabilityDetail {
    const root = unwrapN8nRoot(raw);
    const r = asRecord(root.availability ?? root.talent ?? root.data ?? root);
    const tid = str(r.talent_id ?? r.id ?? talentId) || talentId;

    const active_projects = parseArray(
        r.active_projects ?? r.activeProjects,
        parseProjectRef,
    );
    const planned_projects = parseArray(
        r.planned_projects ?? r.plannedProjects,
        parseProjectRef,
    );

    return {
        talent_id: tid,
        availability_status: normalizeStatus(r.availability_status ?? r.status ?? r.load_status),
        active_load_pct: num(r.active_load_pct ?? r.current_load_pct ?? r.load_pct),
        planned_load_pct: num(r.planned_load_pct ?? r.planned_pct),
        total_committed_pct: num(
            r.total_committed_pct ?? r.committed_pct ?? r.total_load_pct,
        ),
        available_pct: num(r.available_pct ?? r.availability_pct),
        available_after_planned_pct: num(
            r.available_after_planned_pct ?? r.available_after_planned ?? r.future_available_pct,
        ),
        active_projects,
        planned_projects,
        current_assignments: parseArray(
            r.current_assignments ?? r.assignments ?? r.active_assignments,
            parseAssignment,
        ),
        upcoming_releases: parseArray(
            r.upcoming_releases ?? r.releases ?? r.future_releases,
            parseRelease,
        ),
        recommended_action: str(r.recommended_action ?? r.recommendation) || null,
    };
}

/** Détail minimal depuis une ligne overview (fallback 404 GET talent). */
export function availabilityDetailFromSummary(summary: RhTalentAvailabilitySummary): RhTalentAvailabilityDetail {
    return {
        talent_id: summary.talent_id,
        availability_status: summary.availability_status,
        active_load_pct: summary.active_load_pct,
        planned_load_pct: summary.planned_load_pct,
        total_committed_pct: summary.active_load_pct,
        available_pct: summary.available_pct,
        available_after_planned_pct: summary.available_pct,
        active_projects: [],
        planned_projects: [],
        current_assignments: [],
        upcoming_releases: [],
        recommended_action: null,
    };
}

export class RhAvailabilityApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus = 0) {
        super(message);
        this.name = "RhAvailabilityApiError";
        this.httpStatus = httpStatus;
    }
}

export function resolveRhAvailabilityWebhookRoot(): string {
    const fromEnv = (import.meta.env.VITE_RH_AVAILABILITY_WEBHOOK_BASE as string | undefined)?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, "");

    if (import.meta.env.DEV && String(import.meta.env.VITE_N8N_DIRECT_IN_DEV ?? "").trim() !== "1") {
        return "/webhook";
    }

    return RH_DASHBOARD_WEBHOOK_BASE.replace(/\/$/, "");
}

function rhAvailabilityWebhookPath(relativePath: string): string {
    const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
    const webhookPath = path.startsWith("/webhook/") ? path : `/webhook${path.startsWith("/") ? path : `/${path}`}`;
    return buildN8nUrl(webhookPath);
}

export function rhAvailabilityOverviewUrl(): string {
    const fromEnv = (import.meta.env.VITE_RH_AVAILABILITY_OVERVIEW_URL as string | undefined)?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, "");
    return rhAvailabilityWebhookPath("/rh/availability/overview");
}

export function rhTalentAvailabilityUrl(talentId: string): string {
    const fromEnv = (import.meta.env.VITE_RH_TALENT_AVAILABILITY_URL as string | undefined)?.trim();
    const id = encodeURIComponent(talentId.trim());
    if (fromEnv) {
        return fromEnv
            .replace("{id}", id)
            .replace(":id", id)
            .replace("{talentId}", id)
            .replace(":talentId", id);
    }
    return rhAvailabilityWebhookPath(`/rh/talents/${id}/availability`);
}

function userMessageForHttpStatus(status: number, msg: string): string {
    if (status === 401) return "Session expirée ou non autorisée — reconnectez-vous.";
    if (status === 404 || msg.toLowerCase().includes("not registered")) {
        return "Workflow disponibilité non publié sur n8n.";
    }
    return msg;
}

async function parseJsonOrThrow(res: Response, fallback: string): Promise<unknown> {
    let json: unknown = {};
    try {
        json = await res.json();
    } catch {
        json = {};
    }
    if (!res.ok) {
        const root = unwrapN8nRoot(json);
        const raw = str(root.message ?? root.error ?? root.detail) || fallback;
        throw new RhAvailabilityApiError(userMessageForHttpStatus(res.status, raw), res.status);
    }
    return json;
}

/** GET vue globale disponibilité — tous les talents. */
export async function fetchAvailabilityOverview(
    options?: RhAvailabilityFetchOptions,
): Promise<RhAvailabilityOverviewResponse> {
    const url = rhAvailabilityOverviewUrl();
    const res = await fetch(url, {
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });
    const json = await parseJsonOrThrow(res, "Impossible de charger la vue disponibilité");
    return parseOverviewResponse(json);
}

/** GET détail disponibilité d'un talent — fallback overview si 404. */
export async function fetchTalentAvailability(
    talentId: string,
    options?: RhAvailabilityFetchOptions,
): Promise<RhTalentAvailabilityDetail> {
    const id = talentId?.trim();
    if (!id) throw new RhAvailabilityApiError("Identifiant talent requis");

    const overviewRow = options?.overviewById?.[id];

    const url = rhTalentAvailabilityUrl(id);
    const res = await fetch(url, {
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });

    if (res.status === 404) {
        if (overviewRow) {
            return availabilityDetailFromSummary(overviewRow);
        }
        throw new RhAvailabilityApiError(
            "Disponibilité détaillée non exposée — utilisez la vue globale.",
            404,
        );
    }

    const json = await parseJsonOrThrow(res, "Impossible de charger la disponibilité du talent");
    return parseTalentDetail(json, id);
}

export function indexAvailabilityOverview(
    overview: RhAvailabilityOverviewResponse | null | undefined,
): Record<string, RhTalentAvailabilitySummary> {
    const map: Record<string, RhTalentAvailabilitySummary> = {};
    for (const row of overview?.talents ?? []) {
        if (row?.talent_id) map[row.talent_id] = row;
    }
    return map;
}

export function mapRhAvailabilityError(err: unknown): string {
    if (err instanceof RhAvailabilityApiError) return err.message;
    if (err instanceof Error) return err.message;
    return "Disponibilité indisponible";
}
