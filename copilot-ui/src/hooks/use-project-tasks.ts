import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectTasksApi } from "@/services/projectTasksApi";
import { queryKeys } from "@/lib/query-keys";
import type { CompleteTaskPayload, CreateTaskPayload, UpdateTaskPayload } from "@/types/project-tasks.types";

export function useProjectTasks(projectId: string | null, enabled = true) {
    const id = projectId?.trim() || null;
    return useQuery({
        queryKey: queryKeys.projectTasks(id ?? ""),
        queryFn: () => projectTasksApi.list(id!),
        enabled: Boolean(id) && enabled,
        staleTime: 30_000,
        placeholderData: keepPreviousData,
    });
}

export function useProjectTaskMutations(projectId: string) {
    const qc = useQueryClient();
    const pid = projectId.trim();

    const invalidate = () => void qc.invalidateQueries({ queryKey: queryKeys.projectTasks(pid) });

    const createTask = useMutation({
        mutationFn: (body: CreateTaskPayload) => projectTasksApi.create(pid, body),
        onSuccess: invalidate,
    });

    const updateTask = useMutation({
        mutationFn: ({ taskId, body }: { taskId: string; body: UpdateTaskPayload }) =>
            projectTasksApi.update(pid, taskId, body),
        onSuccess: invalidate,
    });

    const completeTask = useMutation({
        mutationFn: ({ taskId, body }: { taskId: string; body: CompleteTaskPayload }) =>
            projectTasksApi.complete(pid, taskId, body),
        onSuccess: invalidate,
    });

    const deleteTask = useMutation({
        mutationFn: (taskId: string) => projectTasksApi.remove(pid, taskId),
        onSuccess: invalidate,
    });

    return { createTask, updateTask, completeTask, deleteTask };
}
