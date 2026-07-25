import type { ComponentType, HTMLAttributes } from "react";
import { useNavigate } from "react-router";
import {
    AlertTriangle,
    ArrowRight,
    Beaker01,
    BookOpen01,
    FileCheck02,
    User01,
    UserPlus01,
} from "@untitledui/icons";
import type { SuggestedAction } from "@/api/manager-copilot.types";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";

const CONFIG: Record<SuggestedAction["type"], { Icon: ComponentType<HTMLAttributes<HTMLOrSVGElement>>; bg: string }> = {
    assign: { Icon: UserPlus01, bg: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-300" },
    training: { Icon: BookOpen01, bg: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300" },
    review: { Icon: FileCheck02, bg: "bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300" },
    view_talent: { Icon: User01, bg: "bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300" },
    view_alert: { Icon: AlertTriangle, bg: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300" },
    launch_simulation: { Icon: Beaker01, bg: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300" },
};

export function SuggestedActionsButtons({
    actions,
    projectId,
}: {
    actions: SuggestedAction[];
    projectId?: string;
}) {
    const navigate = useNavigate();
    if (!actions?.length) return null;

    const handleClick = (action: SuggestedAction) => {
        const targetId = action.target_id?.trim();
        switch (action.type) {
            case "view_talent":
                if (targetId) navigate(`/workspace/manager/team/${encodeURIComponent(targetId)}`);
                return;
            case "view_alert":
                if (targetId && projectId) {
                    navigate(managerProjectMissionControlPath(projectId, "overview"));
                }
                return;
            case "launch_simulation":
                if (projectId) navigate(managerProjectMissionControlPath(projectId, "simulation"));
                return;
            case "assign":
                if (projectId) navigate(managerProjectMissionControlPath(projectId, "team"));
                return;
            case "training":
                if (projectId) navigate(managerProjectMissionControlPath(projectId, "competences"));
                return;
            case "review":
                if (projectId) navigate(managerProjectMissionControlPath(projectId, "overview"));
                return;
            default:
                break;
        }
    };

    return (
        <div className="mt-3 flex flex-col gap-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-quaternary">Actions suggérées</div>
            {actions.map((action, idx) => {
                const cfg = CONFIG[action.type] ?? CONFIG.review;
                const Icon = cfg.Icon;
                return (
                    <button
                        key={`${action.type}-${idx}`}
                        type="button"
                        onClick={() => handleClick(action)}
                        className={cx(
                            "flex w-full items-center rounded-lg border border-secondary bg-primary px-2.5 py-2 text-left transition-colors hover:bg-secondary_subtle",
                        )}
                    >
                        <div className={cx("mr-2 shrink-0 rounded p-1", cfg.bg)}>
                            <Icon className="size-3.5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-primary">{action.label}</div>
                            {action.context ? (
                                <div className="truncate text-[11px] text-fg-tertiary">{action.context}</div>
                            ) : null}
                        </div>
                        <ArrowRight className="ml-2 size-3.5 shrink-0 text-fg-quaternary" aria-hidden />
                    </button>
                );
            })}
        </div>
    );
}
