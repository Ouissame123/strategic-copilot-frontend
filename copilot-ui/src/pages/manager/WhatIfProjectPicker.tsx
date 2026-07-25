import { useMemo } from "react";
import { ArrowRight, Beaker01 } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useProjects } from "@/hooks/useProjects";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import type { ProjectListItem } from "@/types/api.types";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";
import type { ManagerProjectNavState } from "@/utils/manager-project-navigation";

function hasViabilityBaseline(project: ProjectListItem): boolean {
    const score = project.latest_viability_score;
    return score != null && Number.isFinite(Number(score));
}

export default function WhatIfProjectPicker() {
    const { t } = useTranslation("common");
    const navigate = useNavigate();
    const projectsQuery = useProjects({ limit: 100 });

    useWorkspaceTopbarMeta(t("managerWorkspace.missionControl.whatIfTitle"), undefined, null);

    const eligibleProjects = useMemo(() => {
        const items = projectsQuery.data?.items ?? [];
        return items.filter(
            (p) =>
                hasViabilityBaseline(p) &&
                (p.status === "active" || p.status === "planned" || String(p.status ?? "").toLowerCase() === "active"),
        );
    }, [projectsQuery.data?.items]);

    const openSimulation = (project: ProjectListItem) => {
        const state: ManagerProjectNavState = {
            projectName: project.name,
            projectStatus: project.status,
            projectPriority: project.priority ?? undefined,
        };
        navigate(managerProjectMissionControlPath(project.id, "simulation"), { state });
    };

    return (
        <WorkspacePageShell role="manager" eyebrow={t("workspaceRoles.manager")} title={t("managerWorkspace.missionControl.whatIfTitle")} description={false} omitHeader>
            <div className="mx-auto max-w-2xl space-y-6">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-950/50">
                        <Beaker01 className="size-5 text-primary-600 dark:text-primary-300" aria-hidden />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t("managerWorkspace.missionControl.whatIfTitle")}</h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("managerWorkspace.projects.whatIfPickerHint")}</p>
                    </div>
                </div>

                {projectsQuery.isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }, (_, i) => (
                            <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/40" />
                        ))}
                    </div>
                ) : null}

                {!projectsQuery.isLoading && eligibleProjects.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t("managerWorkspace.projects.whatIfPickerEmpty")}</p>
                    </div>
                ) : null}

                <ul className="space-y-2">
                    {eligibleProjects.map((project) => {
                        const viability = Number(project.latest_viability_score);
                        return (
                            <li key={project.id}>
                                <button
                                    type="button"
                                    onClick={() => openSimulation(project)}
                                    className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-primary-700"
                                >
                                    <div className="min-w-0 pr-3">
                                        <h3 className="truncate font-medium text-slate-900 dark:text-slate-100">{project.name}</h3>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {t("managerWorkspace.projects.whatIfPickerViability", { score: viability.toFixed(1) })}
                                            {" · "}
                                            {project.status}
                                            {project.priority != null ? ` · P${Math.round(Number(project.priority))}` : ""}
                                        </p>
                                    </div>
                                    <ArrowRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <div className="flex justify-start">
                    <Button type="button" color="tertiary" size="sm" onClick={() => navigate("/workspace/manager/projects")}>
                        {t("managerWorkspace.projects.whatIfPickerBack")}
                    </Button>
                </div>
            </div>
        </WorkspacePageShell>
    );
}
