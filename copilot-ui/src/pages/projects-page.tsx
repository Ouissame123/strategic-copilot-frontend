import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { AnalysisRefreshPanel } from "@/features/crud-common/analysis-refresh-panel";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useProjectsPage } from "@/hooks/use-projects-page";
import { useWhatIf } from "@/providers/what-if-provider";
import { ProjectDetailDrawer } from "@/pages/projects/project-detail-drawer";
import { ProjectsPageHeader } from "@/pages/projects/projects-page-header";
import { DeleteProjectModal, ProjectFormModal } from "@/pages/projects/projects-page-modals";
import { ProjectsTableSection } from "@/pages/projects/projects-table-section";

export const ProjectsPage = () => {
    const { t } = useTranslation(["projects"]);
    useCopilotPage("projects_list", t("projects:title"));

    const p = useProjectsPage();
    const { open: openWhatIf } = useWhatIf();
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        if (searchParams.get("action") !== "new") return;
        p.openCreate();
        const next = new URLSearchParams(searchParams);
        next.delete("action");
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams, p.openCreate]);

    return (
        <div className="space-y-6">
            <ProjectsPageHeader
                tab={p.tab}
                onTabChange={p.setTab}
                tabs={p.tabs}
                linesCount={p.filteredProjects.length}
                stopDecisionCount={p.stopDecisionCount}
                heroSubtitle={p.heroSubtitle}
                kpis={p.kpis}
                searchQuery={p.searchQuery}
                onSearchChange={p.setSearchQuery}
                decisionFilter={p.decisionFilter}
                onDecisionFilterChange={p.setDecisionFilter}
                onExport={() => {
                    /* Export CSV à brancher via API dédiée */
                    window.print();
                }}
                onWhatIfGlobal={() => {
                    // Ouvre le simulateur What-if en modal avec sélection de projet libre.
                    openWhatIf();
                }}
            />

            <section className="space-y-4">
                {p.analysisRefresh ? <AnalysisRefreshPanel payload={p.analysisRefresh} /> : null}
                <ProjectsTableSection
                    loading={p.isPending}
                    error={p.loadError}
                    empty={!p.isPending && !p.loadError && p.filteredProjects.length === 0}
                    emptyDueToFilter={p.emptyDueToFilter}
                    filteredProjects={p.filteredProjects}
                    pagination={p.pagination}
                    perPage={p.perPage}
                    pageSizeOptions={p.pageSizeOptions}
                    onPerPageChange={p.setPerPage}
                    onRetry={() => void p.refetch()}
                    onPageChange={(page) => p.setPage(page)}
                    onOpenDrawer={p.openDrawer}
                    onOpenDrawerAndScrollInsights={p.openDrawerAndScrollInsights}
                    onEdit={p.openEdit}
                    onDelete={p.setPendingDelete}
                    fetchDisabled={p.isFetching}
                />
            </section>

            <ProjectDetailDrawer
                project={p.drawerProject}
                insightsRef={p.drawerInsightsRef}
                onOpenChange={(open) => {
                    if (!open) p.setDrawerProject(null);
                }}
                onScrollToInsights={p.scrollToInsights}
                onAnalyze={p.openAnalyzeFromDrawer}
                onEdit={p.openEdit}
            />

            <ProjectFormModal
                isOpen={p.formOpen}
                onOpenChange={p.setFormOpen}
                editing={p.editing}
                defaultStatusOptions={p.defaultStatusOptions}
                analysisRefresh={p.analysisRefresh}
                creating={p.creating}
                updating={p.updating}
                onSubmit={p.submitProject}
            />

            <DeleteProjectModal
                isOpen={p.pendingDelete != null}
                onOpenChange={(open) => !open && p.setPendingDelete(null)}
                deleting={p.deleting}
                onConfirm={p.confirmDelete}
            />
        </div>
    );
};
