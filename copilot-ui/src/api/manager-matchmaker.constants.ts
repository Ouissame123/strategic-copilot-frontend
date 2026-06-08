import { buildN8nUrl } from "@/lib/build-n8n-url";

/** WF Talent Matching — POST (contexte manager : enterprise_id + manager_id). */
export const MANAGER_PROJECT_TALENTS_PATH = "/webhook/api/project/talents";
export const MANAGER_PROJECT_TALENTS_URL = buildN8nUrl(MANAGER_PROJECT_TALENTS_PATH);

export const MANAGER_MATCHMAKER_TOP_N = 5;

/** WF Matchmaker Batch — POST (contexte manager via JWT Bearer uniquement). */
export const MANAGER_MATCHMAKER_BATCH_PATH = "/webhook/api/matchmaker/batch";
export const MANAGER_MATCHMAKER_BATCH_URL = buildN8nUrl(MANAGER_MATCHMAKER_BATCH_PATH);

export const MANAGER_MATCHMAKER_BATCH_LIMIT_PROJECTS = 15;

/** Timeout dédié au batch Matchmaker (enrichissement LLM multi-projets). */
export const MANAGER_MATCHMAKER_BATCH_TIMEOUT_MS = 90_000;

/** `use_ai` batch : true par défaut ; surcharge via `VITE_MATCHMAKER_USE_AI` (`true` / `false`). */
export function resolveMatchmakerUseAi(): boolean {
    const raw = (import.meta.env.VITE_MATCHMAKER_USE_AI as string | undefined)?.trim().toLowerCase();
    if (raw === "false" || raw === "0") return false;
    if (raw === "true" || raw === "1") return true;
    return true;
}
