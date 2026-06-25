import { API_ROUTES } from "@/lib/api-routes";

/** GET WF_Manager_Project_Budget_v1 — breakdown */
export function getManagerProjectBudgetGetUrl(projectId: string): string {
    return API_ROUTES.budgetGet(projectId);
}

/** PATCH WF_Manager_Project_Budget_v1 — mise à jour budget planifié */
export function getManagerProjectBudgetPatchUrl(projectId: string): string {
    return API_ROUTES.budgetPatch(projectId);
}

/** POST WF_Manager_Project_Budget_v1 — reset budget */
export function getManagerProjectBudgetResetUrl(projectId: string): string {
    return API_ROUTES.budgetReset(projectId);
}

/** GET WF_Manager_Project_Budget_v1 — historique audit */
export function getManagerProjectBudgetHistoryUrl(projectId: string): string {
    return API_ROUTES.budgetHistory(projectId);
}
