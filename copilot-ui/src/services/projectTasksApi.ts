import axios from "axios";
import { authStorage } from "@/lib/auth-storage";
import type {
    CompleteTaskPayload,
    CreateTaskPayload,
    DeleteTaskResponse,
    ProjectTask,
    ProjectTasksEffortTotal,
    ProjectTasksResponse,
    ProjectTasksSummary,
    ProjectTaskStatus,
    ProjectTaskType,
    UpdateTaskPayload,
} from "@/types/project-tasks.types";

/** Pas de baseURL : URLs complètes ou chemins `/n8n-webhook/...` (proxy Vite en dev). */
export const tasksHttp = axios.create({
    timeout: 60_000,
    headers: { "Content-Type": "application/json" },
});

tasksHttp.interceptors.request.use((config) => {
    const token = authStorage.getAccessToken();
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const N8N_BASE = import.meta.env.DEV
    ? "/n8n-webhook"
    : "https://n8nprod.aphelionxinnovations.com/webhook";

function encId(id: string, label: "projectId" | "taskId"): string {
    const s = String(id ?? "").trim();
    if (!s) throw new Error(`Missing ${label}`);
    const lower = s.toLowerCase();
    if (lower === ":id" || lower === ":projectid" || lower === ":taskid") {
        throw new Error(`Invalid ${label} placeholder`);
    }
    return encodeURIComponent(s);
}

export const TASKS_ENDPOINTS = {
    list: (projectId: string) =>
        `${N8N_BASE}/wmt-list-v1/manager/projects/${encId(projectId, "projectId")}/tasks`,

    create: (projectId: string) =>
        `${N8N_BASE}/wmt-create-v1/manager/projects/${encId(projectId, "projectId")}/tasks`,

    update: (projectId: string, taskId: string) =>
        `${N8N_BASE}/wmt-update-v1/manager/projects/${encId(projectId, "projectId")}/tasks/${encId(taskId, "taskId")}`,

    complete: (projectId: string, taskId: string) =>
        `${N8N_BASE}/wmt-complete-v1/manager/projects/${encId(projectId, "projectId")}/tasks/${encId(taskId, "taskId")}/complete`,

    delete: (projectId: string, taskId: string) =>
        `${N8N_BASE}/wmt-delete-v1/manager/projects/${encId(projectId, "projectId")}/tasks/${encId(taskId, "taskId")}`,
};

// --- normalisation (inchangée) ---

function asRecord(value: unknown): Record<string, unknown> | null {
    return value != null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toNumber(value: unknown, fallback = 0): number {
    if (value == null || value === "") return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function toNullableString(value: unknown): string | null {
    if (value == null) return null;
    const s = String(value).trim();
    return s.length ? s : null;
}

function normalizeTaskStatus(raw: unknown): ProjectTaskStatus {
    const v = String(raw ?? "todo")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
    if (v === "in_progress" || v === "inprogress" || v === "doing") return "in_progress";
    if (v === "done" || v === "completed" || v === "complete") return "done";
    return "todo";
}

function normalizeTaskType(raw: unknown): ProjectTaskType {
    const v = String(raw ?? "task").trim().toLowerCase();
    if (v === "deliverable" || v === "milestone") return v;
    return "task";
}

function normalizeProjectTask(raw: unknown, projectId: string, index: number): ProjectTask | null {
    const bag = asRecord(raw);
    if (!bag) return null;

    const id = String(bag.id ?? bag.task_id ?? `task-${index}`).trim();
    if (!id) return null;

    const title = String(bag.title ?? "").trim();
    if (!title) return null;

    const isOverdueRaw = bag.is_overdue;
    const is_overdue =
        isOverdueRaw === true || isOverdueRaw === 1 || String(isOverdueRaw).toLowerCase() === "true";

    return {
        id,
        project_id: String(bag.project_id ?? projectId).trim() || projectId,
        title,
        effort_hours_planned: toNumber(bag.effort_hours_planned, 0),
        effort_hours_actual: toNullableNumber(bag.effort_hours_actual),
        due_date: toNullableString(bag.due_date),
        planned_start_date: toNullableString(bag.planned_start_date),
        completed_at: toNullableString(bag.completed_at),
        is_critical:
            bag.is_critical === true ||
            bag.is_critical === 1 ||
            String(bag.is_critical).toLowerCase() === "true",
        priority: Math.round(toNumber(bag.priority, 5)),
        task_type: normalizeTaskType(bag.task_type),
        status: normalizeTaskStatus(bag.status),
        assigned_talent_id: toNullableString(bag.assigned_talent_id),
        assigned_talent_name: toNullableString(bag.assigned_talent_name ?? bag.talent_name),
        days_until_due: toNullableNumber(bag.days_until_due),
        is_overdue,
    };
}

function computeSummary(tasks: ProjectTask[]): ProjectTasksSummary {
    return {
        total: tasks.length,
        todo: tasks.filter((t) => t.status === "todo").length,
        in_progress: tasks.filter((t) => t.status === "in_progress").length,
        done: tasks.filter((t) => t.status === "done").length,
        overdue: tasks.filter((t) => t.is_overdue).length,
    };
}

function computeEffortTotal(tasks: ProjectTask[], raw: unknown): ProjectTasksEffortTotal {
    const bag = asRecord(raw);
    if (bag) {
        const planned = toNumber(bag.planned_hours ?? bag.planned ?? bag.total_planned_hours, NaN);
        const actual = toNumber(bag.actual_hours ?? bag.actual ?? bag.total_actual_hours, NaN);
        const pct = toNumber(bag.completion_pct ?? bag.completion_percent, NaN);
        if (Number.isFinite(planned) || Number.isFinite(actual) || Number.isFinite(pct)) {
            const planned_hours = Number.isFinite(planned)
                ? planned
                : tasks.reduce((s, t) => s + t.effort_hours_planned, 0);
            const actual_hours = Number.isFinite(actual)
                ? actual
                : tasks.reduce((s, t) => s + (t.effort_hours_actual ?? 0), 0);
            const completion_pct = Number.isFinite(pct)
                ? Math.min(100, Math.max(0, pct))
                : planned_hours > 0
                  ? Math.min(100, Math.round((actual_hours / planned_hours) * 100))
                  : 0;
            return { planned_hours, actual_hours, completion_pct };
        }
    }

    const planned_hours = tasks.reduce((s, t) => s + t.effort_hours_planned, 0);
    const actual_hours = tasks.reduce((s, t) => s + (t.effort_hours_actual ?? 0), 0);
    const completion_pct =
        planned_hours > 0 ? Math.min(100, Math.round((actual_hours / planned_hours) * 100)) : 0;
    return { planned_hours, actual_hours, completion_pct };
}

export function normalizeProjectTasksResponse(raw: unknown, projectId: string): ProjectTasksResponse {
    const root = asRecord(raw) ?? {};
    const nested = asRecord(root.data);
    const bag = nested ?? root;

    const tasksRaw = bag.tasks ?? bag.items ?? bag.results;
    const tasks = Array.isArray(tasksRaw)
        ? tasksRaw
              .map((item, index) => normalizeProjectTask(item, projectId, index))
              .filter((t): t is ProjectTask => t != null)
        : [];

    const summaryBag = asRecord(bag.summary) ?? asRecord(bag.stats);
    const summary = summaryBag
        ? {
              total: Math.round(toNumber(summaryBag.total ?? summaryBag.total_tasks, tasks.length)),
              todo: Math.round(toNumber(summaryBag.todo, computeSummary(tasks).todo)),
              in_progress: Math.round(
                  toNumber(summaryBag.in_progress ?? summaryBag.inprogress, computeSummary(tasks).in_progress),
              ),
              done: Math.round(toNumber(summaryBag.done, computeSummary(tasks).done)),
              overdue: Math.round(toNumber(summaryBag.overdue, computeSummary(tasks).overdue)),
          }
        : computeSummary(tasks);

    const effort_total = computeEffortTotal(tasks, bag.effort_total ?? bag.effort);

    return { tasks, summary, effort_total };
}

function parseTaskResponse(data: unknown, projectId: string): ProjectTask | null {
    const bag = asRecord(data);
    const taskRaw = bag?.task ?? bag?.data ?? data;
    return normalizeProjectTask(taskRaw, projectId, 0);
}

export async function getProjectTasks(projectId: string): Promise<ProjectTasksResponse> {
    const res = await tasksHttp.get<unknown>(TASKS_ENDPOINTS.list(projectId));
    return normalizeProjectTasksResponse(res.data, projectId);
}

export async function createProjectTask(projectId: string, payload: CreateTaskPayload): Promise<ProjectTask | null> {
    const res = await tasksHttp.post<unknown>(TASKS_ENDPOINTS.create(projectId), payload);
    return parseTaskResponse(res.data, projectId);
}

export async function updateProjectTask(
    projectId: string,
    taskId: string,
    payload: UpdateTaskPayload,
): Promise<ProjectTask | null> {
    const res = await tasksHttp.patch<unknown>(TASKS_ENDPOINTS.update(projectId, taskId), payload);
    return parseTaskResponse(res.data, projectId);
}

export async function completeProjectTask(
    projectId: string,
    taskId: string,
    payload: CompleteTaskPayload,
): Promise<ProjectTask | null> {
    const res = await tasksHttp.patch<unknown>(TASKS_ENDPOINTS.complete(projectId, taskId), payload);
    return parseTaskResponse(res.data, projectId);
}

export async function deleteProjectTask(projectId: string, taskId: string): Promise<DeleteTaskResponse> {
    const res = await tasksHttp.delete<DeleteTaskResponse>(TASKS_ENDPOINTS.delete(projectId, taskId));
    return res.data;
}

/** API objet — utilisée par les hooks existants. */
export const projectTasksApi = {
    list: getProjectTasks,
    create: createProjectTask,
    update: updateProjectTask,
    complete: completeProjectTask,
    remove: deleteProjectTask,
};
