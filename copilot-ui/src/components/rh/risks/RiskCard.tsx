import { MoreVertical } from "lucide-react";
import { useNavigate } from "react-router";
import type { Risk } from "@/api/rh-risks.api";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import type { RhRisksDensity } from "@/components/rh/risks/use-rh-risks-density";
import { useCreateRiskAction } from "@/hooks/useRhRisks";
import {
    formatRiskMetricDisplay,
    mapRiskToActionType,
    SEVERITY_BORDER,
} from "@/lib/rh-risks-display";
import { cx } from "@/utils/cx";

type RiskCardProps = {
    risk: Risk;
    density: RhRisksDensity;
    onTalentClick: (talentId: string) => void;
};

function metricBadgeClass(severity: Risk["severity"]): string {
    return severity === "critical"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-amber-200 bg-amber-50 text-amber-900";
}

export function RiskCard({ risk, density, onTalentClick }: RiskCardProps) {
    const navigate = useNavigate();
    const createAction = useCreateRiskAction();
    const isCompact = density === "compact";
    const metricLabel = formatRiskMetricDisplay(risk.risk_type, risk.metric_value);

    const handleCreateAction = () => {
        void createAction.mutateAsync({
            risk_type: risk.risk_type,
            talent_id: risk.talent_id,
            project_id: risk.project_id,
            action_type: mapRiskToActionType(risk.risk_type),
            priority: risk.severity === "critical" ? "urgent" : "normal",
            message: risk.title,
            payload: risk.payload,
        });
    };

    return (
        <article
            onClick={() => onTalentClick(risk.talent_id)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onTalentClick(risk.talent_id);
                }
            }}
            role="button"
            tabIndex={0}
            className={cx(
                "cursor-pointer rounded-md border border-slate-200 bg-white transition hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900 border-l-4",
                SEVERITY_BORDER[risk.severity],
                isCompact ? "px-3 py-2" : "px-4 py-3",
            )}
        >
            <div className="flex items-center gap-3">
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {risk.risk_type_label}
                    </span>
                    {metricLabel ? (
                        <span
                            className={cx(
                                "rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                metricBadgeClass(risk.severity),
                            )}
                        >
                            {metricLabel}
                        </span>
                    ) : null}
                </div>

                <div className="min-w-0 flex-1">
                    <p className={cx("truncate font-medium text-primary", isCompact ? "text-sm" : "text-base")}>
                        {risk.talent_name}
                    </p>
                    {!isCompact ? <p className="mt-0.5 text-xs text-slate-500">{risk.title}</p> : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                        color="primary"
                        size="sm"
                        isLoading={createAction.isPending}
                        onPress={handleCreateAction}
                    >
                        Action
                    </Button>
                    <Dropdown.Root>
                        <Button color="tertiary" size="sm" data-icon-only aria-label="Actions">
                            <MoreVertical size={16} aria-hidden />
                        </Button>
                        <Dropdown.Popover className="min-w-[12rem]">
                            <Dropdown.Menu
                                onAction={(key) => {
                                    if (key === "talent") onTalentClick(risk.talent_id);
                                    else if (key === "profile") {
                                        navigate(`/workspace/rh/employees?talentId=${encodeURIComponent(risk.talent_id)}`);
                                    }
                                }}
                            >
                                <Dropdown.Item id="talent" label="Voir le talent" />
                                <Dropdown.Item id="profile" label="Fiche complète" />
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown.Root>
                </div>
            </div>
        </article>
    );
}
