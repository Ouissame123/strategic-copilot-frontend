import { useTranslation } from "react-i18next";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { useProjectRequirementsQuery } from "@/hooks/use-manager-project-requirements";
import type { ProjectDetailResponse } from "@/types/api.types";
import type { MissionControlWorkspaceTabId } from "@/utils/workspace-routes";
import { MiniActivityTimeline } from "./MiniActivityTimeline";
import { NextActionsChecklist } from "./NextActionsChecklist";

type MissionControlSidebarProps = {
    projectId: string;
    projectName: string;
    detail?: ProjectDetailResponse;
    onTabChange: (tab: MissionControlWorkspaceTabId) => void;
    onRunAnalysis: () => void;
    onEditProject: () => void;
    /** Active les requêtes secondaires (lazy par onglet parent). */
    fetchBudget?: boolean;
    fetchRequirements?: boolean;
};

export function MissionControlSidebar({
    projectId,
    projectName,
    detail,
    onTabChange,
    onRunAnalysis,
    onEditProject,
    fetchBudget = false,
    fetchRequirements = false,
}: MissionControlSidebarProps) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);
    const budgetQuery = useProjectBudget(projectId, fetchBudget);
    const reqQuery = useProjectRequirementsQuery(projectId, { enabled: fetchRequirements });

    return (
        <aside
            className="hidden w-full shrink-0 space-y-4 lg:block lg:max-w-sm xl:max-w-md"
            aria-label={tm("sidebarAria")}
        >
            <NextActionsChecklist
                detail={detail}
                budgetZone={budgetQuery.data?.budget.zone}
                requirements={reqQuery.data?.requirements ?? []}
                onTabChange={onTabChange}
                onEditProject={onEditProject}
                onRunAnalysis={onRunAnalysis}
            />
            <MiniActivityTimeline
                projectId={projectId}
                projectName={projectName}
                detail={detail}
                fetchDecisions
                onSeeAll={() => onTabChange("overview")}
            />
        </aside>
    );
}
