import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";
import { TaskCard } from "@/components/projects/tasks/TaskCard";
import { TaskFormDrawer, type TalentOption } from "@/components/projects/tasks/TaskFormDrawer";
import { useProjectTaskMutations, useProjectTasks } from "@/hooks/use-project-tasks";
import { filterProjectTasks } from "@/lib/project-tasks-display";
import { readUserFacingApiErrorMessage } from "@/lib/user-facing-api-error";
import type { ProjectTask, ProjectTaskStatus } from "@/types/project-tasks.types";
import { useToast } from "@/providers/toast-provider";

export type ProjectTasksTabProps = {
    projectId: string;
    enabled?: boolean;
    taskAssignableTalents: TalentOption[];
};

type StatusFilter = "all" | ProjectTaskStatus;

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <article className="rounded-2xl border border-secondary bg-primary px-3 py-2 shadow-xs">
            <p className="text-[10px] font-medium uppercase tracking-wide text-fg-tertiary">{label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-fg-primary">{value}</p>
        </article>
    );
}

export function ProjectTasksTab({ projectId, enabled = true, taskAssignableTalents }: ProjectTasksTabProps) {
    const { t } = useTranslation("common");
    const tt = (key: string, opts?: Record<string, string | number>) =>
        String(opts ? t(`managerWorkspace.missionControl.tasks.${key}`, opts as never) : t(`managerWorkspace.missionControl.tasks.${key}`));

    const { push } = useToast();
    const tasksQuery = useProjectTasks(projectId, enabled);
    const { createTask, updateTask, completeTask, deleteTask } = useProjectTaskMutations(projectId);

    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [criticalOnly, setCriticalOnly] = useState(false);
    const [search, setSearch] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
    const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
    const [actingTaskId, setActingTaskId] = useState<string | null>(null);

    const data = tasksQuery.data;
    const filtered = useMemo(
        () => filterProjectTasks(data?.tasks ?? [], { status: statusFilter, criticalOnly, search }),
        [data?.tasks, statusFilter, criticalOnly, search],
    );

    const summary = data?.summary ?? { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 };
    const effort = data?.effort_total ?? { planned_hours: 0, actual_hours: 0, completion_pct: 0 };

    const openCreate = () => {
        setDrawerMode("create");
        setEditingTask(null);
        setDrawerOpen(true);
    };

    const openEdit = (task: ProjectTask) => {
        setDrawerMode("edit");
        setEditingTask(task);
        setDrawerOpen(true);
    };

    const handleError = (error: unknown, fallback: string) => {
        push(readUserFacingApiErrorMessage(error, fallback), "error");
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard label={tt("statTotal")} value={summary.total} />
                <StatCard label={tt("statTodo")} value={summary.todo} />
                <StatCard label={tt("statInProgress")} value={summary.in_progress} />
                <StatCard label={tt("statDone")} value={summary.done} />
                <StatCard label={tt("statOverdue")} value={summary.overdue} />
            </div>

            <section className="rounded-2xl border border-secondary bg-primary p-3 shadow-xs">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-secondary">
                    <span>{tt("effortProgressLabel", { pct: effort.completion_pct })}</span>
                    <span className="font-medium tabular-nums">
                        {tt("effortConsumed", {
                            actual: Math.round(effort.actual_hours * 10) / 10,
                            planned: Math.round(effort.planned_hours * 10) / 10,
                        })}
                    </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary_subtle">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-secondary to-brand-solid transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, effort.completion_pct))}%` }}
                    />
                </div>
            </section>

            <div className="flex flex-col gap-2 rounded-2xl border border-secondary bg-primary p-3 shadow-xs sm:flex-row sm:flex-wrap sm:items-center">
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-solid px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
                >
                    <Plus className="size-3.5" aria-hidden />
                    {tt("addTask")}
                </button>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="rounded-xl border border-secondary bg-primary px-2.5 py-2 text-xs font-medium text-fg-secondary"
                >
                    <option value="all">{tt("filterAll")}</option>
                    <option value="todo">{tt("statusTodo")}</option>
                    <option value="in_progress">{tt("statusInProgress")}</option>
                    <option value="done">{tt("statusDone")}</option>
                </select>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-fg-secondary">
                    <input
                        type="checkbox"
                        checked={criticalOnly}
                        onChange={(e) => setCriticalOnly(e.target.checked)}
                        className="size-3.5 rounded border-secondary"
                    />
                    {tt("filterCriticalOnly")}
                </label>

                <div className="relative min-w-0 flex-1 sm:min-w-[12rem]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-tertiary" aria-hidden />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={tt("searchPlaceholder")}
                        className="w-full rounded-xl border border-secondary bg-primary py-2 pl-8 pr-2 text-xs text-fg-primary"
                    />
                </div>
            </div>

            {tasksQuery.isError ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    {readUserFacingApiErrorMessage(tasksQuery.error, tt("loadError"))}
                </p>
            ) : null}

            {filtered.length === 0 && !tasksQuery.isError ? (
                <div className="rounded-2xl border border-dashed border-secondary bg-secondary_subtle/30 px-4 py-10 text-center">
                    <p className="text-sm font-medium text-fg-primary">{tt("emptyTitle")}</p>
                    <p className="mt-1 text-xs text-fg-tertiary">{tt("emptyHint")}</p>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="mt-4 rounded-xl bg-brand-solid px-4 py-2 text-xs font-semibold text-white"
                    >
                        {tt("addTask")}
                    </button>
                </div>
            ) : null}

            <div className="space-y-2">
                {filtered.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={() => openEdit(task)}
                        completing={actingTaskId === task.id && completeTask.isPending}
                        deleting={actingTaskId === task.id && deleteTask.isPending}
                        onComplete={async (body) => {
                            setActingTaskId(task.id);
                            try {
                                await completeTask.mutateAsync({ taskId: task.id, body });
                                push(tt("completeSuccess"), "success");
                            } catch (e) {
                                handleError(e, tt("completeError"));
                            } finally {
                                setActingTaskId(null);
                            }
                        }}
                        onDelete={() => {
                            if (!window.confirm(tt("deleteConfirm"))) return;
                            setActingTaskId(task.id);
                            void deleteTask
                                .mutateAsync(task.id)
                                .then(() => push(tt("deleteSuccess"), "success"))
                                .catch((e) => handleError(e, tt("deleteError")))
                                .finally(() => setActingTaskId(null));
                        }}
                    />
                ))}
            </div>

            <TaskFormDrawer
                open={drawerOpen}
                mode={drawerMode}
                task={editingTask}
                taskAssignableTalents={taskAssignableTalents}
                saving={createTask.isPending || updateTask.isPending}
                onClose={() => setDrawerOpen(false)}
                onSubmit={async (payload) => {
                    try {
                        if (drawerMode === "create") {
                            await createTask.mutateAsync(payload);
                            push(tt("createSuccess"), "success");
                        } else if (editingTask) {
                            await updateTask.mutateAsync({ taskId: editingTask.id, body: payload });
                            push(tt("updateSuccess"), "success");
                        }
                        setDrawerOpen(false);
                    } catch (e) {
                        handleError(e, drawerMode === "create" ? tt("createError") : tt("updateError"));
                    }
                }}
            />
        </div>
    );
}
