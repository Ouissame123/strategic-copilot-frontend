import { fetchProjectDetail } from "@/api/project-detail.api";
import { managerProjectsApi } from "@/api/manager-projects.api";
import { httpClient } from "@/lib/http-client";
import { API_ROUTES } from "@/lib/api-routes";
import { buildProjectViabilityRefreshBody } from "@/lib/project-viability-refresh";
import type { ProjectDetail, ProjectListItem } from "@/types/api.types";

export const PROJECT_ANALYSIS_POLL_INTERVAL_MS = 3_000;
export const PROJECT_ANALYSIS_MAX_POLL_ATTEMPTS = 10;
export const PROJECTS_BATCH_REFRESH_DELAY_MS = 15_000;

type ComputedAtSource = {
    latest_viability?: { computed_at?: string | null } | null;
    ai_recommendation?: { computed_at?: string | null } | null;
};

/** Timestamp backend pour détecter la fin d'analyse — aucun calcul métier. */
export function readProjectComputedAt(source: ComputedAtSource | null | undefined): string | null {
    const raw = source?.latest_viability?.computed_at ?? source?.ai_recommendation?.computed_at ?? null;
    if (raw == null) return null;
    const s = String(raw).trim();
    return s || null;
}

/** POST viabilité — fire & forget (ne pas await côté UI). */
export function fireProjectViabilityAnalysis(projectId: string, enterpriseId: string): void {
    const body = buildProjectViabilityRefreshBody(projectId, enterpriseId);
    void httpClient
        .post(API_ROUTES.viability(), body, {
            skipGlobalHttpErrorToast: true,
            timeout: 8_000,
        })
        .catch(() => undefined);
}

/** POST batch recompute — fire & forget. */
export function fireOrchestratorRecomputeAll(): void {
    void httpClient
        .post(
            API_ROUTES.orchestratorRecompute(),
            { scope: "all_my_projects" },
            { skipGlobalHttpErrorToast: true, timeout: 8_000 },
        )
        .catch(() => undefined);
}

export type PollProjectAnalysisOptions = {
    intervalMs?: number;
    maxAttempts?: number;
    signal?: AbortSignal;
};

/**
 * Poll GET détail projet jusqu'à changement de `computed_at` ou timeout.
 * Retourne le détail complet quand l'analyse est terminée.
 */
export function pollProjectUntilAnalysisDone(
    projectId: string,
    previousComputedAt: string | null,
    options?: PollProjectAnalysisOptions,
): Promise<ProjectDetail | null> {
    const intervalMs = options?.intervalMs ?? PROJECT_ANALYSIS_POLL_INTERVAL_MS;
    const maxAttempts = options?.maxAttempts ?? PROJECT_ANALYSIS_MAX_POLL_ATTEMPTS;
    const signal = options?.signal;

    return new Promise((resolve) => {
        let attempts = 0;
        let settled = false;

        const finish = (detail: ProjectDetail | null) => {
            if (settled) return;
            settled = true;
            window.clearInterval(timer);
            signal?.removeEventListener("abort", onAbort);
            resolve(detail);
        };

        const onAbort = () => finish(null);
        signal?.addEventListener("abort", onAbort, { once: true });

        const timer = window.setInterval(() => {
            if (signal?.aborted) {
                finish(null);
                return;
            }

            attempts += 1;
            void fetchProjectDetail(projectId)
                .then((detail) => {
                    const newComputedAt = readProjectComputedAt(detail);
                    if (newComputedAt && newComputedAt !== previousComputedAt) {
                        finish(detail);
                    } else if (attempts >= maxAttempts) {
                        finish(null);
                    }
                })
                .catch(() => {
                    if (attempts >= maxAttempts) finish(null);
                });
        }, intervalMs);
    });
}

export type ProjectsListFetchParams = {
    status?: string;
    search?: string;
    limit?: number;
};

/**
 * Poll GET `/manager/projects` jusqu'à changement de `ai_recommendation.computed_at`.
 * Retourne la ligne projet mise à jour.
 */
export function pollProjectInListUntilAnalysisDone(
    projectId: string,
    previousComputedAt: string | null,
    listParams?: ProjectsListFetchParams,
    options?: PollProjectAnalysisOptions,
): Promise<ProjectListItem | null> {
    const intervalMs = options?.intervalMs ?? PROJECT_ANALYSIS_POLL_INTERVAL_MS;
    const maxAttempts = options?.maxAttempts ?? PROJECT_ANALYSIS_MAX_POLL_ATTEMPTS;
    const signal = options?.signal;

    return new Promise((resolve) => {
        let attempts = 0;
        let settled = false;

        const finish = (item: ProjectListItem | null) => {
            if (settled) return;
            settled = true;
            window.clearInterval(timer);
            signal?.removeEventListener("abort", onAbort);
            resolve(item);
        };

        const onAbort = () => finish(null);
        signal?.addEventListener("abort", onAbort, { once: true });

        const timer = window.setInterval(() => {
            if (signal?.aborted) {
                finish(null);
                return;
            }

            attempts += 1;
            void managerProjectsApi
                .list(listParams)
                .then((res) => {
                    const updated = res.data.items.find((p) => p.id === projectId);
                    const newComputedAt = readProjectComputedAt(updated ?? null);
                    if (updated && newComputedAt && newComputedAt !== previousComputedAt) {
                        finish(updated);
                    } else if (attempts >= maxAttempts) {
                        finish(null);
                    }
                })
                .catch(() => {
                    if (attempts >= maxAttempts) finish(null);
                });
        }, intervalMs);
    });
}
