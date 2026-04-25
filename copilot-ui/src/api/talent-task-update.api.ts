/**
 * Mise à jour d’une tâche côté talent (POST/PATCH selon workflow n8n).
 * URL configurable — ne modifie pas les endpoints CRUD existants.
 */
import type { ApiClientOptions } from "@/utils/apiClient";
import { apiPatch, apiPost } from "@/utils/apiClient";

function resolveTaskPatchUrl(taskId: string): string {
    const template = (import.meta.env as Record<string, string | undefined>).VITE_TALENT_TASK_UPDATE_URL?.trim();
    if (template) return template.replace(":id", encodeURIComponent(taskId)).replace("{id}", encodeURIComponent(taskId));
    return `/api/talent/tasks/${encodeURIComponent(taskId)}`;
}

/** PATCH par défaut ; si `VITE_TALENT_TASK_UPDATE_METHOD=POST`, POST avec corps id + champs. */
export async function updateTalentTask(
    taskId: string,
    body: Record<string, unknown>,
    options?: ApiClientOptions,
): Promise<unknown> {
    const url = resolveTaskPatchUrl(taskId);
    const method = (import.meta.env as Record<string, string | undefined>).VITE_TALENT_TASK_UPDATE_METHOD?.trim().toUpperCase();
    if (method === "POST") {
        return apiPost<unknown>(url, { task_id: taskId, ...body }, options);
    }
    return apiPatch<unknown>(url, body, options);
}
