import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useDashboard } from "@/hooks/useDashboard";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";
import { formatRelativeShort } from "@/lib/format-relative-short";

function decisionTone(decision: string | undefined): string {
    const d = (decision ?? "").toLowerCase();
    if (d === "stop") return "text-red-600";
    if (d === "adjust") return "text-amber-600";
    if (d === "continue" || d === "proceed") return "text-emerald-600";
    return "text-secondary";
}

export function ManagerDashboardPage() {
    const { t } = useTranslation(["common", "nav"]);
    const { data, isLoading, isError } = useDashboard("mine");

    const fragileProjects = [...(data?.widgets.fragile_projects ?? [])]
        .sort((a, b) => (a.viability_score ?? 99) - (b.viability_score ?? 99))
        .slice(0, 5);

    const topAlerts = (data?.widgets.top_alerts ?? []).slice(0, 5);
    const latestNotifications = (data?.widgets.recent_notifications ?? []).slice(0, 3);
    const em = t("managerWorkspace.relative.emDash");

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("nav:managerNavDashboard")}
            description={data?.headline ?? t("managerWorkspace.shell.workspaceDashboardFallback")}
        >
            {isLoading ? <p>{t("loading")}</p> : null}
            {isError ? <p>{t("managerWorkspace.dashboard.loadError")}</p> : null}

            {data ? (
                <div className="space-y-4">
                    <section className="rounded-xl border border-secondary bg-primary p-4">
                        <p className="text-sm text-tertiary">{t("managerWorkspace.dashboard.copilotInsight")}</p>
                        <p className="mt-1 text-base font-medium text-primary">{data.headline}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {data.priorities.map((priority) => (
                                <Link
                                    key={`${priority.icon}-${priority.label}`}
                                    to={`/workspace/manager${priority.link}`}
                                    className="rounded-full border border-secondary px-3 py-1 text-xs text-secondary hover:bg-secondary_subtle"
                                >
                                    {priority.label}
                                </Link>
                            ))}
                        </div>
                    </section>

                    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <article className="rounded-xl border border-secondary bg-primary p-4">
                            <p className="text-xs text-tertiary">{t("managerWorkspace.dashboard.kpiActiveProjects")}</p>
                            <p className="text-2xl font-semibold text-primary">{data.kpi_cards.projects.active}</p>
                            <p className="text-xs text-tertiary">
                                {t("managerWorkspace.dashboard.kpiTotal", { count: data.kpi_cards.projects.total })}
                            </p>
                        </article>
                        <article className="rounded-xl border border-secondary bg-primary p-4">
                            <p className="text-xs text-tertiary">{t("managerWorkspace.dashboard.kpiAdjustStop")}</p>
                            <p className="text-2xl font-semibold text-primary">
                                {data.kpi_cards.decisions.adjust + data.kpi_cards.decisions.stop}
                            </p>
                            <p className="text-xs text-tertiary">
                                {t("managerWorkspace.dashboard.kpiUnscored", { count: data.kpi_cards.decisions.unscored })}
                            </p>
                        </article>
                        <article className="rounded-xl border border-secondary bg-primary p-4">
                            <p className="text-xs text-tertiary">{t("managerWorkspace.dashboard.kpiAlerts")}</p>
                            <p className="text-2xl font-semibold text-primary">{data.kpi_cards.alerts.critical_or_high}</p>
                            <p className="text-xs text-tertiary">
                                {t("managerWorkspace.dashboard.kpiOpen", { count: data.kpi_cards.alerts.total_open })}
                            </p>
                        </article>
                        <article className="rounded-xl border border-secondary bg-primary p-4">
                            <p className="text-xs text-tertiary">{t("managerWorkspace.dashboard.kpiOverload")}</p>
                            <p className="text-2xl font-semibold text-primary">{data.kpi_cards.team.overloaded}</p>
                            <p className="text-xs text-tertiary">{t("managerWorkspace.dashboard.kpiTeam", { count: data.kpi_cards.team.size })}</p>
                        </article>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-3">
                        <article className="rounded-xl border border-secondary bg-primary p-4 lg:col-span-2">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-primary">{t("managerWorkspace.stub.top5Fragile")}</h3>
                                <Link to="/workspace/manager/projects" className="text-xs text-brand-secondary hover:underline">
                                    {t("managerWorkspace.stub.viewAllShort")}
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {fragileProjects.map((project) => (
                                    <Link
                                        key={project.id}
                                        to={managerProjectsOpenModalPath(project.id)}
                                        className="flex items-center justify-between rounded-lg border border-secondary px-3 py-2 hover:bg-secondary_subtle"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-primary">{project.name}</p>
                                            <p className="text-xs text-tertiary">
                                                {t("managerWorkspace.stub.viability", {
                                                    score:
                                                        project.viability_score != null ? `${project.viability_score.toFixed(1)}/10` : em,
                                                })}
                                            </p>
                                        </div>
                                        <span className={`text-xs font-semibold ${decisionTone(project.decision)}`}>
                                            {project.decision ?? em}
                                        </span>
                                    </Link>
                                ))}
                                {fragileProjects.length === 0 ? (
                                    <p className="text-sm text-tertiary">{t("managerWorkspace.dashboard.noFragile")}</p>
                                ) : null}
                            </div>
                        </article>

                        <article className="rounded-xl border border-secondary bg-primary p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-primary">{t("managerWorkspace.stub.top5Alerts")}</h3>
                                <Link to="/workspace/manager/risks" className="text-xs text-brand-secondary hover:underline">
                                    {t("managerWorkspace.stub.viewAlertsShort")}
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {topAlerts.map((alert) => (
                                    <Link
                                        key={alert.id}
                                        to={alert.project_id ? managerProjectsOpenModalPath(alert.project_id) : "/workspace/manager/risks"}
                                        className="block rounded-lg border border-secondary px-3 py-2 hover:bg-secondary_subtle"
                                    >
                                        <p className="text-sm text-primary">{alert.title}</p>
                                        <p className="text-xs uppercase text-tertiary">{alert.severity}</p>
                                    </Link>
                                ))}
                                {topAlerts.length === 0 ? (
                                    <p className="text-sm text-tertiary">{t("managerWorkspace.stub.noHighCritical")}</p>
                                ) : null}
                            </div>
                        </article>
                    </section>

                    <section className="rounded-xl border border-secondary bg-primary p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-primary">{t("managerWorkspace.dashboard.lastNotifications")}</h3>
                            <Link to="/workspace/manager/notifications" className="text-xs text-brand-secondary hover:underline">
                                {t("managerWorkspace.dashboard.openNotifications")}
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {latestNotifications.map((notification) => (
                                <Link
                                    key={notification.id}
                                    to="/workspace/manager/notifications"
                                    className="flex items-start justify-between gap-3 rounded-lg border border-secondary px-3 py-2 hover:bg-secondary_subtle"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-primary">{notification.title}</p>
                                        <p className="text-xs text-tertiary">{notification.message}</p>
                                    </div>
                                    <span className="whitespace-nowrap text-xs text-tertiary">
                                        {formatRelativeShort(notification.created_at)}
                                    </span>
                                </Link>
                            ))}
                            {latestNotifications.length === 0 ? (
                                <p className="text-sm text-tertiary">{t("managerWorkspace.dashboard.noRecentNotifications")}</p>
                            ) : null}
                        </div>
                    </section>
                </div>
            ) : null}
        </WorkspacePageShell>
    );
}
