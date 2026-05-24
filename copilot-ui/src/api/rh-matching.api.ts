/**
 * WF_RH_Matching_Run — POST `/webhook/rh/matching`, GET `/webhook/rh/matching/results` (production).
 */
import {
    RH_MATCHING_PROJECTS_URL_DEV,
    RH_MATCHING_PROJECTS_URL_PRODUCTION,
    RH_MATCHING_RESULTS_URL_DEV,
    RH_MATCHING_RESULTS_URL_PRODUCTION,
    RH_MATCHING_RUN_URL_DEV,
    RH_MATCHING_RUN_URL_PRODUCTION,
} from "@/api/rh-matching.constants";
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import type {
    RhMatchingRunPayload,
    RhMatchingRunResponse,
    RhMatchingSummary,
    RhMatchingTopMatch,
    RhProjectOption,
} from "@/types/rh-matching.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export type RhMatchingFetchOptions = ApiClientOptions & {
    token?: string | null;
};

const DEFAULT_TOP_N = 10;
const DEFAULT_MIN_AVAILABILITY_PCT = 20;
const MATCHING_TIMEOUT_MS = 120_000;

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function messageFromBody(raw: unknown, fallback: string): string {
    const root = unwrapN8nRoot(raw);
    return str(root.message ?? root.error ?? root.detail) || fallback;
}

export class RhMatchingApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, options?: { httpStatus?: number }) {
        super(message);
        this.name = "RhMatchingApiError";
        this.httpStatus = options?.httpStatus ?? 0;
    }
}

export function mapRhMatchingApiError(err: unknown): string {
    if (err instanceof RhMatchingApiError) return err.message;
    return err instanceof Error ? err.message : "Erreur matching workforce";
}

/** Remplace /webhook-test/ par /webhook/ (workflow passé en production). */
function sanitizeMatchingUrl(url: string): string {
    const trimmed = url.trim().replace(/\/$/, "");
    if (!trimmed.includes("/webhook-test/")) return trimmed;
    const fixed = trimmed.replace(/\/webhook-test\//g, "/webhook/");
    console.warn("[RH Matching] URL corrigée : /webhook-test/ → /webhook/ (production).");
    return fixed;
}

function resolveMatchingRunUrl(): string {
    const fromEnv = (import.meta.env.VITE_RH_MATCHING_RUN_URL as string | undefined)?.trim();
    const fallback = import.meta.env.PROD ? RH_MATCHING_RUN_URL_PRODUCTION : RH_MATCHING_RUN_URL_DEV;
    return sanitizeMatchingUrl(fromEnv || fallback);
}

function resolveMatchingResultsTemplate(): string {
    const fromEnv = (import.meta.env.VITE_RH_MATCHING_RESULTS_URL as string | undefined)?.trim();
    const fallback = import.meta.env.PROD
        ? RH_MATCHING_RESULTS_URL_PRODUCTION
        : RH_MATCHING_RESULTS_URL_DEV;
    return sanitizeMatchingUrl(fromEnv || fallback);
}

function resolveMatchingProjectsUrl(): string {
    const fromEnv = (import.meta.env.VITE_RH_MATCHING_PROJECTS_URL as string | undefined)?.trim();
    const fallback = import.meta.env.PROD
        ? RH_MATCHING_PROJECTS_URL_PRODUCTION
        : RH_MATCHING_PROJECTS_URL_DEV;
    return sanitizeMatchingUrl(fromEnv || fallback);
}

function mapMatchingProjectRow(row: unknown): RhProjectOption | null {
    const r = asRecord(row);
    const id = str(r.id ?? r.project_id);
    const name = str(r.name ?? r.project_name);
    if (!id || !name) return null;
    return { id, name };
}

function buildRhMatchingAuthHeaders(token?: string | null): HeadersInit {
    return {
        ...buildRhTalentsAuthHeaders(token),
        Accept: "application/json",
    };
}

function matchingRunUrl(): string {
    return resolveMatchingRunUrl();
}

function matchingResultsUrl(projectId: string): string {
    const base = resolveMatchingResultsTemplate();
    if (base.includes("{project_id}") || base.includes("{id}")) {
        return base.replace(/\{project_id\}|\{id\}/gi, encodeURIComponent(projectId));
    }
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}project_id=${encodeURIComponent(projectId)}`;
}

function parseTopMatch(row: unknown): RhMatchingTopMatch | null {
    const r = asRecord(row);
    const talent_id = str(r.talent_id ?? r.id);
    const talent_name = str(r.talent_name ?? r.name);
    if (!talent_id && !talent_name) return null;
    return {
        talent_id: talent_id || talent_name,
        talent_name: talent_name || "—",
        email: str(r.email) || null,
        job_title: str(r.job_title ?? r.role) || null,
        overall_score: num(r.overall_score, 0),
        skill_fit_score: num(r.skill_fit_score, 0),
        skill_level_score: num(r.skill_level_score, 0),
        availability_score: num(r.availability_score, 0),
        recommendation_type: str(r.recommendation_type) || "potential",
        available_pct: num(r.available_pct, 0),
        current_load_pct: num(r.current_load_pct, 0),
        matched_skills_count: num(r.matched_skills_count, 0),
        gap_count: num(r.gap_count, 0),
        skills: Array.isArray(r.skills) ? r.skills : [],
        match_summary: str(r.match_summary) || null,
    };
}

function parseSummary(raw: unknown, topMatches: RhMatchingTopMatch[]): RhMatchingSummary {
    const r = asRecord(raw);
    const top = topMatches[0];
    return {
        ...r,
        candidates_evaluated: num(
            r.candidates_evaluated ?? r.talents_evaluated ?? r.evaluated_count,
            topMatches.length,
        ),
        recommendations_count: num(
            r.recommendations_count ?? r.recommended_count,
            topMatches.filter((m) => m.recommendation_type === "recommended").length,
        ),
        top_candidate_name: str(r.top_candidate_name ?? r.top_candidate) || top?.talent_name || null,
        execution_time_ms:
            r.execution_time_ms != null
                ? num(r.execution_time_ms)
                : r.duration_ms != null
                  ? num(r.duration_ms)
                  : null,
    };
}

export function normalizeMatchingResponse(raw: unknown, projectId: string): RhMatchingRunResponse {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error" || root.success === false) {
        throw new RhMatchingApiError(messageFromBody(raw, "Le matching a échoué."), { httpStatus: 400 });
    }

    const topRaw = root.top_matches ?? root.matches ?? root.results;
    const top_matches = Array.isArray(topRaw)
        ? topRaw.map(parseTopMatch).filter((x): x is RhMatchingTopMatch => x != null)
        : [];

    const meta_matching = asRecord(root.meta_matching ?? root.meta);
    const summary = parseSummary(root.summary ?? meta_matching, top_matches);

    if (summary.execution_time_ms == null) {
        const fromMeta = meta_matching.execution_time_ms ?? meta_matching.duration_ms;
        if (fromMeta != null) summary.execution_time_ms = num(fromMeta);
    }

    return {
        status: str(root.status) || "success",
        workflow: str(root.workflow) || undefined,
        operation: str(root.operation) || undefined,
        enterprise_id: str(root.enterprise_id) || undefined,
        project_id: str(root.project_id) || projectId,
        project: asRecord(root.project),
        required_skills: Array.isArray(root.required_skills) ? root.required_skills : [],
        match_narrative: str(root.match_narrative) || null,
        llm_enriched: Boolean(root.llm_enriched),
        top_matches,
        meta_matching,
        summary,
    };
}

export async function runRhWorkforceMatching(
    payload: RhMatchingRunPayload,
    options?: RhMatchingFetchOptions,
): Promise<RhMatchingRunResponse> {
    const project_id = str(payload.project_id);
    if (!project_id) {
        throw new RhMatchingApiError("Sélectionnez un projet avant de lancer le matching.");
    }

    const url = matchingRunUrl();
    const body = {
        project_id,
        top_n: payload.top_n ?? DEFAULT_TOP_N,
        min_availability_pct: payload.min_availability_pct ?? DEFAULT_MIN_AVAILABILITY_PCT,
    };
    console.log("[RH Matching POST]", url, body);

    const res = await fetch(url, {
        method: "POST",
        headers: {
            ...buildRhMatchingAuthHeaders(options?.token),
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

    if (!res.ok) {
        throw new RhMatchingApiError(messageFromBody(json, "Impossible de lancer le matching IA"), {
            httpStatus: res.status,
        });
    }

    return normalizeMatchingResponse(json, project_id);
}

/** GET `/webhook/rh/matching/projects` — projets pour le select (champ `projects` à la racine JSON). */
export async function fetchRhMatchingProjects(
    options?: RhMatchingFetchOptions,
): Promise<RhProjectOption[]> {
    const url = resolveMatchingProjectsUrl();
    console.log("[RH Matching GET projects]", url);

    const res = await fetch(url, {
        method: "GET",
        headers: buildRhMatchingAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });

    let data: Record<string, unknown> = {};
    try {
        const json = await res.json();
        data = json && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>) : {};
    } catch {
        data = {};
    }

    console.log("matching projects response:", data);

    if (!res.ok) {
        throw new RhMatchingApiError(
            str(data.message ?? data.error) || "Impossible de charger les projets",
            { httpStatus: res.status },
        );
    }

    const rawList = Array.isArray(data.projects) ? data.projects : [];
    return rawList.map(mapMatchingProjectRow).filter((x): x is RhProjectOption => x != null);
}

/** Alias explicite pour les appels composant / service. */
export const getMatchingProjects = fetchRhMatchingProjects;

export async function fetchRhMatchingResults(
    projectId: string,
    options?: RhMatchingFetchOptions,
): Promise<RhMatchingRunResponse> {
    const id = str(projectId);
    if (!id) throw new RhMatchingApiError("project_id requis.");

    const url = matchingResultsUrl(id);
    console.log("[RH Matching GET results]", url);

    const res = await fetch(url, {
        headers: buildRhMatchingAuthHeaders(options?.token),
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
        throw new RhMatchingApiError(messageFromBody(json, "Impossible de charger les résultats"), {
            httpStatus: res.status,
        });
    }

    return normalizeMatchingResponse(json, id);
}

export { MATCHING_TIMEOUT_MS, DEFAULT_TOP_N, DEFAULT_MIN_AVAILABILITY_PCT };
export {
    RH_MATCHING_RUN_URL_PRODUCTION,
    RH_MATCHING_RESULTS_URL_PRODUCTION,
    RH_MATCHING_PROJECTS_URL_PRODUCTION,
    RH_MATCHING_RUN_URL_DEV,
    RH_MATCHING_RESULTS_URL_DEV,
    RH_MATCHING_PROJECTS_URL_DEV,
} from "@/api/rh-matching.constants";
