/**
 * GET viabilité projet — chemin relatif à `VITE_API_BASE_URL` (Bearer via apiClient).
 */
import { apiGet, type ApiClientOptions } from "@/utils/apiClient";

export type ProjectViabilityPayload = {
    viability_score?: number;
    decision?: string;
    risks?: Array<{ severity?: string }>;
};

export async function fetchProjectViability(projectId: string, options?: ApiClientOptions): Promise<ProjectViabilityPayload> {
    const path = `/project/viability?project_id=${encodeURIComponent(projectId.trim())}`;
    return apiGet<ProjectViabilityPayload>(path, options);
}
