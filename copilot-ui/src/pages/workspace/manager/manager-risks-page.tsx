import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useProjectRisks } from "@/hooks/use-project-risks";
import { useToast } from "@/providers/toast-provider";
import { managerProjectDetailHref } from "@/pages/workspace/manager-workspace-pages";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { cx } from "@/utils/cx";

function scoreText(value: number | null): string {
    return value == null ? "—" : `${value.toFixed(1)} /10`;
}

function driverText(value: number | null | undefined): string {
    return value == null ? "—" : String(value);
}

function severityTone(severity: string | null): string {
    const value = String(severity ?? "").toLowerCase();
    if (value === "critical" || value === "high") return "bg-error-secondary text-error-primary";
    if (value === "medium") return "bg-warning-secondary text-warning-primary";
    if (value === "low") return "bg-success-secondary text-success-primary";
    return "bg-secondary text-tertiary";
}

function dateText(value: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("fr-FR");
}

export function ManagerRisksPage() {
    const { t } = useTranslation(["common", "nav"]);
    const paths = useWorkspacePaths();
    const navigate = useNavigate();
    const { push } = useToast();
    useCopilotPage("projects_list", t("nav:managerNavRisks"));

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const risksQuery = useProjectRisks(selectedProjectId);

    useEffect(() => {
        if (!risksQuery.error) return;
        const err = risksQuery.error as { status?: number };
        if (err.status === 401) {
            void navigate("/login");
            return;
        }
        if (err.status === 403) push("Accès refusé", "error");
        if (err.status != null && err.status >= 500) push("Erreur serveur, réessayer", "error");
    }, [navigate, push, risksQuery.error]);

    const selectedProject = useMemo(
        () => risksQuery.data?.projects.find((project) => project.project_id === selectedProjectId) ?? null,
        [risksQuery.data?.projects, selectedProjectId],
    );
    const summary = risksQuery.data?.summary;
    const totalAlerts = summary?.total_alerts ?? 0;
    const criticalPlusHigh = (summary?.critical ?? 0) + (summary?.high ?? 0);
    const avgRiskScore = summary?.avg_risk_score ?? null;
    const atRiskProjects = summary?.at_risk_projects ?? null;

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("common:workspace.managerMonEyebrow")}
            title={t("nav:managerNavRisks")}
            description="Risques & alertes consolidés depuis /webhook/api/project/risks."
        >
            <section className="rounded-2xl border border-secondary bg-primary p-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-quaternary">Projet</label>
                <select
                    value={selectedProjectId ?? ""}
                    onChange={(e) => setSelectedProjectId(e.target.value || null)}
                    className="mt-2 block w-full max-w-xl rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
                >
                    <option value="">Toute l'entreprise</option>
                    {(risksQuery.data?.projects ?? []).map((project) => (
                        <option key={project.project_id} value={project.project_id}>
                            {project.project_name ?? project.project_id}
                        </option>
                    ))}
                </select>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-secondary bg-primary p-4">
                    <p className="text-xs text-quaternary">Total alertes</p>
                    <p className="text-2xl font-semibold text-primary">{summary?.total_alerts ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-secondary bg-primary p-4">
                    <p className="text-xs text-quaternary">Critique + Haute</p>
                    <p className="text-2xl font-semibold text-error-primary">{summary ? criticalPlusHigh : "—"}</p>
                </div>
                <div className="rounded-xl border border-secondary bg-primary p-4">
                    <p className="text-xs text-quaternary">Score moyen</p>
                    <p className="text-2xl font-semibold text-primary">{scoreText(avgRiskScore)}</p>
                </div>
                <div className="rounded-xl border border-secondary bg-primary p-4">
                    <p className="text-xs text-quaternary">Projets à risque</p>
                    <p className="text-2xl font-semibold text-primary">{atRiskProjects ?? "—"}</p>
                </div>
            </section>

            {selectedProject ? (
                <section className="rounded-2xl border border-secondary bg-primary p-4">
                    <h2 className="text-sm font-semibold text-primary">Détail projet sélectionné</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-tertiary">
                            Risque global: {scoreText(selectedProject.risk_score)}
                        </span>
                        <span className={cx("rounded-full px-2 py-0.5", severityTone(selectedProject.risk_level))}>
                            Niveau: {selectedProject.risk_level ?? "—"}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-tertiary">
                            Fragilité: {driverText(selectedProject.drivers?.fragility_score)}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-tertiary">
                            Anxiety: {driverText(selectedProject.drivers?.anxiety_pulse)}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-tertiary">
                            Chronic: {driverText(selectedProject.drivers?.chronic_overload_score)}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-tertiary">
                            Skills gap: {driverText(selectedProject.drivers?.critical_skills_gap_score)}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-tertiary">
                            Talent dep: {driverText(selectedProject.drivers?.key_talent_dependency_score)}
                        </span>
                    </div>
                </section>
            ) : null}

            {risksQuery.isLoading ? (
                <section className="rounded-2xl border border-secondary bg-primary p-4">
                    <div className="h-4 w-full animate-pulse rounded bg-secondary" />
                    <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-secondary" />
                </section>
            ) : null}

            {!risksQuery.isLoading && totalAlerts === 0 ? (
                <section className="rounded-2xl border border-secondary bg-primary p-6">
                    <EmptyState size="md">
                        <EmptyState.Content>
                            <EmptyState.Title>Aucune alerte active</EmptyState.Title>
                        </EmptyState.Content>
                    </EmptyState>
                </section>
            ) : null}

            {!risksQuery.isLoading && totalAlerts > 0 ? (
                <section className="rounded-2xl border border-secondary bg-primary p-4">
                    <h2 className="mb-3 text-sm font-semibold text-primary">Liste d’alertes</h2>
                    {(risksQuery.data?.items.length ?? 0) === 0 ? (
                        <p className="text-sm text-tertiary">
                            Aucune alerte, mais {risksQuery.data?.projects.length ?? 0} projets suivis
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {risksQuery.data?.items.map((item) => {
                                const href = managerProjectDetailHref({ id: item.project_id }, paths.project);
                                return (
                                    <article key={item.alert_id} className="rounded-lg border border-secondary p-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={cx("rounded-full px-2 py-0.5 text-xs", severityTone(item.severity))}>
                                                {item.severity ?? "—"}
                                            </span>
                                            <p className="text-sm font-semibold text-primary">{item.title ?? item.category ?? "Risque"}</p>
                                        </div>
                                        <p className="mt-1 text-sm text-secondary">{item.message ?? "—"}</p>
                                        <p className="mt-1 text-xs text-tertiary">
                                            Projet: {item.project_name ?? "—"} · Détecté: {dateText(item.detected_at)}
                                        </p>
                                        {href ? (
                                            <div className="mt-2">
                                                <Button color="secondary" size="sm" href={href}>Ouvrir projet</Button>
                                            </div>
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            ) : null}
        </WorkspacePageShell>
    );
}
