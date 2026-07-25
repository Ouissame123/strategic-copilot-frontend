import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { DashboardRiskAlert, ProjectFragilityItem, WatchdogSummary } from "@/features/manager/types/dashboard-v3";
import { managerProjectMissionControlPath, WORKSPACE_PREFIX } from "@/utils/workspace-routes";
import { blocCardClass, severityBadgeClass } from "../dashboard-v3-ui";

type RiskAlertsBlocProps = {
    summary: WatchdogSummary;
    alerts: DashboardRiskAlert[];
    byType: Array<{ risk_type: string; count: number }>;
    projectFragility: ProjectFragilityItem[];
};

export function RiskAlertsBloc({ summary, alerts, byType, projectFragility }: RiskAlertsBlocProps) {
    const { t } = useTranslation("common");
    const tb = (key: string) => t(`managerWorkspace.dashboard.bloc2.${key}`);
    const tr = (key: string) => t(`managerWorkspace.dashboard.bloc2.pdfRules.${key}`);

    const pdfRuleLabel = (rule: string) => {
        const k = rule.toLowerCase().replace(/\s+/g, "");
        if (k.includes("overload")) return tr("overload");
        if (k.includes("skill")) return tr("skillGap");
        if (k.includes("conflict")) return tr("conflict");
        if (k.includes("turnover")) return tr("turnover");
        return rule;
    };

    const fragilitySorted = [...projectFragility].sort((a, b) => b.fragility_score - a.fragility_score).slice(0, 5);
    const visibleAlerts = alerts.slice(0, 6);

    return (
        <section className={blocCardClass()} id="dashboard-watchdog">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="text-base font-semibold text-ws-primary">{tb("title")}</h3>
                    <p className="mt-0.5 text-sm text-ws-muted">{tb("subtitle")}</p>
                </div>
                <Link to={`${WORKSPACE_PREFIX.manager}/risks`} className="text-xs font-medium text-[color:var(--ws-accent)] hover:underline">
                    {tb("viewAll")}
                </Link>
            </header>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                    { label: tb("kpiCritical"), value: summary.critical },
                    { label: tb("kpiHigh"), value: summary.high },
                    { label: tb("kpiMedium"), value: summary.medium },
                    { label: tb("kpiNew24h"), value: summary.new_24h },
                ].map((kpi) => (
                    <div key={kpi.label} className="rounded-lg border border-[color:var(--ws-border)] bg-ws-muted-surface px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-ws-muted">{kpi.label}</p>
                        <p className="text-lg font-semibold tabular-nums text-ws-primary">{kpi.value}</p>
                    </div>
                ))}
            </div>

            <p className="mb-3 text-xs text-ws-muted">
                Ouvertes {summary.total_open} · score moy. {summary.avg_risk_score.toFixed(1)}
            </p>

            {byType.length > 0 ? (
                <div className="mb-4 flex flex-wrap gap-2">
                    {byType.slice(0, 6).map((tItem) => (
                        <span
                            key={tItem.risk_type}
                            className="rounded-full bg-ws-muted-surface px-2.5 py-1 text-[10px] font-medium text-ws-muted"
                        >
                            {tItem.risk_type}: {tItem.count}
                        </span>
                    ))}
                </div>
            ) : null}

            {visibleAlerts.length === 0 ? (
                <p className="text-sm text-ws-muted">{tb("empty")}</p>
            ) : (
                <ul className="space-y-2">
                    {visibleAlerts.map((alert) => (
                        <li key={alert.id} className="rounded-lg border border-[color:var(--ws-border)] px-3 py-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${severityBadgeClass(alert.severity)}`}>
                                    {alert.severity}
                                </span>
                                {alert.pdf_rule ? (
                                    <span className="rounded-full bg-[color:var(--ws-accent-muted)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--ws-accent)]">
                                        {pdfRuleLabel(alert.pdf_rule)}
                                    </span>
                                ) : null}
                                {alert.project_id ? (
                                    <Link
                                        to={managerProjectMissionControlPath(alert.project_id)}
                                        className="text-xs font-medium text-[color:var(--ws-accent)] hover:underline"
                                    >
                                        {alert.project_name}
                                    </Link>
                                ) : (
                                    <span className="text-xs font-medium text-ws-primary">{alert.project_name}</span>
                                )}
                                <span className="text-[10px] text-ws-muted">{alert.age_hours}h</span>
                                <span className="text-[10px] tabular-nums text-ws-muted">{alert.risk_score.toFixed(1)}</span>
                            </div>
                            <p className="mt-1 text-sm text-ws-muted">{alert.message}</p>
                        </li>
                    ))}
                </ul>
            )}

            {fragilitySorted.length > 0 ? (
                <div className="mt-4 border-t border-[color:var(--ws-border)] pt-3">
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ws-muted">Fragilité projets</h4>
                    <ul className="space-y-2">
                        {fragilitySorted.map((p) => (
                            <li key={p.project_id} className="rounded-lg border border-[color:var(--ws-border)] px-3 py-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Link
                                        to={managerProjectMissionControlPath(p.project_id)}
                                        className="font-medium text-[color:var(--ws-accent)] hover:underline"
                                    >
                                        {p.project_name}
                                    </Link>
                                    <span className="tabular-nums font-semibold text-ws-primary">{p.fragility_score.toFixed(1)}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-ws-muted">
                                    <span>anxiété {p.anxiety_pulse.toFixed(1)}</span>
                                    <span>dépendance clé {p.key_talent_dependency_score.toFixed(1)}</span>
                                    <span>surcharge chronique {p.chronic_overload_score.toFixed(1)}</span>
                                    <span>gap critique {p.critical_skills_gap_score.toFixed(1)}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </section>
    );
}
