/**
 * WF Manager Matchmaker — POST /webhook/api/project/talents (projet isolé)
 * WF Matchmaker Batch — POST /webhook/api/matchmaker/batch (dashboard multi-projets)
 */
import { isAxiosError } from "axios";
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import {
    MANAGER_MATCHMAKER_BATCH_LIMIT_PROJECTS,
    MANAGER_MATCHMAKER_BATCH_PATH,
    MANAGER_MATCHMAKER_BATCH_TIMEOUT_MS,
    MANAGER_MATCHMAKER_BATCH_URL,
    MANAGER_MATCHMAKER_TOP_N,
    MANAGER_PROJECT_TALENTS_URL,
    resolveMatchmakerUseAi,
} from "@/api/manager-matchmaker.constants";
import { httpClient } from "@/lib/http-client";
import { normalizeProjectTalentMatchingResponse } from "@/lib/manager-matchmaker-normalize";
import type {
    ManagerMatchmakerBatchBody,
    ManagerMatchmakerBatchResponse,
    ManagerProjectTalentMatchingBody,
    ManagerProjectTalentMatchingResult,
} from "@/types/manager-matchmaker.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export type ManagerMatchmakerFetchOptions = ApiClientOptions & {
    token?: string | null;
    projectName?: string;
};

export class ManagerMatchmakerApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus = 0) {
        super(message);
        this.name = "ManagerMatchmakerApiError";
        this.httpStatus = httpStatus;
    }
}

export type ManagerMatchmakerBatchOptions = {
    signal?: AbortSignal;
    timeout?: number;
};

function parseManagerMatchmakerBatchResponse(raw: unknown): ManagerMatchmakerBatchResponse {
    const root = unwrapN8nRoot(raw);
    const status = String(root.status ?? "").trim() || "unknown";
    return {
        status,
        workflow: root.workflow != null ? String(root.workflow) : undefined,
        batch_run_id: root.batch_run_id != null ? String(root.batch_run_id) : undefined,
        stats: root.stats && typeof root.stats === "object" && !Array.isArray(root.stats)
            ? (root.stats as ManagerMatchmakerBatchResponse["stats"])
            : undefined,
        top_recommendations: Array.isArray(root.top_recommendations)
            ? (root.top_recommendations as ManagerMatchmakerBatchResponse["top_recommendations"])
            : [],
        top_talents_by_project: Array.isArray(root.top_talents_by_project)
            ? (root.top_talents_by_project as ManagerMatchmakerBatchResponse["top_talents_by_project"])
            : [],
        top_skill_gaps: Array.isArray(root.top_skill_gaps)
            ? (root.top_skill_gaps as ManagerMatchmakerBatchResponse["top_skill_gaps"])
            : [],
        errors: Array.isArray(root.errors) ? root.errors : [],
        explanation: root.explanation != null ? String(root.explanation) : undefined,
        llm_enriched_count:
            typeof root.llm_enriched_count === "number" && Number.isFinite(root.llm_enriched_count)
                ? root.llm_enriched_count
                : undefined,
        audit: root.audit && typeof root.audit === "object" ? (root.audit as Record<string, unknown>) : undefined,
        meta: root.meta && typeof root.meta === "object" ? (root.meta as Record<string, unknown>) : undefined,
    };
}

function throwFromAxiosError(err: unknown): never {
    if (isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const data = err.response?.data;
        const root = data != null ? unwrapN8nRoot(data) : {};
        const message = String(root.message ?? root.error ?? err.message ?? `HTTP ${status || "error"}`);
        throw new ManagerMatchmakerApiError(message, status);
    }
    if (err instanceof ManagerMatchmakerApiError) throw err;
    throw new ManagerMatchmakerApiError(err instanceof Error ? err.message : "Impossible de charger les données Matchmaker.");
}

/** POST batch multi-projets — JWT Bearer via httpClient, sans enterprise_id / manager_id. */
export async function runManagerMatchmakerBatch(
    body?: ManagerMatchmakerBatchBody,
    options?: ManagerMatchmakerBatchOptions,
): Promise<ManagerMatchmakerBatchResponse> {
    const url =
        (import.meta.env.VITE_MANAGER_MATCHMAKER_BATCH_URL as string | undefined)?.trim() ||
        MANAGER_MATCHMAKER_BATCH_URL;
    const payload: ManagerMatchmakerBatchBody = {
        top_n: body?.top_n ?? MANAGER_MATCHMAKER_TOP_N,
        limit_projects: body?.limit_projects ?? MANAGER_MATCHMAKER_BATCH_LIMIT_PROJECTS,
        use_ai: body?.use_ai ?? resolveMatchmakerUseAi(),
        simulation_mode: body?.simulation_mode ?? false,
        ...(body?.project_ids?.length ? { project_ids: body.project_ids } : {}),
    };

    const path = url.startsWith("http") ? url : MANAGER_MATCHMAKER_BATCH_PATH;

    if (import.meta.env.DEV) console.log("[Manager Matchmaker] POST matchmaker/batch", path, payload);

    try {
        const { data } = await httpClient.post<unknown>(path, payload, {
            signal: options?.signal,
            timeout: options?.timeout ?? MANAGER_MATCHMAKER_BATCH_TIMEOUT_MS,
            skipGlobalHttpErrorToast: true,
        });
        const parsed = parseManagerMatchmakerBatchResponse(data);
        if (parsed.status !== "success") {
            const errMsg =
                parsed.explanation ||
                (parsed.errors?.length ? String(parsed.errors[0]) : "Le batch Matchmaker a échoué.");
            throw new ManagerMatchmakerApiError(errMsg);
        }
        return parsed;
    } catch (err) {
        throwFromAxiosError(err);
    }
}

export function mapManagerMatchmakerApiError(err: unknown): string {
    if (err instanceof ManagerMatchmakerApiError) {
        if (err.httpStatus === 401) return "Session expirée ou token manquant. Reconnectez-vous.";
        if (err.httpStatus === 403) return "Accès refusé pour l’agent Matchmaker.";
        return err.message;
    }
    return err instanceof Error ? err.message : "Impossible de charger les données Matchmaker.";
}

function buildBody(
    projectId: string,
    enterpriseId: string,
    managerId: string,
): ManagerProjectTalentMatchingBody {
    const project_id = projectId?.trim();
    const enterprise_id = enterpriseId?.trim();
    const manager_id = managerId?.trim();
    if (!project_id) {
        throw new ManagerMatchmakerApiError("project_id manquant — appel Matchmaker annulé.");
    }
    if (!enterprise_id || !manager_id) {
        throw new ManagerMatchmakerApiError("Contexte manager incomplet (enterprise_id ou manager_id manquant).");
    }
    return {
        project_id,
        enterprise_id,
        manager_id,
        top_n: MANAGER_MATCHMAKER_TOP_N,
        simulation_mode: false,
        use_ai: true,
    };
}

export async function runProjectTalentMatching(
    projectId: string,
    enterpriseId: string,
    managerId: string,
    options?: ManagerMatchmakerFetchOptions,
): Promise<ManagerProjectTalentMatchingResult> {
    const url =
        (import.meta.env.VITE_MANAGER_PROJECT_TALENTS_URL as string | undefined)?.trim() ||
        MANAGER_PROJECT_TALENTS_URL;
    const body = buildBody(projectId, enterpriseId, managerId);

    if (import.meta.env.DEV) console.log("[Manager Matchmaker] POST project/talents", url, body);

    const res = await fetch(url, {
        method: "POST",
        headers: {
            ...buildRhTalentsAuthHeaders(options?.token),
            "Content-Type": "application/json",
            Accept: "application/json",
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
        const root = unwrapN8nRoot(json);
        throw new ManagerMatchmakerApiError(
            String(root.message ?? root.error ?? `HTTP ${res.status}`),
            res.status,
        );
    }

    const parsed = normalizeProjectTalentMatchingResponse(
        json,
        projectId,
        options?.projectName ?? "",
    );
    if (!parsed) {
        throw new ManagerMatchmakerApiError(`Réponse matching invalide pour le projet ${projectId}`);
    }
    return parsed;
}
