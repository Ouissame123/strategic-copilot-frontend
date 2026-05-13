import { useDashboard } from "@/hooks/useDashboard";
import { useDecisions } from "@/hooks/useDecisions";
import { useProjects } from "@/hooks/useProjects";

export const useReportsData = () => {
    const dashboard = useDashboard("enterprise");
    const decisions = useDecisions({ limit: 100 });
    const projects = useProjects({ limit: 200 });

    const dashboardAlerts = dashboard.data?.widgets?.top_alerts ?? [];
    const severitySummary = dashboardAlerts.reduce(
        (acc, alert) => {
            const key = String(alert.severity ?? "").toLowerCase();
            if (key === "critical") acc.critical += 1;
            else if (key === "high") acc.high += 1;
            else if (key === "medium") acc.medium += 1;
            else if (key === "low") acc.low += 1;
            return acc;
        },
        { critical: 0, high: 0, medium: 0, low: 0 },
    );
    const summary = {
        ...severitySummary,
        total_alerts:
            dashboard.data?.kpi_cards?.alerts?.total_open ??
            dashboard.data?.kpi_cards?.alerts?.critical_or_high ??
            dashboardAlerts.length,
    };

    return {
        // Evite un écran "bloqué" si une source secondaire (risks/projects) tarde ou tombe en erreur.
        isLoading: dashboard.isLoading || decisions.isLoading,
        isError: dashboard.isError || decisions.isError || projects.isError,
        data: {
            kpi: dashboard.data?.kpi_cards,
            health: dashboard.data?.health,
            widgets: dashboard.data?.widgets,
            decisions: decisions.data?.decisions ?? [],
            decisionsBy: decisions.data?.by_decision ?? {},
            summary,
            alerts: dashboardAlerts,
            projects: projects.data?.items ?? [],
        },
    };
};
