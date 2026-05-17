import { useState } from "react";
import { useTranslation } from "react-i18next";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useProjects } from "@/hooks/useProjects";
import { useProjectRisks } from "@/hooks/use-project-risks";

export function ManagerRisksPage() {
    const { t } = useTranslation(["common", "nav"]);
    const [projectId, setProjectId] = useState<string>("");
    const projects = useProjects({ limit: 50 });
    const risks = useProjectRisks(projectId || null);

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("nav:managerNavRisks")}
            description={t("managerWorkspace.shell.risksDescription")}
        >
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-secondary px-3 py-2">
                <option value="">{t("managerWorkspace.shell.pickProject")}</option>
                {(projects.data?.items ?? []).map((project) => (
                    <option key={project.id} value={project.id}>
                        {project.name}
                    </option>
                ))}
            </select>
            {risks.isLoading ? <p>{t("loading")}</p> : null}
            <div className="mt-4 space-y-2">
                {(risks.data?.items ?? []).map((alert) => (
                    <div key={alert.alert_id} className="rounded-lg border border-secondary p-3">
                        <p className="font-medium">{alert.title ?? "—"}</p>
                        <p className="text-sm text-tertiary">{alert.severity ?? "—"}</p>
                    </div>
                ))}
            </div>
        </WorkspacePageShell>
    );
}
