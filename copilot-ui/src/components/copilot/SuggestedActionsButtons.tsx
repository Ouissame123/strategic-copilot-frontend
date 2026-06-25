import { AlertTriangle, ArrowRight, Beaker01, GitBranch01, User01, UserPlus01 } from "@untitledui/icons";
import { useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import type { SuggestedAction, SuggestedActionType } from "@/api/helper-chat-v3.types";
import { helperV3SuggestedActionPath } from "@/lib/helper-chat-v3-navigation";
import { cx } from "@/utils/cx";

const ACTION_CONFIG: Record<SuggestedActionType, { Icon: typeof User01; bg: string }> = {
    view_talent: { Icon: User01, bg: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300" },
    view_alert: { Icon: AlertTriangle, bg: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300" },
    launch_simulation: { Icon: Beaker01, bg: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300" },
    assign_talent: { Icon: UserPlus01, bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300" },
    view_arbitrage: { Icon: GitBranch01, bg: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300" },
};

type SuggestedActionsButtonsProps = {
    actions: SuggestedAction[];
    projectId?: string | null;
};

export function SuggestedActionsButtons({ actions, projectId }: SuggestedActionsButtonsProps) {
    const navigate = useNavigate();
    if (!actions?.length) return null;

    return (
        <div className="mt-3 flex flex-col gap-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">Actions suggérées</div>
            {actions.map((action, idx) => {
                const cfg = ACTION_CONFIG[action.type];
                if (!cfg) return null;
                const href = helperV3SuggestedActionPath(action, projectId);
                const { Icon } = cfg;

                return (
                    <Button
                        key={`${action.type}-${action.target_id}-${idx}`}
                        type="button"
                        color="secondary"
                        size="sm"
                        className="h-auto w-full justify-start px-2.5 py-2 text-left"
                        isDisabled={!href}
                        onClick={() => href && navigate(href)}
                        aria-label={action.label}
                    >
                        <span className={cx("mr-2 shrink-0 rounded p-1", cfg.bg)}>
                            <Icon className="size-3.5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{action.label}</span>
                            {action.context ? (
                                <span className="block truncate text-[11px] text-fg-tertiary">{action.context}</span>
                            ) : null}
                        </span>
                        <ArrowRight className="ml-2 size-3.5 shrink-0 text-fg-quaternary" aria-hidden />
                    </Button>
                );
            })}
        </div>
    );
}
