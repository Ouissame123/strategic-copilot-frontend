/**
 * Agrégats RH (n8n) — chemins par défaut sous `/api/rh/*`, surcharges via `VITE_RH_*`.
 * Aucune logique métier : lecture / envoi JSON tel quel.
 */
import type { ApiClientOptions } from "@/utils/apiClient";
import { apiGet, apiPost } from "@/utils/apiClient";

function readEnv(key: string, fallback: string): string {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

/** Synthèse dashboard RH (KPI globaux). */
export async function fetchRhDashboardSummary(options?: ApiClientOptions): Promise<unknown> {
    const path = readEnv("VITE_RH_DASHBOARD_URL", "/webhook/rh/dashboard");
    return apiGet<unknown>(path, options);
}

/** Prévisualisation de réaffectation avant validation. */
export async function postRhReallocationSimulate(body: Record<string, unknown>, options?: ApiClientOptions): Promise<unknown> {
    const path = readEnv("VITE_RH_REALLOCATION_SIMULATE_URL", "/api/rh/reallocation/simulate");
    return apiPost<unknown>(path, body, options);
}

/** Validation définitive de la réaffectation. */
export async function postRhReallocationValidate(body: Record<string, unknown>, options?: ApiClientOptions): Promise<unknown> {
    const path = readEnv("VITE_RH_REALLOCATION_VALIDATE_URL", "/api/rh/reallocation/validate");
    return apiPost<unknown>(path, body, options);
}
