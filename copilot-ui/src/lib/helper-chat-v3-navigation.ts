import type { Citation, SuggestedAction, SuggestedActionType } from "@/api/helper-chat-v3.types";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";

export function helperV3CitationPath(citation: Citation, projectId?: string | null): string | null {
    const pid = projectId?.trim();
    switch (citation.type) {
        case "talent":
            return `/workspace/manager/team/${encodeURIComponent(citation.id)}`;
        case "alert":
            return pid
                ? managerProjectMissionControlPath(pid, "overview")
                : `/workspace/manager/risks?alertId=${encodeURIComponent(citation.id)}`;
        case "decision":
            return pid
                ? `${managerProjectMissionControlPath(pid)}?tab=overview&decision=${encodeURIComponent(citation.id)}`
                : `/workspace/manager/decision-log`;
        case "project":
            return managerProjectMissionControlPath(citation.id);
        case "skill":
            return pid ? `${managerProjectMissionControlPath(pid)}?tab=requirements` : null;
        case "arbitrage":
            return pid
                ? `${managerProjectMissionControlPath(pid)}?tab=overview&arbitrage=${encodeURIComponent(citation.id)}`
                : null;
        default:
            return null;
    }
}

export function helperV3SuggestedActionPath(
    action: SuggestedAction,
    projectId?: string | null,
): string | null {
    const pid = projectId?.trim();
    if (!pid) return null;
    const base = managerProjectMissionControlPath(pid);
    const map: Record<SuggestedActionType, string> = {
        view_talent: `/workspace/manager/team/${encodeURIComponent(action.target_id)}`,
        view_alert: `${base}?tab=overview`,
        launch_simulation: `${base}?tab=simulation`,
        assign_talent: `${base}?tab=team&assign=${encodeURIComponent(action.target_id)}`,
        view_arbitrage: `${base}?tab=overview&arbitrage=${encodeURIComponent(action.target_id)}`,
    };
    return map[action.type] ?? null;
}
