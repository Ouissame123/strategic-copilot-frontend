import { useDashboard } from "@/hooks/useDashboard";
import { useDecisions } from "@/hooks/useDecisions";
import { useProjects } from "@/hooks/useProjects";
import type { ManagerDashboardV4Response } from "@/features/manager/types/dashboard-v4";

export const useReportsData = () => {
    const dashboard = useDashboard("enterprise");
    const decisions = useDecisions({ limit: 100 });
    const projects = useProjects({ limit: 200 });

    const data = dashboard.data as ManagerDashboardV4Response | undefined;
    const portfolio = data?.portfolio;
    const team = data?.team;

    const summary = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total_alerts: 0,
    };

    return {
        // Evite un écran "bloqué" si une source secondaire (risks/projects) tarde ou tombe en erreur.
        isLoading: dashboard.isLoading || decisions.isLoading,
        isError: dashboard.isError || decisions.isError || projects.isError,
        data: {
            kpi: {
                projects: {
                    total: portfolio?.total_projects ?? 0,
                    active: portfolio?.by_status.active ?? 0,
                    planned: portfolio?.by_status.planned ?? 0,
                    completed: portfolio?.by_status.completed ?? 0,
                },
                decisions: undefined,
                alerts: {
                    total_open: 0,
                    critical_or_high: 0,
                },
                team: {
                    size: team?.total_pool ?? 0,
                    overloaded: team?.overloaded ?? 0,
                },
            },
            health: undefined,
            widgets: {
                top_alerts: [] as unknown[],
                fragile_projects: data?.projects ?? [],
                recent_decisions: [] as unknown[],
            },
            decisions: decisions.data?.decisions ?? [],
            decisionsBy: decisions.data?.by_decision ?? {},
            summary,
            alerts: [] as unknown[],
            projects: projects.data?.items ?? [],
        },
    };
};
