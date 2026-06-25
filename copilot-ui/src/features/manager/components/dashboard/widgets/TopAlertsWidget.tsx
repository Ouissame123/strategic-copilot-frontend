import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { TopAlertWidget } from "@/features/manager/types/dashboard";
import { DASHBOARD_CARD_CLASS, formatDisplayValue, riskTypeLabel, SEVERITY_COLORS } from "@/features/manager/lib/dashboard-display";
import { AgentSourceBadge } from "../shared/AgentSourceBadge";
import { SectionTitleWithCodename } from "../SectionTitleWithCodename";
import { cx } from "@/utils/cx";

const SEVERITY_LABELS: Record<string, string> = {
    critical: "Critique",
    high: "Élevée",
    medium: "Moyenne",
    low: "Faible",
};

export function TopAlertsWidget({ alerts }: { alerts: TopAlertWidget[] }) {
    const navigate = useNavigate();
    const { t } = useTranslation("common");
    const topFive = alerts.slice(0, 5);

    return (
        <article className={DASHBOARD_CARD_CLASS}>
            <SectionTitleWithCodename
                title={t("managerWorkspace.dashboard.alertsSectionTitle")}
                codename="Watchdog"
                className="mb-3"
                titleClassName="text-sm"
            />
            {topFive.length === 0 ? (
                <p className="text-sm text-tertiary">Aucune alerte prioritaire.</p>
            ) : (
                <div className="space-y-1.5">
                    {topFive.map((alert) => {
                        const severity = String(alert.severity ?? "medium").toLowerCase();
                        const severityClass = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.medium;
                        return (
                            <button
                                key={alert.id}
                                type="button"
                                onClick={() => navigate(`/workspace/manager/risks?id=${encodeURIComponent(alert.id)}`)}
                                className="flex w-full items-start gap-2 rounded-lg border border-secondary px-3 py-2 text-left transition hover:bg-secondary_subtle"
                            >
                                <span
                                    className={cx(
                                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                        severityClass,
                                    )}
                                >
                                    {SEVERITY_LABELS[severity] ?? severity}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-primary">{riskTypeLabel(alert.risk_type)}</p>
                                    {alert.project_name ? <p className="text-xs text-tertiary">{alert.project_name}</p> : null}
                                    {alert.age_hours != null ? (
                                        <p className="mt-0.5 text-[10px] text-quaternary">{formatDisplayValue(alert.age_hours)}h</p>
                                    ) : null}
                                    <AgentSourceBadge agent="Watchdog" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </article>
    );
}
