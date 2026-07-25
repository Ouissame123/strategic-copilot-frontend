import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Inbox, MoreVertical, Plus } from "lucide-react";
import {
    completeTask,
    deleteTask,
    fetchTasks,
    patchTask,
    type Task,
    type TaskStatus,
    type TasksEffortTotal,
} from "@/api/tasks";
import { CreateTaskModal, type AssignedTalentOption } from "@/components/CreateTaskModal";
import { EditTaskModal } from "@/components/EditTaskModal";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";

export type TasksTabProps = {
    projectId: string;
    enterpriseId: string;
    token: string;
    assignedTalents: AssignedTalentOption[];
};

type StatusFilter = "all" | TaskStatus | "overdue";

const COLUMNS: { status: TaskStatus; title: string; headerClass: string; badgeClass: string }[] = [
    { status: "todo", title: "À faire", headerClass: "bg-blue-50 text-blue-800 dark:bg-blue-950/40", badgeClass: "bg-slate-100 text-slate-700" },
    { status: "in_progress", title: "En cours", headerClass: "bg-orange-50 text-orange-800 dark:bg-orange-950/40", badgeClass: "bg-orange-100 text-orange-800" },
    { status: "done", title: "Terminé", headerClass: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40", badgeClass: "bg-emerald-100 text-emerald-800" },
];

function avatarColor(name: string): string {
    const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatDueDate(iso: string | null): string {
    if (!iso) return "";
    const t = Date.parse(iso.length > 10 ? iso : `${iso}T12:00:00`);
    if (!Number.isFinite(t)) return iso.slice(0, 10);
    return new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function effortBarClass(actual: number, planned: number): string {
    if (planned <= 0) return "bg-green-400";
    const ratio = actual / planned;
    if (ratio > 1) return "bg-red-500";
    if (ratio >= 0.8) return "bg-orange-400";
    return "bg-green-400";
}

type KanbanTaskCardProps = {
    task: Task;
    draggingId: string | null;
    menuOpenId: string | null;
    deleteConfirmId: string | null;
    onDragStart: (taskId: string) => void;
    onDragEnd: () => void;
    onToggleMenu: (taskId: string) => void;
    onEdit: (task: Task) => void;
    onComplete: (task: Task) => void;
    onDeleteRequest: (taskId: string) => void;
    onDeleteConfirm: (taskId: string) => void;
};

function KanbanTaskCard({
    task,
    draggingId,
    menuOpenId,
    deleteConfirmId,
    onDragStart,
    onDragEnd,
    onToggleMenu,
    onEdit,
    onComplete,
    onDeleteRequest,
    onDeleteConfirm,
}: KanbanTaskCardProps) {
    const planned = task.effort_hours_planned ?? 0;
    const actual = task.effort_hours_actual ?? 0;
    const pct = planned > 0 ? Math.min(150, (actual / planned) * 100) : 0;

    return (
        <article
            role="listitem"
            draggable
            onDragStart={(e) => {
                onDragStart(task.id);
                e.dataTransfer.setData("taskId", task.id);
                e.dataTransfer.setData("fromStatus", task.status);
            }}
            onDragEnd={onDragEnd}
            className={cx(
                "mb-2 cursor-grab rounded-[10px] border border-slate-200 bg-white p-3 shadow-sm transition dark:border-slate-700 dark:bg-[#1e2130]",
                draggingId === task.id && "border-dashed border-primary-400 opacity-50",
                "hover:border-primary-300 hover:shadow-md active:cursor-grabbing",
            )}
        >
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                    {task.is_critical ? (
                        <span className="rounded-full bg-red-800 px-2 py-0.5 text-[10px] font-semibold text-white">● Critique</span>
                    ) : null}
                    {task.task_type === "deliverable" ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">Livrable</span>
                    ) : null}
                    {task.task_type === "milestone" ? (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800">Jalon</span>
                    ) : null}
                </div>
                <div className="relative">
                    <button
                        type="button"
                        aria-label="Menu tâche"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleMenu(task.id);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <MoreVertical className="size-4" />
                    </button>
                    {menuOpenId === task.id ? (
                        <div
                            className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 text-xs shadow-lg dark:border-slate-600 dark:bg-slate-900"
                            data-task-menu
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                                onClick={() => onEdit(task)}
                            >
                                ✏️ Modifier
                            </button>
                            {task.status !== "done" ? (
                                <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                                    onClick={() => onComplete(task)}
                                >
                                    ✅ Marquer terminée
                                </button>
                            ) : null}
                            {deleteConfirmId === task.id ? (
                                <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left font-semibold text-red-600 hover:bg-red-50"
                                    onClick={() => onDeleteConfirm(task.id)}
                                >
                                    Confirmer ?
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                                    onClick={() => onDeleteRequest(task.id)}
                                >
                                    🗑️ Supprimer
                                </button>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>

            <p
                className={cx(
                    "text-sm font-medium text-slate-900 dark:text-slate-100",
                    task.status === "done" && "line-through opacity-60",
                )}
            >
                {task.title}
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                {task.assigned_talent_name ? (
                    <div className="flex items-center gap-1.5">
                        <span
                            className="inline-flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: avatarColor(task.assigned_talent_name) }}
                        >
                            {initials(task.assigned_talent_name)}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">{task.assigned_talent_name}</span>
                    </div>
                ) : (
                    <span className="italic text-slate-400">Non assigné</span>
                )}
                {task.due_date ? (
                    <span
                        className={cx(
                            "inline-flex items-center gap-0.5",
                            task.is_overdue && task.status !== "done" && "font-medium text-red-600",
                            !task.is_overdue &&
                                task.days_until_due != null &&
                                task.days_until_due <= 3 &&
                                task.status !== "done" &&
                                "text-orange-600",
                        )}
                    >
                        Due: {formatDueDate(task.due_date)}
                        {task.is_overdue && task.status !== "done" ? <AlertTriangle className="size-3" /> : null}
                    </span>
                ) : null}
            </div>

            {planned > 0 ? (
                <div className="mt-2">
                    <div className="mb-0.5 flex justify-between text-[10px] text-slate-500">
                        <span>
                            {actual}h / {planned}h
                        </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={cx("h-full rounded-full", effortBarClass(actual, planned))} style={{ width: `${pct}%` }} />
                    </div>
                </div>
            ) : null}

            {task.priority <= 3 ? (
                <p className="mt-2 text-[10px] font-medium text-slate-500">
                    {task.priority === 1 ? "🔴 P1" : task.priority === 2 ? "🟠 P2" : "🟡 P3"}
                </p>
            ) : null}
        </article>
    );
}

export function TasksTab({ projectId, token, assignedTalents }: TasksTabProps) {
    const { push: showToast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [effortTotal, setEffortTotal] = useState<TasksEffortTotal>({ planned: 0, actual: 0, completion_pct: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createDefaultStatus, setCreateDefaultStatus] = useState<TaskStatus>("todo");
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [mobileColumn, setMobileColumn] = useState<TaskStatus>("todo");

    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchTasks(projectId, token);
            setTasks(res.tasks ?? []);
            setEffortTotal(res.effort_total);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    }, [projectId, token]);

    useEffect(() => {
        void loadTasks();
    }, [loadTasks]);

    useEffect(() => {
        const closeMenus = (e: MouseEvent) => {
            const target = e.target;
            if (target instanceof Element && target.closest("[data-task-menu]")) return;
            setMenuOpenId(null);
            setDeleteConfirmId(null);
        };
        window.addEventListener("click", closeMenus);
        return () => window.removeEventListener("click", closeMenus);
    }, []);

    const visibleTasks = useMemo(() => {
        if (statusFilter === "overdue") return tasks.filter((t) => t.is_overdue && t.status !== "done");
        if (statusFilter === "all") return tasks;
        return tasks.filter((t) => t.status === statusFilter);
    }, [tasks, statusFilter]);

    const counts = useMemo(
        () => ({
            all: tasks.length,
            todo: tasks.filter((t) => t.status === "todo").length,
            in_progress: tasks.filter((t) => t.status === "in_progress").length,
            done: tasks.filter((t) => t.status === "done").length,
            overdue: tasks.filter((t) => t.is_overdue && t.status !== "done").length,
        }),
        [tasks],
    );

    const openCreate = useCallback((status: TaskStatus = "todo") => {
        setCreateDefaultStatus(status);
        setIsCreateOpen(true);
    }, []);

    const handleDragStart = useCallback((taskId: string) => setDraggingId(taskId), []);
    const handleDragEnd = useCallback(() => {
        setDraggingId(null);
        setDropTarget(null);
    }, []);

    const handleDrop = useCallback(
        async (columnStatus: TaskStatus, e: React.DragEvent) => {
            e.preventDefault();
            const taskId = e.dataTransfer.getData("taskId");
            const fromStatus = e.dataTransfer.getData("fromStatus") as TaskStatus;
            setDropTarget(null);
            if (!taskId || fromStatus === columnStatus) return;

            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: columnStatus } : t)));

            try {
                if (columnStatus === "done") {
                    await completeTask(projectId, taskId, {}, token);
                } else {
                    await patchTask(projectId, taskId, { status: columnStatus }, token);
                }
                await loadTasks();
            } catch {
                setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: fromStatus } : t)));
                showToast("Erreur lors du déplacement", "error");
            }
        },
        [projectId, token, loadTasks, showToast],
    );

    const handleComplete = useCallback(
        async (task: Task) => {
            setMenuOpenId(null);
            try {
                const result = await completeTask(projectId, task.id, {}, token);
                setTasks((prev) => prev.map((t) => (t.id === task.id ? result.task : t)));
                showToast("Tâche terminée", "success");
                await loadTasks();
            } catch (e: unknown) {
                showToast(e instanceof Error ? e.message : "Erreur", "error");
            }
        },
        [projectId, token, loadTasks, showToast],
    );

    const handleDeleteConfirm = useCallback(
        async (taskId: string) => {
            setMenuOpenId(null);
            setDeleteConfirmId(null);
            try {
                await deleteTask(projectId, taskId, token);
                setTasks((prev) => prev.filter((t) => t.id !== taskId));
                showToast("Tâche supprimée", "success");
                await loadTasks();
            } catch (e: unknown) {
                showToast(e instanceof Error ? e.message : "Erreur suppression", "error");
            }
        },
        [projectId, token, loadTasks, showToast],
    );

    const filterPills: { id: StatusFilter; label: string; count: number }[] = [
        { id: "all", label: "Toutes", count: counts.all },
        { id: "todo", label: "À faire", count: counts.todo },
        { id: "in_progress", label: "En cours", count: counts.in_progress },
        { id: "done", label: "Terminé", count: counts.done },
        { id: "overdue", label: "En retard", count: counts.overdue },
    ];

    const columnsToRender = COLUMNS;

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                {[0, 1, 2].map((col) => (
                    <div key={col} className="space-y-2">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="h-[100px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <span>Erreur : {error}</span>
                    <button type="button" onClick={() => void loadTasks()} className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium">
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                    {filterPills.map((pill) => (
                        <button
                            key={pill.id}
                            type="button"
                            onClick={() => setStatusFilter(pill.id)}
                            className={cx(
                                "rounded-full px-3 py-1 text-xs font-medium transition",
                                statusFilter === pill.id
                                    ? "bg-primary-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
                            )}
                        >
                            {pill.label} ({pill.count})
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs text-slate-500">
                        {effortTotal.planned}h planifiées · {effortTotal.actual}h réalisées · {effortTotal.completion_pct}%
                    </p>
                    <button
                        type="button"
                        onClick={() => openCreate("todo")}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                    >
                        <Plus className="size-3.5" /> Nouvelle tâche
                    </button>
                </div>
            </div>

            {statusFilter === "overdue" && counts.overdue > 0 ? (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-800">
                    {counts.overdue} tâche{counts.overdue > 1 ? "s" : ""} en retard
                </div>
            ) : null}

            <div className="flex gap-2 md:hidden">
                {COLUMNS.map((col) => (
                    <button
                        key={col.status}
                        type="button"
                        onClick={() => setMobileColumn(col.status)}
                        className={cx(
                            "flex-1 rounded-lg py-2 text-xs font-medium",
                            mobileColumn === col.status ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600",
                        )}
                    >
                        {col.title}
                    </button>
                ))}
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3">
                {columnsToRender.map((col) => {
                    const columnTasks = visibleTasks.filter((t) => t.status === col.status);
                    const isDrop = dropTarget === col.status;
                    return (
                        <section
                            key={col.status}
                            role="list"
                            aria-label={col.title}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDropTarget(col.status);
                            }}
                            onDragLeave={() => setDropTarget(null)}
                            onDrop={(e) => void handleDrop(col.status, e)}
                            className={cx(
                                "min-w-[280px] flex-1 rounded-xl p-3 transition md:min-w-0",
                                mobileColumn !== col.status && "hidden md:block",
                                isDrop && "border-2 border-dashed border-primary-600 bg-primary-600/5",
                                !isDrop && "border border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30",
                            )}
                        >
                            <header className={cx("mb-3 flex items-center justify-between rounded-lg px-3 py-2", col.headerClass)}>
                                <h3 className="text-sm font-semibold">{col.title}</h3>
                                <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", col.badgeClass)}>
                                    {tasks.filter((t) => t.status === col.status).length}
                                </span>
                            </header>

                            {columnTasks.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-8 text-center text-slate-400">
                                    <Inbox className="size-8" aria-hidden />
                                    <p className="text-sm">Aucune tâche</p>
                                    <button
                                        type="button"
                                        onClick={() => openCreate(col.status)}
                                        className="text-xs font-medium text-primary-600 underline"
                                    >
                                        + Ajouter
                                    </button>
                                </div>
                            ) : (
                                columnTasks.map((task) => (
                                    <KanbanTaskCard
                                        key={task.id}
                                        task={task}
                                        draggingId={draggingId}
                                        menuOpenId={menuOpenId}
                                        deleteConfirmId={deleteConfirmId}
                                        onDragStart={(id) => handleDragStart(id)}
                                        onDragEnd={handleDragEnd}
                                        onToggleMenu={(id) => {
                                            setDeleteConfirmId(null);
                                            setMenuOpenId((prev) => (prev === id ? null : id));
                                        }}
                                        onEdit={(t) => {
                                            setMenuOpenId(null);
                                            setEditingTask(t);
                                        }}
                                        onComplete={(t) => void handleComplete(t)}
                                        onDeleteRequest={(id) => {
                                            setMenuOpenId(id);
                                            setDeleteConfirmId(id);
                                        }}
                                        onDeleteConfirm={(id) => void handleDeleteConfirm(id)}
                                    />
                                ))
                            )}

                            {columnTasks.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => openCreate(col.status)}
                                    className="mt-1 w-full rounded-lg py-2 text-xs text-slate-400 hover:bg-slate-100 hover:text-primary-600"
                                >
                                    + Ajouter ici
                                </button>
                            ) : null}
                        </section>
                    );
                })}
            </div>

            <CreateTaskModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                projectId={projectId}
                token={token}
                defaultStatus={createDefaultStatus}
                assignedTalents={assignedTalents}
                onCreated={(task) => setTasks((prev) => [...prev, task])}
                onError={(msg) => showToast(msg, "error")}
            />

            {editingTask ? (
                <EditTaskModal
                    task={editingTask}
                    isOpen={Boolean(editingTask)}
                    onClose={() => setEditingTask(null)}
                    projectId={projectId}
                    token={token}
                    assignedTalents={assignedTalents}
                    onUpdated={(task) => setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))}
                    onError={(msg) => showToast(msg, "info")}
                />
            ) : null}
        </div>
    );
}
