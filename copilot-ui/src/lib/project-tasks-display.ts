import type { ProjectTask, ProjectTaskStatus } from "@/types/project-tasks.types";

export function formatTaskDate(iso: string | null | undefined): string {
    const s = String(iso ?? "").trim();
    if (!s) return "—";
    const t = Date.parse(s.length <= 10 ? `${s}T12:00:00` : s);
    if (Number.isNaN(t)) return s.slice(0, 10);
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(t));
}

export function formatTaskHours(actual: number | null, planned: number): string {
    const a = actual != null && Number.isFinite(actual) ? Math.round(actual * 10) / 10 : 0;
    const p = Number.isFinite(planned) ? Math.round(planned * 10) / 10 : 0;
    return `${a}h / ${p}h`;
}

export function taskStatusBadgeClass(status: ProjectTaskStatus): string {
    if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
    if (status === "in_progress") return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200";
    return "border-secondary bg-secondary_subtle text-fg-secondary";
}

export function filterProjectTasks(
    tasks: ProjectTask[],
    opts: { status: "all" | ProjectTaskStatus; criticalOnly: boolean; search: string },
): ProjectTask[] {
    const q = opts.search.trim().toLowerCase();
    return tasks.filter((t) => {
        if (opts.status !== "all" && t.status !== opts.status) return false;
        if (opts.criticalOnly && !t.is_critical) return false;
        if (q && !t.title.toLowerCase().includes(q)) return false;
        return true;
    });
}

export const EMPTY_TASK_FORM = {
    title: "",
    effort_hours_planned: "8",
    due_date: "",
    planned_start_date: "",
    priority: "5",
    task_type: "task" as const,
    status: "todo" as const,
    is_critical: false,
    assigned_talent_id: "",
};

export type TaskFormValues = typeof EMPTY_TASK_FORM;

export function taskToFormValues(task: ProjectTask): TaskFormValues {
    return {
        title: task.title,
        effort_hours_planned: String(task.effort_hours_planned),
        due_date: task.due_date?.slice(0, 10) ?? "",
        planned_start_date: task.planned_start_date?.slice(0, 10) ?? "",
        priority: String(task.priority),
        task_type: task.task_type,
        status: task.status,
        is_critical: task.is_critical,
        assigned_talent_id: task.assigned_talent_id ?? "",
    };
}

export function formValuesToPayload(values: TaskFormValues) {
    return {
        title: values.title.trim(),
        effort_hours_planned: Number(values.effort_hours_planned) || 0,
        due_date: values.due_date,
        planned_start_date: values.planned_start_date,
        is_critical: values.is_critical,
        priority: Math.min(10, Math.max(1, Math.round(Number(values.priority) || 5))),
        task_type: values.task_type,
        status: values.status,
        assigned_talent_id: values.assigned_talent_id.trim() || null,
    };
}
