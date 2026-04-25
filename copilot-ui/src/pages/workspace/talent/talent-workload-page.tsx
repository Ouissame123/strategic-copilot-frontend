import { TalentStatCard } from "@/components/talent/talent-stat-card";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentWorkspacePageQuery } from "@/hooks/use-talent-workspace-page-query";
import { numOf, textOf } from "@/utils/talent-page-parsers";

function dayBarColor(value: number): string {
    if (value > 85) return "#f98e8e";
    if (value >= 75) return "#7872f8";
    return "#7ce7b3";
}

function projectBarColor(index: number): string {
    const palette = ["#7c6ef5", "#f59e0b", "#3b82f6", "#22c27a", "#a0a3bd"];
    return palette[index % palette.length]!;
}

export function TalentWorkloadPage() {
    useCopilotPage("none", "Talent Workload");
    const q = useTalentWorkspacePageQuery("workload");

    if (q.isLoading) {
        return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />)}</div>;
    }
    if (q.error) {
        return <ErrorState title="Charge indisponible" message="Impossible de charger la charge talent." detail={q.error instanceof Error ? q.error.message : String(q.error)} onRetry={() => void q.refetch()} />;
    }

    const root = q.data?.root ?? {};
    const rows = q.data?.items ?? [];
    const series = Array.isArray(root.series) ? (root.series as Array<Record<string, unknown>>) : rows;
    const weekLabel = textOf(root, ["week_label", "period_label", "date_range"], "");
    const workloadAverage = textOf(root, ["average_workload", "workload_avg"], "—");
    const overloadedDayLabel = textOf(root, ["overloaded_day_label", "peak_day"], "");

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-[33px] font-semibold leading-none tracking-[-0.03em] text-[#18171e]">Ma charge de travail</h1>
                    <p className="mt-2 text-sm text-[#6b6880]">{weekLabel && weekLabel !== "—" ? weekLabel : "Semaine en cours"} · Charge moyenne: {workloadAverage}</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[#18171e]">
                        ‹ Semaine prec.
                    </button>
                    <button type="button" className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[#18171e]">
                        Semaine suiv. ›
                    </button>
                </div>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <TalentStatCard label="Heures planifiees" value={textOf(root, ["planned_hours", "hours_planned"], "—")} />
                <TalentStatCard label="Charge moyenne" value={workloadAverage} />
                <TalentStatCard label="Jours surcharges" value={textOf(root, ["overloaded_days"], "—")} hint={overloadedDayLabel && overloadedDayLabel !== "—" ? overloadedDayLabel : undefined} />
                <TalentStatCard label="Projets concernes" value={textOf(root, ["projects_count"], String(rows.length))} />
            </div>

            <section className="rounded-xl border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-[#6b6880]">Repartition journaliere</h2>
                {series.length === 0 ? (
                    <p className="mt-3 text-sm text-[#a09db5]">Aucune serie disponible.</p>
                ) : (
                    <>
                        <div className="mt-4 grid gap-2 md:grid-cols-5">
                            {series.slice(0, 5).map((row, i) => {
                                const value = Math.max(0, Math.min(100, numOf(row, ["value", "workload_pct", "load_pct"]) ?? 0));
                                const label = textOf(row, ["label", "day"], `J${i + 1}`);
                                return (
                                    <div key={`day-${i}`} className="text-center">
                                        <p className="mb-1 text-xs font-semibold" style={{ color: dayBarColor(value) }}>
                                            {value}%
                                        </p>
                                        <div
                                            className="w-full rounded-md"
                                            style={{
                                                height: 96,
                                                backgroundColor: dayBarColor(value),
                                                opacity: value > 85 ? 0.9 : value >= 75 ? 1 : 0.95,
                                            }}
                                        />
                                        <p className="mt-2 text-xs text-[#a09db5]">{label}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-5 text-xs text-[#6b6880]">
                            <span className="inline-flex items-center gap-2">
                                <span className="size-2 rounded-full bg-[#7ce7b3]" />
                                Normal (&lt;75%)
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <span className="size-2 rounded-full bg-[#7872f8]" />
                                Optimal (75-85%)
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <span className="size-2 rounded-full bg-[#f98e8e]" />
                                Surcharge (&gt;85%)
                            </span>
                        </div>
                    </>
                )}
            </section>

            <section className="rounded-xl border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-[#6b6880]">Repartition par projet</h2>
                {rows.length === 0 ? (
                    <p className="mt-3 text-sm text-[#a09db5]">Aucune repartition disponible.</p>
                ) : (
                    <ul className="mt-4 space-y-4">
                        {rows.map((row, i) => {
                            const pct = Math.max(0, Math.min(100, numOf(row, ["allocation_pct", "load_pct", "pct"]) ?? 0));
                            const hours = textOf(row, ["hours", "planned_hours", "hours_allocated"], "");
                            return (
                                <li key={`work-${i}`}>
                                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                                        <span className="font-medium text-[#18171e]">{textOf(row, ["project_name", "name", "title"])}</span>
                                        <span className="font-semibold text-[#18171e]">
                                            {hours && hours !== "—" ? `${hours} · ` : ""}
                                            {pct}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-[#f7f6f3]">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: projectBarColor(i) }} />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}
