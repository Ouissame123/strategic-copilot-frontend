import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { orchestratorApi } from "../api/orchestrator.api";
import { isDescriptionOnlyProjectPatch, classifyManagerProjectDeleteError, managerProjectsApi } from "../api/manager-projects.api";
import { strategistApi } from "../api/strategist.api";
import { readEnv } from "@/config/resolve-api-url";
import { readMissionControlHttpErrorMessage } from "@/lib/user-facing-api-error";
import { invalidateAfterStrategistArbitrage } from "@/lib/strategist-arbitrage";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import { projectDetailKeys } from "@/hooks/use-project-detail";
import type {
    AssignTalentRequest,
    CreateProjectRequest,
    ExecuteRequest,
    ProposeRequest,
    ProjectDeleteResponse,
    ProjectDetailResponse,
    ProjectsListResponse,
    ManagerProjectPatchBody,
} from "../types/api.types";

async function invalidateProjectDetailCaches(qc: QueryClient, projectId: string): Promise<void> {
    await Promise.all([
        qc.invalidateQueries({ queryKey: ["project-detail", projectId] }),
        qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(projectId) }),
        qc.invalidateQueries({ queryKey: projectDetailKeys.byId(projectId) }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: queryKeys.projects.all }),
        qc.refetchQueries({ queryKey: ["project-detail", projectId] }),
        qc.refetchQueries({ queryKey: queryKeys.manager.projectDetail(projectId) }),
        qc.refetchQueries({ queryKey: projectDetailKeys.byId(projectId) }),
    ]);
}

/** Invalidation ciblée après création ou suppression d'un projet (liste Mes projets, dashboard, matchmaker). */
async function invalidateAfterProjectListChange(qc: QueryClient): Promise<void> {
    await Promise.all([
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: queryKeys.projects.all }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["manager-matchmaker"] }),
        qc.refetchQueries({ queryKey: ["projects"], type: "active" }),
    ]);
}

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
        placeholderData: keepPreviousData,
    });

export type AssignTalentMutationVars = {
    projectId: string;
    body: AssignTalentRequest;
    /** Libellé UI uniquement — jamais envoyé au backend. */
    talentDisplayName?: string;
};

export const useAssignTalent = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ projectId, body }: AssignTalentMutationVars) => managerProjectsApi.assign(projectId, body),
        onMutate: async (vars) => {
            const detailKey = ["project-detail", vars.projectId] as const;
            await qc.cancelQueries({ queryKey: detailKey });
            const prev = qc.getQueryData<ProjectDetailResponse>(detailKey);
            if (prev) {
                const nextAssignment = {
                    talent_id: vars.body.talent_id,
                    talent_name: vars.talentDisplayName,
                    allocation_pct: vars.body.allocation_pct,
                    assignment_type: vars.body.assignment_type,
                    role_on_project: vars.body.role_on_project ?? undefined,
                    status: "active",
                };
                qc.setQueryData<ProjectDetailResponse>(detailKey, {
                    ...prev,
                    assignments: [
                        ...prev.assignments.filter((a) => a.talent_id !== vars.body.talent_id),
                        nextAssignment,
                    ],
                });
            }
            return { prev, projectId: vars.projectId };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) {
                qc.setQueryData(["project-detail", ctx.projectId], ctx.prev);
            }
        },
        onSuccess: async (_, { projectId }) => {
            await invalidateProjectDetailCaches(qc, projectId);
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
            await invalidateProjectDetailCaches(qc, projectId);
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
        onSuccess: async () => {
            await invalidateAfterProjectListChange(qc);
        },
    });
};

export const useDeleteProject = () => {
    const qc = useQueryClient();
    const { push: pushToast } = useToast();
    const { t } = useTranslation("common");

    return useMutation({
        mutationFn: async (projectId: string): Promise<ProjectDeleteResponse> => {
            const r = await managerProjectsApi.delete(projectId);
            return r.data;
        },
        onMutate: async (projectId) => {
            await qc.cancelQueries({ queryKey: ["projects"] });
            const previous = qc.getQueriesData<ProjectsListResponse>({ queryKey: ["projects"] });
            qc.setQueriesData<ProjectsListResponse>({ queryKey: ["projects"] }, (old) => {
                if (!old?.items) return old;
                const nextItems = old.items.filter((p) => p.id !== projectId);
                const prevTotal = Math.round(Number(old.total) || old.items.length);
                return {
                    ...old,
                    items: nextItems,
                    total: Math.max(0, prevTotal - (old.items.length - nextItems.length)),
                };
            });
            return { previous };
        },
        onError: (error, _projectId, context) => {
            const classified = classifyManagerProjectDeleteError(error);
            // 404 : déjà supprimé ailleurs — on laisse la ligne absente, sans rollback ni toast.
            if (classified.kind === "not_found") return;
            context?.previous?.forEach(([key, data]) => {
                qc.setQueryData(key, data);
            });
            // 403 / 409 / autres : la page affiche toast ou alerte persistante — pas de toast générique ici.
        },
        onSuccess: async () => {
            await invalidateAfterProjectListChange(qc);
            pushToast(t("managerWorkspace.projects.deleteProjectSuccess"), "success");
        },
    });
};

export const useUpdateProject = () => {
    const qc = useQueryClient();
    const { push: pushToast } = useToast();
    const { t } = useTranslation("common");
    return useMutation({
        mutationFn: ({ projectId, body }: { projectId: string; body: ManagerProjectPatchBody }) =>
            managerProjectsApi.update(projectId, body).then((r) => r.data),
        onMutate: async ({ projectId, body }) => {
            if (!isDescriptionOnlyProjectPatch(body)) return undefined;
            const pid = projectId.trim();
            await qc.cancelQueries({ queryKey: queryKeys.projectDetail(pid) });
            const prev = qc.getQueryData<ProjectDetailResponse>(queryKeys.projectDetail(pid));
            if (prev) {
                const next: ProjectDetailResponse = {
                    ...prev,
                    project: { ...prev.project, description: body.description },
                };
                qc.setQueryData(queryKeys.projectDetail(pid), next);
                qc.setQueryData(queryKeys.manager.projectDetail(pid), next);
            }
            return { prev, projectId: pid };
        },
        onSuccess: async (data, { projectId, body }) => {
            const pid = projectId.trim();
            const patchDetail = (old: ProjectDetailResponse | undefined): ProjectDetailResponse | undefined => {
                if (!old) return old;
                const merged = data?.project ? { ...old.project, ...data.project } : old.project;
                if (isDescriptionOnlyProjectPatch(body)) {
                    return { ...old, project: { ...merged, description: body.description } };
                }
                return { ...old, project: merged };
            };
            qc.setQueryData(queryKeys.projectDetail(pid), patchDetail);
            qc.setQueryData(queryKeys.manager.projectDetail(pid), patchDetail);

            void qc.invalidateQueries({ queryKey: queryKeys.projectDetail(pid) });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(pid) });
            void qc.invalidateQueries({ queryKey: ["projects"] });
            void qc.invalidateQueries({ queryKey: queryKeys.projects.all });

            await Promise.all([
                qc.refetchQueries({ queryKey: queryKeys.projectDetail(pid) }),
                qc.refetchQueries({ queryKey: queryKeys.manager.projectDetail(pid) }),
                qc.refetchQueries({ queryKey: ["projects"] }),
            ]);

            pushToast(
                isDescriptionOnlyProjectPatch(body)
                    ? t("managerWorkspace.missionControl.projectDescriptionSaved")
                    : t("managerWorkspace.missionControl.projectChangesSaved"),
                "success",
            );
        },
        onError: (error, { projectId, body }, ctx) => {
            if (ctx?.prev && isDescriptionOnlyProjectPatch(body)) {
                const pid = projectId.trim();
                qc.setQueryData(queryKeys.projectDetail(pid), ctx.prev);
                qc.setQueryData(queryKeys.manager.projectDetail(pid), ctx.prev);
            }
            pushToast(
                isDescriptionOnlyProjectPatch(body)
                    ? t("managerWorkspace.missionControl.projectDescriptionSaveError")
                    : t("managerWorkspace.missionControl.projectStatusSaveError", {
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
