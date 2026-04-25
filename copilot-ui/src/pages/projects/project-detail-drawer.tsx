import type { RefObject } from "react";
import { BarChart01, Edit01, Stars01 } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ProjectStatusBadge } from "@/components/project/project-status-badge";
import { AnalysisRefreshPanel } from "@/features/crud-common/analysis-refresh-panel";
import type { Project } from "@/types/crud-domain";
import {
    formatLastUpdate,
    formatPriority,
    projectToAnalysisPayload,
} from "@/pages/projects/projects-utils";

type ProjectDetailDrawerProps = {
    project: Project | null;
    insightsRef: RefObject<HTMLDivElement | null>;
    onOpenChange: (open: boolean) => void;
    onScrollToInsights: () => void;
    onAnalyze: () => void;
    onEdit: (project: Project) => void;
};

export function ProjectDetailDrawer({
    project,
    insightsRef,
    onOpenChange,
    onScrollToInsights,
    onAnalyze,
    onEdit,
}: ProjectDetailDrawerProps) {
    const { t } = useTranslation(["projects", "dataCrud"]);

    return (
        <SlideoutMenu isOpen={project != null} onOpenChange={onOpenChange} className="!max-w-[min(36rem,100vw)]">
            {({ close }) =>
                project ? (
                    <>
                        <SlideoutMenu.Header onClose={close}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("projects:drawer.eyebrow")}</p>
                            <h2 className="pr-10 text-xl font-semibold text-primary">{project.name}</h2>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <ProjectStatusBadge status={String(project.status ?? "")} />
                                    <Badge size="sm" type="pill-color" color="gray">
                                    #{String(project.id).slice(0, 8)}
                                </Badge>
                            </div>
                        </SlideoutMenu.Header>
                        <SlideoutMenu.Content className="pb-8">
                            <section>
                                <h3 className="text-sm font-semibold text-primary">{t("projects:drawer.description")}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-secondary">
                                    {project.description?.toString().trim() || t("projects:drawer.noDescription")}
                                </p>
                            </section>

                            <section ref={insightsRef} id="drawer-ai-insights" className="scroll-mt-4">
                                <h3 className="text-sm font-semibold text-primary">{t("projects:drawer.aiTitle")}</h3>
                                <p className="mt-1 text-xs text-tertiary">{t("projects:drawer.aiHint")}</p>
                                <div className="mt-3">
                                    {projectToAnalysisPayload(project) ? (
                                        <AnalysisRefreshPanel payload={projectToAnalysisPayload(project)!} />
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-secondary bg-primary_alt/40 p-4 text-sm text-tertiary">
                                            {t("projects:drawer.aiEmpty")}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-xl border border-secondary bg-secondary/30 p-4">
                                <h3 className="text-sm font-semibold text-primary">{t("projects:drawer.metaTitle")}</h3>
                                <dl className="mt-3 grid gap-2 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-quaternary">{t("projects:table.columns.priority")}</dt>
                                        <dd className="font-medium text-secondary">{formatPriority(project)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-quaternary">{t("projects:table.columns.lastUpdate")}</dt>
                                        <dd className="font-medium text-secondary">{formatLastUpdate(project)}</dd>
                                    </div>
                                </dl>
                            </section>
                        </SlideoutMenu.Content>
                        <SlideoutMenu.Footer>
                            <div className="flex w-full flex-wrap gap-2">
                                <Button color="secondary" className="flex-1" iconLeading={Stars01} onClick={onScrollToInsights}>
                                    {t("projects:actions.viewInsights")}
                                </Button>
                                <Button color="primary" className="flex-1" iconLeading={BarChart01} onClick={onAnalyze}>
                                    {t("projects:actions.analyze")}
                                </Button>
                                <Button
                                    color="secondary"
                                    iconLeading={Edit01}
                                    onClick={() => {
                                        close();
                                        onEdit(project);
                                    }}
                                >
                                    {t("dataCrud:edit")}
                                </Button>
                            </div>
                        </SlideoutMenu.Footer>
                    </>
                ) : null
            }
        </SlideoutMenu>
    );
}
