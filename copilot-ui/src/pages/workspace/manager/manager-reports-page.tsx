import { useTranslation } from "react-i18next";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useDashboard } from "@/hooks/useDashboard";
import { useDecisionLog } from "@/hooks/useNotifications";

export function ManagerReportsPage() {
    const { t } = useTranslation(["common", "nav"]);
    const dashboard = useDashboard("enterprise");
    const decisions = useDecisionLog({ limit: 50 });

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("nav:managerNavReports")}
            description={t("managerWorkspace.shell.reportsDescription")}
        >
            {dashboard.isLoading || decisions.isLoading ? <p>{t("loading")}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-secondary p-4">
                    {t("managerWorkspace.shell.reportsEnterpriseCount", {
                        count: dashboard.data?.portfolio.total_projects ?? 0,
                    })}
                </div>
                <div className="rounded-lg border border-secondary p-4">
                    {t("managerWorkspace.shell.reportsDecisionsCount", {
                        count: decisions.data?.decisions.length ?? 0,
                    })}
                </div>
            </div>
        </WorkspacePageShell>
    );
}
