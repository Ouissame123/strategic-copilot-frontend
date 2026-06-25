import { API_ROUTES } from "@/lib/api-routes";

export function getProjectRequirementsListUrl(projectId: string): string {
    return API_ROUTES.reqList(projectId);
}

export function getProjectRequirementsCreateUrl(projectId: string): string {
    return API_ROUTES.reqCreate(projectId);
}

/** PATCH — `…/manager/projects/{projectId}/requirements/{requirementId}` */
export function getProjectRequirementsUpdateUrl(projectId: string, requirementId: string): string {
    return API_ROUTES.reqUpdate(projectId, requirementId);
}

export function getProjectRequirementsDeleteUrl(projectId: string, requirementId: string): string {
    return API_ROUTES.reqDelete(projectId, requirementId);
}
