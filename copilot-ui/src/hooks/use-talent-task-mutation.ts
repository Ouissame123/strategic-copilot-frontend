import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTalentTask } from "@/api/talent-task-update.api";
import { queryKeys } from "@/lib/query-keys";

export function useTalentTaskMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, body }: { taskId: string; body: Record<string, unknown> }) => updateTalentTask(taskId, body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.talent.workspace() });
            void qc.invalidateQueries({ queryKey: queryKeys.talent.notifications() });
            void qc.invalidateQueries({ queryKey: queryKeys.projects.all });
            void qc.invalidateQueries({ queryKey: queryKeys.portfolio.all });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.all });
        },
    });
}
