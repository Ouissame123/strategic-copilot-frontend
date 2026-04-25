/**
 * Espace Talent — lecture seule, aucune logique métier côté SPA.
 * GET unique (agrégat dashboard / projets / tâches / compétences / reco.) — chemin surchargé par env si besoin.
 */
import type { ApiClientOptions } from "@/utils/apiClient";
import { apiGet } from "@/utils/apiClient";

function getPath(): string {
    const fromEnv = (import.meta.env as Record<string, string | undefined>).VITE_COPILOT_TALENT_URL?.trim();
    return fromEnv || "/api/copilot/talent";
}

export async function fetchTalentWorkspace(options?: ApiClientOptions): Promise<unknown> {
    return apiGet<unknown>(getPath(), options);
}
