import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orchestratorApi } from "../api/orchestrator.api";
import { managerProjectsApi } from "../api/manager-projects.api";
import { strategistApi } from "../api/strategist.api";
import type {
    AssignTalentRequest,
    CreateProjectRequest,
    ExecuteRequest,
    ProposeRequest,
    UpdateProjectRequest,
} from "../types/api.types";

export const useProjects = (filters?: { status?: string; search?: string; limit?: number }) =>
    useQuery({
        queryKey: ["projects", filters],
        queryFn: () => managerProjectsApi.list(filters).then((r) => r.data),
    });

export const useProjectDetail = (id: string, options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: ["project-detail", id],
        queryFn: () => managerProjectsApi.detail(id).then((r) => r.data),
        enabled: Boolean(id) && (options?.enabled ?? true),
        retry: false,
    });

export const useAssignTalent = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ projectId, body }: { projectId: string; body: AssignTalentRequest }) => managerProjectsApi.assign(projectId, body),
        onSuccess: (_, { projectId }) => {
            qc.invalidateQueries({ queryKey: ["project-detail", projectId] });
            qc.invalidateQueries({ queryKey: ["projects"] });
        },
    });
};

export const useUnassignTalent = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ projectId, talentId }: { projectId: string; talentId: string }) => managerProjectsApi.unassign(projectId, talentId),
        onSuccess: (_, { projectId }) => {
            qc.invalidateQueries({ queryKey: ["project-detail", projectId] });
            qc.invalidateQueries({ queryKey: ["projects"] });
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
    return useMutation({
        mutationFn: ({ projectId, body }: { projectId: string; body: UpdateProjectRequest }) =>
            managerProjectsApi.update(projectId, body).then((r) => r.data),
        onSuccess: async (_, { projectId }) => {
            await qc.invalidateQueries({ queryKey: ["project-detail", projectId] });
            await qc.invalidateQueries({ queryKey: ["projects"] });
            await qc.refetchQueries({ queryKey: ["project-detail", projectId] });
        },
    });
};

export const useStrategistPropose = () =>
    useMutation({ mutationFn: (body: ProposeRequest) => strategistApi.propose(body).then((r) => r.data) });

export const useStrategistExecute = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: ExecuteRequest) => strategistApi.execute(body).then((r) => r.data),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["project-detail"] });
            void qc.invalidateQueries({ queryKey: ["decisions"] });
            void qc.invalidateQueries({ queryKey: ["decision-log"] });
            void qc.invalidateQueries({ queryKey: ["projects"] });
        },
    });
};

/** Arbitrage Strategist : exécuter ou rejeter une option (POST /webhook/api/strategist/execute). */
export const useExecuteArbitrage = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ optionId, action }: { optionId: string; action: "execute" | "reject" }) =>
            strategistApi.executeOption(optionId, action).then((r) => r.data),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["project-detail"] });
            void qc.invalidateQueries({ queryKey: ["decisions"] });
            void qc.invalidateQueries({ queryKey: ["decision-log"] });
            void qc.invalidateQueries({ queryKey: ["projects"] });
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
