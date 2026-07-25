import { API_ROUTES } from "@/lib/api-routes";
import { buildBrowserFetchN8nUrl } from "@/lib/build-n8n-url";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskType = "task" | "deliverable" | "milestone";

export interface Task {
    id: string;
    project_id?: string;
    title: string;
    status: TaskStatus;
    priority: number;
    task_type: TaskType | string;
    is_critical: boolean;
    effort_hours_planned: number;
    effort_hours_actual: number;
    due_date: string | null;
    planned_start_date: string | null;
    assigned_talent_id: string | null;
    assigned_talent_name: string | null;
    assigned_talent_email?: string | null;
    days_until_due: number | null;
    is_overdue: boolean;
    completed_at: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface TaskForm {
    title?: string;
    status?: TaskStatus;
    priority?: number;
    task_type?: TaskType | string;
    is_critical?: boolean;
    effort_hours_planned?: number;
    effort_hours_actual?: number;
    due_date?: string | null;
    planned_start_date?: string | null;
    assigned_talent_id?: string | null | "__UNASSIGN__";
    completion_note?: string;
}

export interface TasksCounts {
    todo: number;
    in_progress: number;
    done: number;
    overdue: number;
}

export interface TasksEffortTotal {
    planned: number;
    actual: number;
    completion_pct: number;
}

export interface TasksListResponse {
    status: string;
    count?: number;
    tasks: Task[];
    counts: TasksCounts;
    effort_total: TasksEffortTotal;
}

function headers(token: string): HeadersInit {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

function tasksListUrl(projectId: string): string {
    return buildBrowserFetchN8nUrl(API_ROUTES.taskList(projectId));
}

function tasksCreateUrl(projectId: string): string {
    return buildBrowserFetchN8nUrl(API_ROUTES.taskCreate(projectId));
}

function tasksUpdateUrl(projectId: string, taskId: string): string {
    return buildBrowserFetchN8nUrl(API_ROUTES.taskUpdate(projectId, taskId));
}

function tasksCompleteUrl(projectId: string, taskId: string): string {
    return buildBrowserFetchN8nUrl(API_ROUTES.taskComplete(projectId, taskId));
}

function tasksDeleteUrl(projectId: string, taskId: string): string {
    return buildBrowserFetchN8nUrl(API_ROUTES.taskDelete(projectId, taskId));
}

function asRecord(v: unknown): Record<string, unknown> | null {
    return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function nullableStr(v: unknown): string | null {
    if (v == null) return null;
    const s = String(v).trim();
    return s || null;
}

function normalizeStatus(raw: unknown): TaskStatus {
    const v = String(raw ?? "todo").toLowerCase().replace(/\s+/g, "_");
    if (v === "in_progress" || v === "inprogress") return "in_progress";
    if (v === "done" || v === "completed") return "done";
    return "todo";
}

function normalizeTask(raw: unknown): Task | null {
    const r = asRecord(raw);
    if (!r) return null;
    const id = String(r.id ?? r.task_id ?? "").trim();
    const title = String(r.title ?? "").trim();
    if (!id || !title) return null;
    return {
        id,
        project_id: nullableStr(r.project_id) ?? undefined,
        title,
        status: normalizeStatus(r.status),
        priority: Math.round(num(r.priority, 5)),
        task_type: String(r.task_type ?? "task"),
        is_critical: r.is_critical === true || r.is_critical === 1 || String(r.is_critical).toLowerCase() === "true",
        effort_hours_planned: num(r.effort_hours_planned, 0),
        effort_hours_actual: num(r.effort_hours_actual, 0),
        due_date: nullableStr(r.due_date),
        planned_start_date: nullableStr(r.planned_start_date),
        assigned_talent_id: nullableStr(r.assigned_talent_id),
        assigned_talent_name: nullableStr(r.assigned_talent_name ?? r.talent_name),
        assigned_talent_email: nullableStr(r.assigned_talent_email),
        days_until_due: r.days_until_due != null ? num(r.days_until_due, NaN) : null,
        is_overdue: r.is_overdue === true || r.is_overdue === 1 || String(r.is_overdue).toLowerCase() === "true",
        completed_at: nullableStr(r.completed_at),
        created_at: nullableStr(r.created_at),
        updated_at: nullableStr(r.updated_at),
    };
}

function normalizeListResponse(raw: unknown): TasksListResponse {
    const root = unwrapN8nRoot(raw) as Record<string, unknown>;
    const tasksRaw = root.tasks ?? root.items;
    const tasks = Array.isArray(tasksRaw)
        ? tasksRaw.map((t) => normalizeTask(t)).filter((t): t is Task => t != null)
        : [];

    const countsBag = asRecord(root.counts) ?? asRecord(root.summary);
    const counts: TasksCounts = {
        todo: Math.round(num(countsBag?.todo, tasks.filter((t) => t.status === "todo").length)),
        in_progress: Math.round(num(countsBag?.in_progress ?? countsBag?.inprogress, tasks.filter((t) => t.status === "in_progress").length)),
        done: Math.round(num(countsBag?.done, tasks.filter((t) => t.status === "done").length)),
        overdue: Math.round(num(countsBag?.overdue, tasks.filter((t) => t.is_overdue && t.status !== "done").length)),
    };

    const effortBag = asRecord(root.effort_total) ?? asRecord(root.effort);
    const planned = num(effortBag?.planned ?? effortBag?.planned_hours, tasks.reduce((s, t) => s + t.effort_hours_planned, 0));
    const actual = num(effortBag?.actual ?? effortBag?.actual_hours, tasks.reduce((s, t) => s + t.effort_hours_actual, 0));
    const completion_pct = num(
        effortBag?.completion_pct ?? effortBag?.completion_percent,
        planned > 0 ? Math.round((actual / planned) * 100) : 0,
    );

    return {
        status: String(root.status ?? "success"),
        count: root.count != null ? num(root.count) : tasks.length,
        tasks,
        counts,
        effort_total: { planned, actual, completion_pct },
    };
}

function parseTaskResponse(raw: unknown): Task {
    const root = unwrapN8nRoot(raw) as Record<string, unknown>;
    const taskRaw = root.task ?? root.data ?? root;
    const task = normalizeTask(taskRaw);
    if (!task) throw new Error("Réponse tâche invalide");
    return task;
}

export async function fetchTasks(projectId: string, token: string): Promise<TasksListResponse> {
    const res = await fetch(tasksListUrl(projectId), { headers: headers(token) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return normalizeListResponse(json);
}

export async function createTask(projectId: string, body: Partial<TaskForm>, token: string): Promise<{ status: string; task: Task }> {
    const res = await fetch(tasksCreateUrl(projectId), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
    }
    const json = await res.json();
    const root = unwrapN8nRoot(json) as Record<string, unknown>;
    return { status: String(root.status ?? "success"), task: parseTaskResponse(json) };
}

export async function patchTask(
    projectId: string,
    taskId: string,
    body: Partial<TaskForm>,
    token: string,
): Promise<{ status: string; task: Task }> {
    const res = await fetch(tasksUpdateUrl(projectId, taskId), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
    }
    const json = await res.json();
    const root = unwrapN8nRoot(json) as Record<string, unknown>;
    return { status: String(root.status ?? "success"), task: parseTaskResponse(json) };
}

export async function completeTask(
    projectId: string,
    taskId: string,
    body: { effort_hours_actual?: number; completion_note?: string },
    token: string,
): Promise<{ status: string; task: Task }> {
    const res = await fetch(tasksCompleteUrl(projectId, taskId), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
    }
    const json = await res.json();
    const root = unwrapN8nRoot(json) as Record<string, unknown>;
    return { status: String(root.status ?? "success"), task: parseTaskResponse(json) };
}

export async function deleteTask(
    projectId: string,
    taskId: string,
    token: string,
): Promise<{ status: string; deleted_task?: { id: string; title: string; status: string } }> {
    const res = await fetch(tasksDeleteUrl(projectId, taskId), {
        method: "DELETE",
        headers: headers(token),
    });
    const json = await res.json().catch(() => ({}));
    const root = unwrapN8nRoot(json) as Record<string, unknown>;
    if (!res.ok || String(root.status ?? "").toLowerCase() === "error") {
        const message =
            (typeof root.message === "string" && root.message.trim()) ||
            (typeof root.error === "string" && root.error.trim()) ||
            `HTTP ${res.status}`;
        throw new Error(message);
    }
    return {
        status: String(root.status ?? "success"),
        deleted_task: root.deleted_task as { id: string; title: string; status: string } | undefined,
    };
}
