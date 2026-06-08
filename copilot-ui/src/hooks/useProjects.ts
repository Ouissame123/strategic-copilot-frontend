import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { orchestratorApi } from "../api/orchestrator.api";
import { managerProjectsApi } from "../api/manager-projects.api";
import { strategistApi } from "../api/strategist.api";
import { readEnv } from "@/config/resolve-api-url";
import { readMissionControlHttpErrorMessage } from "@/lib/user-facing-api-error";
import { invalidateAfterStrategistArbitrage } from "@/lib/strategist-arbitrage";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type {
    AssignTalentRequest,
    CreateProjectRequest,
    ExecuteRequest,
    ProposeRequest,
    ProjectDetailResponse,
    WmpUpdateProjectPatchBody,
} from "../types/api.types";

export const useProjects = (filters?: { status?: string; search?: string; limit?: number }) =>
    useQuery({
        queryKey: ["projects", filters],
        queryFn: () => managerProjectsApi.list(filters).then((r) => r.data),
        staleTime: 300_000,
    });

export const useProjectDetail = (id: string, options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: ["project-detail", id],
        queryFn: () => managerProjectsApi.detail(id).then((r) => r.data),
        enabled: Boolean(id) && (options?.enabled ?? true),
        retry: false,
        staleTime: 120_000,
    });

export const useAssignTalent = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ projectId, body }: { projectId: string; body: AssignTalentRequest }) => managerProjectsApi.assign(projectId, body),
        onSuccess: async (_, { projectId }) => {
            void qc.invalidateQueries({ queryKey: ["project-detail", projectId] });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(projectId) });
            void qc.invalidateQueries({ queryKey: ["projects"] });
            void qc.invalidateQueries({ queryKey: queryKeys.projects.all });
            await Promise.all([
                qc.refetchQueries({ queryKey: ["project-detail", projectId] }),
                qc.refetchQueries({ queryKey: queryKeys.manager.projectDetail(projectId) }),
            ]);
            if (readEnv("VITE_TRIGGER_PROJECT_RECOMPUTE_AFTER_ASSIGN") === "1") {
                void orchestratorApi.recomputeFull(projectId).catch(() => {});
            }
        },
    });
};

export const useUnassignTalent = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ projectId, talentId }: { projectId: string; talentId: string }) => managerProjectsApi.unassign(projectId, talentId),
        onSuccess: async (_, { projectId }) => {
            void qc.invalidateQueries({ queryKey: ["project-detail", projectId] });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(projectId) });
            void qc.invalidateQueries({ queryKey: ["projects"] });
            void qc.invalidateQueries({ queryKey: queryKeys.projects.all });
            await Promise.all([
                qc.refetchQueries({ queryKey: ["project-detail", projectId] }),
                qc.refetchQueries({ queryKey: queryKeys.manager.projectDetail(projectId) }),
            ]);
            if (readEnv("VITE_TRIGGER_PROJECT_RECOMPUTE_AFTER_ASSIGN") === "1") {
                void orchestratorApi.recomputeFull(projectId).catch(() => {});
            }
        },
    });
};

export const useCreateProject = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateProjectRequest) => managerProjectsApi.create(body).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["projects"] });
        },
    });
};

export const useUpdateProject = () => {
    const qc = useQueryClient();
    const { push: pushToast } = useToast();
    const { t } = useTranslation("common");
    return useMutation({
        mutationFn: ({ projectId, body }: { projectId: string; body: WmpUpdateProjectPatchBody }) =>
            managerProjectsApi.update(projectId, body).then((r) => r.data),
        onSuccess: async (data, { projectId }) => {
            const patchDetail = (old: ProjectDetailResponse | undefined): ProjectDetailResponse | undefined => {
                if (!old) return old;
                return { ...old, project: { ...old.project, ...data.project } };
            };
            qc.setQueryData(queryKeys.projectDetail(projectId), patchDetail);
            qc.setQueryData(queryKeys.manager.projectDetail(projectId), patchDetail);

            void qc.invalidateQueries({ queryKey: queryKeys.projectDetail(projectId) });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(projectId) });
            void qc.invalidateQueries({ queryKey: ["projects"] });
            void qc.invalidateQueries({ queryKey: queryKeys.projects.all });

            await Promise.all([
                qc.refetchQueries({ queryKey: queryKeys.projectDetail(projectId) }),
                qc.refetchQueries({ queryKey: queryKeys.manager.projectDetail(projectId) }),
                qc.refetchQueries({ queryKey: ["projects"] }),
            ]);

            pushToast(t("managerWorkspace.missionControl.projectChangesSaved"), "success");
        },
        onError: (error) => {
            pushToast(
                t("managerWorkspace.missionControl.projectStatusSaveError", {
                    message: readMissionControlHttpErrorMessage(error),
                }),
                "error",
            );
        },
    });
};

export const useStrategistPropose = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: ProposeRequest) => strategistApi.propose(body).then((r) => r.data),
        onSuccess: () => {
            void invalidateAfterStrategistArbitrage(qc);
        },
    });
};

export const useStrategistExecute = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: ExecuteRequest) => strategistApi.execute(body).then((r) => r.data),
        onSuccess: () => {
            void invalidateAfterStrategistArbitrage(qc);
        },
    });
};

/** Arbitrage Strategist : exécuter ou rejeter une option (POST /webhook/api/strategist/execute). */
export const useExecuteArbitrage = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: ExecuteRequest) => strategistApi.execute(body).then((r) => r.data),
        onSuccess: () => {
            void invalidateAfterStrategistArbitrage(qc);
        },
    });
};

export const useRecomputeFull = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (projectId: string) => orchestratorApi.recomputeFull(projectId).then((r) => r.data),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["project-detail"] });
            void qc.invalidateQueries({ queryKey: ["dashboard"] });
            void qc.invalidateQueries({ queryKey: ["projects"] });
        },
    });
};

export { useWhatIf } from "./useWhatIf";
