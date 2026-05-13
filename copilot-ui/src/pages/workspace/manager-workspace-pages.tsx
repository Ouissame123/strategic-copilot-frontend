import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useProjectDetail, useProjects } from "@/hooks/useProjects";

export function ManagerProjectsWorkspacePage() {
    const { t } = useTranslation(["common"]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const projectsQuery = useProjects({ limit: 50 });
    const detailQuery = useProjectDetail(selectedProjectId);

    const selected = useMemo(
        () => (projectsQuery.data?.items ?? []).find((item) => item.id === selectedProjectId),
        [projectsQuery.data?.items, selectedProjectId],
    );

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.shell.stubProjectsTitle")}
            description={t("managerWorkspace.shell.stubProjectsDesc")}
        >
            {projectsQuery.isLoading ? <p>{t("loading")}</p> : null}
            <div className="space-y-2">
                {(projectsQuery.data?.items ?? []).map((project) => (
                    <div key={project.id} className="flex items-center justify-between rounded-lg border border-secondary p-3">
                        <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-xs text-tertiary">
                                {t("managerWorkspace.shell.stubStatusLine", {
                                    status: project.status,
                                    alerts: project.active_alerts_count,
                                })}
                            </p>
                        </div>
                        <Button size="sm" color="secondary" onClick={() => setSelectedProjectId(project.id)}>
                            {t("managerWorkspace.shell.stubDetail")}
                        </Button>
                    </div>
                ))}
            </div>
            {selectedProjectId && detailQuery.data ? (
                <section className="mt-4 rounded-lg border border-secondary p-4">
                    <p className="font-semibold">{selected?.name ?? t("managerWorkspace.shell.stubProjectFallback")}</p>
                    <p className="text-sm text-tertiary">
                        {t("managerWorkspace.shell.stubAssignments", { count: detailQuery.data.assignments.length })}
                    </p>
                    <p className="text-sm text-tertiary">
                        {t("managerWorkspace.shell.stubAlerts", { count: detailQuery.data.active_alerts.length })}
                    </p>
                </section>
            ) : null}
        </WorkspacePageShell>
    );
}

export function ManagerMonitoringWorkspacePage() {
    return null;
}
