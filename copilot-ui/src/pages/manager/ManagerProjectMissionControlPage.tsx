import { useCallback, useMemo } from "react";
import { isAxiosError } from "axios";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
    ProjectMissionControlWorkspace,
    type MissionControlWorkspaceTabId,
} from "@/components/manager/project-mission-control-modal";
import { useProjectDetail } from "@/hooks/useProjects";
import { readManagerProjectNavState } from "@/utils/manager-project-navigation";
import { parseMissionControlTabParam, workspaceProjectsListPath } from "@/utils/workspace-routes";
import type { ProjectListItem } from "@/types/api.types";

export default function ManagerProjectMissionControlPage() {
    const { projectId: projectIdParam = "" } = useParams();
    const projectId = projectIdParam.trim();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);

    const navState = useMemo(() => readManagerProjectNavState(location.state), [location.state]);

    const workspaceTab = useMemo(
        () => parseMissionControlTabParam(searchParams.get("tab")) ?? "overview",
        [searchParams],
    );

    const detailQuery = useProjectDetail(projectId, { enabled: Boolean(projectId) });

    const listProject = useMemo((): ProjectListItem | undefined => {
        if (!projectId || !navState?.projectName?.trim()) return undefined;
        return {
            id: projectId,
            name: navState.projectName.trim(),
            status: (navState.projectStatus as ProjectListItem["status"]) ?? "active",
            priority: navState.projectPriority ?? 5,
        } as ProjectListItem;
    }, [navState, projectId]);

    const handleClose = useCallback(() => {
        const historyIdx = (window.history.state as { idx?: number } | null)?.idx;
        if (typeof historyIdx === "number" && historyIdx > 0) {
            navigate(-1);
            return;
        }
        navigate(workspaceProjectsListPath("manager"));
    }, [navigate]);

    const handleWorkspaceTabChange = useCallback(
        (tab: MissionControlWorkspaceTabId) => {
            const next = new URLSearchParams(searchParams);
            if (tab === "overview") next.delete("tab");
            else next.set("tab", tab);
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    const showNotFound =
        Boolean(projectId) &&
        detailQuery.isError &&
        !detailQuery.isFetching &&
        !detailQuery.data;

    if (!projectId) {
        return (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center">
                <p className="text-sm text-fg-secondary">{tm("projectNotFoundBody")}</p>
                <button
                    type="button"
                    className="rounded-lg border border-secondary bg-primary px-4 py-2 text-sm font-semibold text-fg-secondary hover:bg-secondary_subtle"
                    onClick={handleClose}
                >
                    {tm("backToProjectsList")}
                </button>
            </div>
        );
    }

    if (showNotFound) {
        const status = isAxiosError(detailQuery.error) ? detailQuery.error.response?.status : undefined;
        const isForbidden = status === 401 || status === 403;
        return (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
                <h2 className="text-lg font-semibold text-fg-primary">
                    {isForbidden ? tm("projectAccessDeniedTitle") : tm("projectNotFoundTitle")}
                </h2>
                <p className="max-w-md text-sm text-fg-secondary">
                    {isForbidden ? tm("projectAccessDeniedBody") : tm("projectNotFoundBody")}
                </p>
                <button
                    type="button"
                    className="rounded-lg border border-secondary bg-primary px-4 py-2 text-sm font-semibold text-fg-secondary hover:bg-secondary_subtle"
                    onClick={handleClose}
                >
                    {tm("backToProjectsList")}
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100dvh-4.25rem)] max-h-[calc(100dvh-4.25rem)] min-h-0 flex-col overflow-hidden">
            <ProjectMissionControlWorkspace
                projectId={projectId}
                listProject={listProject}
                workspaceTab={workspaceTab}
                onWorkspaceTabChange={handleWorkspaceTabChange}
                onClose={handleClose}
            />
        </div>
    );
}
