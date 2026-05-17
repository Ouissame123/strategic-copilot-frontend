export type ProjectTaskStatus = "todo" | "in_progress" | "done";
export type ProjectTaskType = "task" | "deliverable" | "milestone";

export interface ProjectTask {
    id: string;
    project_id: string;
    title: string;
    effort_hours_planned: number;
    effort_hours_actual: number | null;
    due_date: string | null;
    planned_start_date: string | null;
    completed_at: string | null;
    is_critical: boolean;
    priority: number;
    task_type: ProjectTaskType;
    status: ProjectTaskStatus;
    assigned_talent_id: string | null;
    assigned_talent_name: string | null;
    days_until_due: number | null;
    is_overdue: boolean;
}

export interface ProjectTasksEffortTotal {
    planned_hours: number;
    actual_hours: number;
    completion_pct: number;
}

export interface ProjectTasksSummary {
    total: number;
    todo: number;
    in_progress: number;
    done: number;
    overdue: number;
}

export interface ProjectTasksResponse {
    tasks: ProjectTask[];
    summary: ProjectTasksSummary;
    effort_total: ProjectTasksEffortTotal;
}

export interface CreateTaskPayload {
    title: string;
    effort_hours_planned: number;
    due_date: string;
    planned_start_date: string;
    is_critical: boolean;
    priority: number;
    task_type: ProjectTaskType;
    status: ProjectTaskStatus;
    assigned_talent_id: string | null;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export interface CompleteTaskPayload {
    effort_hours_actual: number;
    completion_note: string;
}

export interface DeleteTaskResponse {
    deleted_task?: ProjectTask;
    success?: boolean;
}
