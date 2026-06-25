import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { usePatchCopilotDecision } from "@/hooks/useCopilotDecisionAction";
import { useRiskAlertAction } from "@/hooks/useNotifications";
import {
    colorForAgent,
    getInsightActionPattern,
    iconForAgent,
    labelForAgent,
} from "@/lib/mission-control-insight-agents";
import type { MissionControlInsightCard } from "@/lib/mission-control-insights";
import type { MissionControlWorkspaceTabId } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";
import { AssignTalentDialog } from "../team/AssignTalentDialog";
import { InsightWhyDrawer } from "./InsightWhyDrawer";

type InsightCardProps = {
    insight: MissionControlInsightCard;
    projectId: string;
    assignedTalentIds: Set<string>;
    onRunMatchmaker: () => void;
    onTabChange: (tab: MissionControlWorkspaceTabId) => void;
};

export function InsightCard({ insight: ins, projectId, assignedTalentIds, onRunMatchmaker, onTabChange }: InsightCardProps) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);
    const pattern = getInsightActionPattern(ins);
    const patchCopilotDecision = usePatchCopilotDecision(projectId);
    const patchRiskAlert = useRiskAlertAction();
    const [whyDrawerOpen, setWhyDrawerOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);

    const agentLabel = labelForAgent(ins.source_agent);
    const Icon = iconForAgent(ins.source_agent);
    const iconClass = colorForAgent(ins.source_agent);

    const copilotDecisionId = ins.copilot?.decisionId;
    const watchdogAlertId = ins.watchdog?.alertId;
    const matchmakerTalentId = ins.matchmaker?.talent_id?.trim() || null;

    const isCopilotPending =
        patchCopilotDecision.isPending && patchCopilotDecision.variables?.decisionId === copilotDecisionId;
    const isWatchdogPending =
        patchRiskAlert.isPending && patchRiskAlert.variables?.id === watchdogAlertId;

    const patchCopilot = (action: "apply" | "ignore" | "dismiss") => {
        if (!copilotDecisionId) return;
        patchCopilotDecision.mutate({ decisionId: copilotDecisionId, action });
    };

    const patchWatchdog = (action: "resolve" | "ignore" | "dismiss") => {
        if (!watchdogAlertId) return;
        patchRiskAlert.mutate({
            id: watchdogAlertId,
            body: { action },
            projectId,
        });
    };

    const handleMatchmakerPrimary = () => {
        if (matchmakerTalentId) {
            setAssignOpen(true);
            return;
        }
        onRunMatchmaker();
    };

    const renderPrimaryButton = () => {
        switch (pattern) {
            case "copilot":
                if (!copilotDecisionId) return null;
                return (
                    <Button
                        type="button"
                        color="primary"
                        size="sm"
                        isLoading={isCopilotPending && patchCopilotDecision.variables?.action === "apply"}
                        onClick={() => patchCopilot("apply")}
                    >
                        {tm("sidebarApply")}
                    </Button>
                );
            case "watchdog":
                if (!watchdogAlertId) return null;
                return (
                    <Button
                        type="button"
                        color="primary"
                        size="sm"
                        isLoading={isWatchdogPending && patchRiskAlert.variables?.body.action === "resolve"}
                        onClick={() => patchWatchdog("resolve")}
                    >
                        {tm("insightActionResolve")}
                    </Button>
                );
            case "analyst":
                return (
                    <Button type="button" color="primary" size="sm" onClick={() => onTabChange("ai-history")}>
                        {tm("insightActionViewHistory")}
                    </Button>
                );
            case "matchmaker":
                return (
                    <Button type="button" color="primary" size="sm" onClick={handleMatchmakerPrimary}>
                        {tm("insightActionAssign")}
                    </Button>
                );
            case "strategist":
                return (
                    <span title={tm("insightActionAdoptSoonTooltip")} className="inline-flex">
                        <Button type="button" color="primary" size="sm" isDisabled>
                            {tm("insightActionAdoptSoon")}
                        </Button>
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <li className="rounded-lg border border-secondary/80 bg-primary p-3">
            <div className="flex items-start gap-2">
                <Tooltip title={agentLabel}>
                    <TooltipTrigger
                        className={cx("inline-flex size-8 shrink-0 items-center justify-center rounded-lg border", iconClass)}
                        aria-label={agentLabel}
                    >
                        <Icon className="size-4" aria-hidden />
                    </TooltipTrigger>
                </Tooltip>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        VIA {agentLabel}
                        {ins.duplicate_count > 1 ? ` × ${ins.duplicate_count}` : ""}
                    </p>
                    <p className="text-sm font-medium text-fg-primary">{ins.title}</p>
                    <p className="mt-1 text-xs text-fg-secondary">{ins.explanation}</p>
                </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 pl-10">
                <Button type="button" color="tertiary" size="sm" onClick={() => setWhyDrawerOpen(true)}>
                    {tm("sidebarWhy")}
                </Button>
                {renderPrimaryButton()}
                {(pattern === "copilot" || pattern === "watchdog") && (
                    <Dropdown.Root>
                        <Button
                            type="button"
                            color="tertiary"
                            size="sm"
                            iconLeading={MoreVertical}
                            aria-label={tm("insightMoreActionsAria")}
                            aria-haspopup="menu"
                            isDisabled={pattern === "copilot" ? isCopilotPending : isWatchdogPending}
                        />
                        <Dropdown.Popover className="min-w-[12rem]">
                            <Dropdown.Menu
                                onAction={(key) => {
                                    if (pattern === "copilot") {
                                        if (key === "ignore") patchCopilot("ignore");
                                        if (key === "dismiss") patchCopilot("dismiss");
                                    }
                                    if (pattern === "watchdog") {
                                        if (key === "ignore") patchWatchdog("ignore");
                                        if (key === "dismiss") patchWatchdog("dismiss");
                                    }
                                }}
                            >
                                <Dropdown.Item id="ignore" label={tm("insightActionIgnore")} />
                                <Dropdown.Item id="dismiss" label={tm("insightActionDismiss")} />
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown.Root>
                )}
            </div>

            <InsightWhyDrawer open={whyDrawerOpen} insight={ins} onClose={() => setWhyDrawerOpen(false)} />

            {matchmakerTalentId ? (
                <AssignTalentDialog
                    open={assignOpen}
                    projectId={projectId}
                    assignedTalentIds={assignedTalentIds}
                    prefillTalentId={matchmakerTalentId}
                    lockTalentSelection
                    onOpenChange={setAssignOpen}
                />
            ) : null}
        </li>
    );
}
