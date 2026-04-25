import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getProjectDetails } from "@/api/project-by-id.api";
import {
    getManagerProjectMonitoring,
    getManagerWorkspaceProjects,
    parseManagerWorkspaceProjectsResponse,
} from "@/api/workspace-manager.api";
import { Button } from "@/components/base/buttons/button";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { toUserMessage } from "@/hooks/crud/error-message";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useAuth } from "@/providers/auth-provider";

type Load = "idle" | "loading" | "ok" | "err";
type ReportPeriod = "7d" | "30d" | "quarter";

type MonitoringPoint = { date: string; score: number | null };
type MonitoringEvent = { ts: string; type: string; summary: string };

export function ManagerReportsPage() {
    const { t } = useTranslation(["common", "nav"]);
    const { user } = useAuth();
    useCopilotPage("dashboard", t("nav:managerNavReports"));
    const [period, setPeriod] = useState<ReportPeriod>("30d");
    const [load, setLoad] = useState<Load>("idle");
    const [error, setError] = useState<string | null>(null);
    const [projectId, setProjectId] = useState("");
    const [projectName, setProjectName] = useState("Projet");
    const [projectOptions, setProjectOptions] = useState<Array<{ id: string; name: string }>>([]);
    const [healthHistory, setHealthHistory] = useState<MonitoringPoint[]>([]);
    const [events, setEvents] = useState<MonitoringEvent[]>([]);
    const [kpi, setKpi] = useState<Record<string, unknown>>({});

    const enterpriseId = user?.enterpriseId?.trim() ?? (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined)?.trim() ?? "";

    const loadProjects = useCallback(async () => {
        const raw = await getManagerWorkspaceProjects({ enterprise_id: enterpriseId, page: 1, limit: 200 });
        const parsed = parseManagerWorkspaceProjectsResponse(raw);
        const options = parsed.items.map((item, idx) => ({
            id: String(item.id ?? item.project_id ?? `project-${idx + 1}`),
            name: String(item.name ?? item.project_name ?? `Projet ${idx + 1}`),
        }));
        setProjectOptions(options);
        if (!projectId && options[0]) {
            setProjectId(options[0].id);
            setProjectName(options[0].name);
        }
    }, [enterpriseId, projectId]);

    const fetchData = useCallback(async () => {
        if (!projectId.trim()) return;
        setLoad("loading");
        setError(null);
        try {
            const [monitoringRaw, detailsRaw] = await Promise.all([
                getManagerProjectMonitoring(projectId, {
                    range: period === "quarter" ? "90d" : period,
                }),
                getProjectDetails(projectId),
            ]);

            const mon = monitoringRaw && typeof monitoringRaw === "object" ? (monitoringRaw as Record<string, unknown>) : {};
            const details = detailsRaw && typeof detailsRaw === "object" ? (detailsRaw as Record<string, unknown>) : {};
            const historyRaw = Array.isArray(mon.health_history) ? mon.health_history : [];
            const eventsRaw = Array.isArray(mon.events) ? mon.events : [];
            setHealthHistory(
                historyRaw.map((entry) => {
                    const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
                    return {
                        date: typeof item.date === "string" ? item.date : "—",
                        score: typeof item.score === "number" ? item.score : null,
                    };
                }),
            );
            setEvents(
                eventsRaw.map((entry) => {
                    const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
                    return {
                        ts: typeof item.ts === "string" ? item.ts : "—",
                        type: typeof item.type === "string" ? item.type : "—",
                        summary: typeof item.summary === "string" ? item.summary : "—",
                    };
                }),
            );
            setKpi(mon.kpi && typeof mon.kpi === "object" ? (mon.kpi as Record<string, unknown>) : {});
            setProjectName(typeof details.name === "string" && details.name.trim() ? details.name.trim() : projectName);
            setLoad("ok");
        } catch (e) {
            setError(toUserMessage(e));
            setLoad("err");
        }
    }, [period, projectId, projectName]);

    useEffect(() => {
        if (!enterpriseId) return;
        void loadProjects();
    }, [enterpriseId, loadProjects]);

    useEffect(() => {
        if (!projectId) return;
        const match = projectOptions.find((p) => p.id === projectId);
        if (match) setProjectName(match.name);
        void fetchData();
    }, [projectId, period, fetchData, projectOptions]);

    const csvRows = useMemo(
        () => healthHistory.map((item) => `${item.date},${item.score != null ? item.score : ""}`),
        [healthHistory],
    );

    const handleExportPdf = useCallback(() => {
        window.print();
    }, []);

    const handleExportCsv = useCallback(() => {
        const csv = ["date,score", ...csvRows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rapport-${projectId}-${period}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [csvRows, period, projectId]);

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow="Synthèses · Manager"
            title={t("nav:managerNavReports")}
            description="Rapport projet via /workspace/manager/projects/:id/monitoring et /project/details."
            actions={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="text-xs font-medium text-tertiary">
                        Projet
                        <select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="mt-1 block min-w-48 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
                        >
                            {projectOptions.length === 0 ? <option value="">Aucun projet</option> : null}
                            {projectOptions.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs font-medium text-tertiary">
                        Période
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                            className="mt-1 block min-w-40 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
                        >
                            <option value="7d">7 jours</option>
                            <option value="30d">30 jours</option>
                            <option value="quarter">90 jours</option>
                        </select>
                    </label>
                    <Button color="secondary" size="sm" onClick={handleExportCsv}>
                        CSV
                    </Button>
                    <Button color="primary" size="sm" onClick={handleExportPdf}>
                        PDF
                    </Button>
                </div>
            }
        >
            {load === "loading" ? (
                <div className="flex min-h-48 items-center justify-center rounded-2xl border border-secondary bg-primary p-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("common:loading")} />
                </div>
            ) : null}

            {load === "err" ? (
                <div className="rounded-2xl border border-secondary bg-primary p-6">
                    <EmptyState size="md">
                        <EmptyState.Content>
                            <EmptyState.Title>Rapports indisponibles</EmptyState.Title>
                            <EmptyState.Description>{error}</EmptyState.Description>
                        </EmptyState.Content>
                        <EmptyState.Footer>
                            <Button color="secondary" size="sm" onClick={() => void fetchData()}>
                                {t("common:retry")}
                            </Button>
                        </EmptyState.Footer>
                    </EmptyState>
                </div>
            ) : null}

            {load === "ok" ? (
                <div className="space-y-6">
                    <section className="rounded-2xl border border-secondary bg-primary p-5">
                        <h2 className="text-sm font-semibold text-primary">KPIs · {projectName}</h2>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-secondary p-3">
                                <p className="text-xs text-tertiary">Progression</p>
                                <p className="mt-1 text-lg font-semibold text-primary">{String(kpi.progress_pct ?? "—")}%</p>
                            </div>
                            <div className="rounded-xl border border-secondary p-3">
                                <p className="text-xs text-tertiary">Retard</p>
                                <p className="mt-1 text-lg font-semibold text-primary">{String(kpi.delay_days ?? "—")} jours</p>
                            </div>
                            <div className="rounded-xl border border-secondary p-3">
                                <p className="text-xs text-tertiary">Charge capacité</p>
                                <p className="mt-1 text-lg font-semibold text-primary">{String(kpi.capacity_load_pct ?? "—")}%</p>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-secondary bg-primary p-5">
                        <h2 className="text-sm font-semibold text-primary">Historique de santé</h2>
                        {healthHistory.length === 0 ? (
                            <p className="mt-2 text-sm text-tertiary">Aucun point remonté.</p>
                        ) : (
                            <ul className="mt-2 space-y-2 text-sm">
                                {healthHistory.map((point, idx) => (
                                    <li key={`${point.date}-${idx}`} className="flex items-center justify-between rounded-lg border border-secondary px-3 py-2">
                                        <span className="text-secondary">{point.date}</span>
                                        <span className="font-semibold text-primary">{point.score != null ? point.score.toFixed(2) : "—"}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="rounded-2xl border border-secondary bg-primary p-5">
                        <h2 className="text-sm font-semibold text-primary">Événements</h2>
                        {events.length === 0 ? (
                            <p className="mt-2 text-sm text-tertiary">Aucun événement.</p>
                        ) : (
                            <ul className="mt-2 space-y-2 text-sm">
                                {events.map((event, idx) => (
                                    <li key={`${event.ts}-${idx}`} className="rounded-lg border border-secondary px-3 py-2">
                                        <p className="font-medium text-primary">{event.type}</p>
                                        <p className="text-secondary">{event.summary}</p>
                                        <p className="text-xs text-tertiary">{event.ts}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            ) : null}
        </WorkspacePageShell>
    );
}
