import { API_ROUTES } from "@/lib/api-routes";

/** GET WF_Manager_Project_Tasks — liste */
export function getManagerProjectTasksListUrl(projectId: string): string {
    return API_ROUTES.taskList(projectId);
}

/** POST WF_Manager_Project_Tasks — création */
export function getManagerProjectTasksCreateUrl(projectId: string): string {
    return API_ROUTES.taskCreate(projectId);
}

/** PATCH WF_Manager_Project_Tasks — mise à jour partielle */
export function getManagerProjectTasksUpdateUrl(projectId: string, taskId: string): string {
    return API_ROUTES.taskUpdate(projectId, taskId);
}

/** PATCH WF_Manager_Project_Tasks — complétion */
export function getManagerProjectTasksCompleteUrl(projectId: string, taskId: string): string {
    return API_ROUTES.taskComplete(projectId, taskId);
}

/** DELETE WF_Manager_Project_Tasks */
export function getManagerProjectTasksDeleteUrl(projectId: string, taskId: string): string {
    return API_ROUTES.taskDelete(projectId, taskId);
}
