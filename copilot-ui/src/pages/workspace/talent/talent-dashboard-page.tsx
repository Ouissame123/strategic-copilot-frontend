import { TalentSkillBar } from "@/components/talent/talent-skill-bar";
import { TalentStatCard } from "@/components/talent/talent-stat-card";
import { TalentWorkloadChart } from "@/components/talent/talent-workload-chart";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentWorkspacePageQuery } from "@/hooks/use-talent-workspace-page-query";
import { asRecord, numOf, textOf } from "@/utils/talent-page-parsers";

function statusBadgeTone(status: string): string {
    const s = status.toLowerCase();
    if (s.includes("risk") || s.includes("retard")) return "bg-[#fffbeb] text-[#92400e]";
    if (s.includes("start") || s.includes("demarr")) return "bg-[#eff6ff] text-[#1d4ed8]";
    if (s.includes("done") || s.includes("term")) return "bg-[#f3f4f6] text-[#6b7280]";
    return "bg-[#eafaf3] text-[#15803d]";
}

function taskBadgeTone(priority: string): string {
    const p = priority.toLowerCase();
    if (p.includes("urgent")) return "bg-[#fef2f2] text-[#991b1b]";
    if (p.includes("moyen") || p.includes("medium")) return "bg-[#fffbeb] text-[#92400e]";
    if (p.includes("fait") || p.includes("done")) return "bg-[#eafaf3] text-[#15803d]";
    return "bg-[#eff6ff] text-[#1d4ed8]";
}

export function TalentDashboardPage() {
    useCopilotPage("dashboard", "Talent Dashboard");
    const q = useTalentWorkspacePageQuery("dashboard");

    if (q.isLoading) {
        return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />)}</div>;
    }
    if (q.error) {
        return <ErrorState title="Dashboard indisponible" message="Impossible de charger les donnees du dashboard talent." detail={q.error instanceof Error ? q.error.message : String(q.error)} onRetry={() => void q.refetch()} />;
    }

    const root = q.data?.root ?? {};
    const items = q.data?.items ?? [];
    const kpis = asRecord(root.kpis ?? root.stats);
    const tasks = Array.isArray(root.tasks) ? (root.tasks as Array<Record<string, unknown>>) : [];
    const projects = Array.isArray(root.projects) ? (root.projects as Array<Record<string, unknown>>) : items;
    const skills = Array.isArray(root.skills) ? (root.skills as Array<Record<string, unknown>>) : [];
    const workloadSeries = Array.isArray(root.workload_series) ? (root.workload_series as Array<Record<string, unknown>>) : [];
    const subtitleName = textOf(root, ["first_name", "name", "full_name"], "");

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-primary">Mon dashboard</h1>
                    <p className="mt-1 text-sm text-secondary">
                        {subtitleName && subtitleName !== "—" ? `Bienvenue, ${subtitleName} · ` : ""}
                        Voici votre resume de la semaine
                    </p>
                </div>
                <button type="button" className="rounded-lg bg-[#7c6ef5] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#5a4de0]">
                    Nouvelle tache
                </button>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <TalentStatCard label="Projets actifs" value={textOf(kpis, ["active_projects", "projects_active"], String(projects.length))} />
                <TalentStatCard label="Taches en cours" value={textOf(kpis, ["open_tasks", "tasks_open"], String(tasks.length))} />
                <TalentStatCard label="Charge moyenne" value={textOf(kpis, ["average_workload", "workload_avg"], "—")} />
                <TalentStatCard label="Formations actives" value={textOf(kpis, ["active_trainings", "trainings_active"], "—")} />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-xl border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    <h2 className="text-sm font-semibold text-primary">Taches prioritaires</h2>
                    <div className="mt-3 space-y-1">
                        {tasks.length === 0 ? (
                            <p className="text-sm text-tertiary">Aucune tache prioritaire.</p>
                        ) : (
                            tasks.slice(0, 5).map((row, i) => {
                                const title = textOf(row, ["title", "name"]);
                                const due = textOf(row, ["due_date", "deadline"], "");
                                const priority = textOf(row, ["priority", "status"], "Normal");
                                const status = textOf(row, ["status"], "");
                                return (
                                    <div key={`task-row-${i}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#f7f6f3]">
                                        <div className="size-4 rounded-full border border-black/10" />
                                        <p className="min-w-0 flex-1 truncate text-[13.5px] text-[#18171e]">{title}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${taskBadgeTone(priority || status)}`}>
                                            {priority || status}
                                        </span>
                                        <span className="text-[11.5px] text-[#a09db5]">{due || "—"}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    <h2 className="text-sm font-semibold text-primary">Projets recents</h2>
                    {projects.length === 0 ? (
                        <p className="mt-3 text-sm text-tertiary">Aucun projet recu.</p>
                    ) : (
                        <div className="mt-2 overflow-x-auto">
                            <table className="w-full border-collapse text-[13px]">
                                <thead>
                                    <tr className="border-b border-black/5 text-left text-[11px] uppercase tracking-[0.05em] text-[#a09db5]">
                                        <th className="px-1 py-2 font-semibold">Projet</th>
                                        <th className="px-1 py-2 font-semibold">Avancement</th>
                                        <th className="px-1 py-2 font-semibold">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projects.slice(0, 4).map((row, i) => {
                                        const projectName = textOf(row, ["name", "title", "project_name"]);
                                        const progress = Math.max(0, Math.min(100, numOf(row, ["progress_pct", "progress"]) ?? 0));
                                        const status = textOf(row, ["status"], "N/A");
                                        return (
                                            <tr key={`recent-${i}`} className="border-b border-black/5 last:border-b-0">
                                                <td className="px-1 py-2.5 font-semibold text-[#18171e]">{projectName}</td>
                                                <td className="px-1 py-2.5">
                                                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#f7f6f3]">
                                                        <div className="h-full rounded-full bg-[#7c6ef5]" style={{ width: `${progress}%` }} />
                                                    </div>
                                                </td>
                                                <td className="px-1 py-2.5">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeTone(status)}`}>{status}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <TalentWorkloadChart
                    points={workloadSeries.map((row, i) => ({
                        label: textOf(row, ["label", "day"], `J${i + 1}`),
                        value: numOf(row, ["value", "load_pct", "workload_pct"]) ?? 0,
                    }))}
                />
                <section className="rounded-xl border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    <h2 className="text-sm font-semibold text-primary">Competences cles</h2>
                    <div className="mt-2">
                        {skills.length === 0 ? (
                            <p className="text-sm text-tertiary">Aucune competence disponible.</p>
                        ) : (
                            skills.slice(0, 4).map((row, i) => (
                                <TalentSkillBar
                                    key={`skill-${i}`}
                                    name={textOf(row, ["name", "skill_name"])}
                                    valuePct={numOf(row, ["score_pct", "level_pct", "value"])}
                                    valueLabel={textOf(row, ["score_label", "level"], "")}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
