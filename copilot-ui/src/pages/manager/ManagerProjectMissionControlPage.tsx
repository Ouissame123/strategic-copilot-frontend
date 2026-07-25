import { useCallback } from "react";
import { useNavigate } from "react-router";
import MissionControlPage from "@/pages/manager/projects/[id]/MissionControlPage";
import { workspaceProjectsListPath } from "@/utils/workspace-routes";

export default function ManagerProjectMissionControlPage() {
    const navigate = useNavigate();

    const handleClose = useCallback(() => {
        const historyIdx = (window.history.state as { idx?: number } | null)?.idx;
        if (typeof historyIdx === "number" && historyIdx > 0) {
            navigate(-1);
            return;
        }
        navigate(workspaceProjectsListPath("manager"));
    }, [navigate]);

    return <MissionControlPage onBack={handleClose} />;
}
