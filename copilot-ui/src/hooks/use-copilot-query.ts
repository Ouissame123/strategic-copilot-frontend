import {
    getCopilotDashboard,
    getCopilotProjectById,
    getCopilotProjects,
    getCopilotStaffing,
} from "@/api/copilot.api";
import type { CopilotResponse, CopilotScope } from "@/types/copilot";
import { ApiError } from "@/utils/apiClient";

/**
 * Charge les données Copilot pour le scope courant — une seule source d’appel GET.
 * Aucun enrichissement : retourne la réponse JSON telle qu’exposée par le backend.
 */
export async function fetchCopilotByScope(
    scope: CopilotScope,
    projectId: string | undefined,
    managerScope: { enterprise_id?: string; manager_id?: string },
    options?: { signal?: AbortSignal },
): Promise<CopilotResponse> {
    const signal = options?.signal;
    switch (scope) {
        case "dashboard":
            return getCopilotDashboard(managerScope, { signal });
        case "projects_list":
            return getCopilotProjects(managerScope, { signal });
        case "project_detail": {
            if (!projectId?.trim()) {
                throw new ApiError("Identifiant projet manquant pour le Copilot.", 400);
            }
            return getCopilotProjectById(projectId.trim(), { enterprise_id: managerScope.enterprise_id }, { signal });
        }
        case "staffing":
            return getCopilotStaffing(managerScope, { signal });
        case "none":
            throw new ApiError("Copilot inactif sur cette page.", 400);
        default:
            throw new ApiError(`Scope Copilot non géré : ${String(scope)}`, 400);
    }
}
