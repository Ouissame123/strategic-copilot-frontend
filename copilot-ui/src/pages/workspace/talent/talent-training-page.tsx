import { TalentStatCard } from "@/components/talent/talent-stat-card";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentWorkspacePageQuery } from "@/hooks/use-talent-workspace-page-query";
import { numOf, textOf } from "@/utils/talent-page-parsers";

type TrainingRow = Record<string, unknown>;

function isDone(row: TrainingRow): boolean {
    const s = textOf(row, ["status", "state"], "").toLowerCase();
    return s.includes("done") || s.includes("complete") || s.includes("term");
}

function statusTone(status: string): string {
    const s = status.toLowerCase();
    if (s.includes("cert")) return "bg-[#eafaf3] text-[#15803d]";
    if (s.includes("actif") || s.includes("active") || s.includes("progress")) return "bg-[#ede9ff] text-[#5a4de0]";
    return "bg-[#eff6ff] text-[#1d4ed8]";
}

function progressColor(index: number): string {
    const palette = ["#22c27a", "#7c6ef5", "#3b82f6", "#a0a3bd"];
    return palette[index % palette.length]!;
}

export function TalentTrainingPage() {
    useCopilotPage("none", "Talent Trainings");
    const q = useTalentWorkspacePageQuery("trainings");

    if (q.isLoading) {
        return <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary" />)}</div>;
    }
    if (q.error) {
        return <ErrorState title="Formations indisponibles" message="Impossible de charger les formations talent." detail={q.error instanceof Error ? q.error.message : String(q.error)} onRetry={() => void q.refetch()} />;
    }

    const root = q.data?.root ?? {};
    const rows = (q.data?.items ?? []) as TrainingRow[];
    const activeRows = rows.filter((row) => !isDone(row));
    const doneRows = rows.filter((row) => isDone(row));
    const activeCount = activeRows.length;
    const availableCount = Math.max(0, rows.length - activeRows.length);
    const hoursCompleted = textOf(root, ["completed_hours", "hours_completed"], "—");
    const certifications = textOf(root, ["certifications_count", "certs_count"], "—");

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-[33px] font-semibold leading-none tracking-[-0.03em] text-[#18171e]">Mes formations</h1>
                    <p className="mt-2 text-sm text-[#6b6880]">
                        {activeCount} formations en cours · {availableCount} disponibles
                    </p>
                </div>
                <button type="button" className="rounded-lg bg-[#7c6ef5] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#5a4de0]">
                    Explorer le catalogue
                </button>
            </header>

            <div className="grid gap-3 md:grid-cols-2">
                <TalentStatCard label="Heures completees" value={hoursCompleted} hint={hoursCompleted !== "—" ? "Objectif annuel" : undefined} />
                <TalentStatCard label="Certifications obtenues" value={certifications} />
            </div>

            {rows.length === 0 ? (
                <div className="rounded-xl border border-black/5 bg-white p-6 text-sm text-tertiary">Aucune formation disponible.</div>
            ) : (
                <div className="space-y-5">
                    <section>
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.05em] text-[#6b6880]">En cours</h2>
                        <div className="space-y-2">
                            {activeRows.length === 0 ? (
                                <div className="rounded-xl border border-black/5 bg-white p-4 text-sm text-[#a09db5]">Aucune formation en cours.</div>
                            ) : (
                                activeRows.map((row, i) => {
                                    const title = textOf(row, ["title", "name", "course"]);
                                    const provider = textOf(row, ["provider", "source"], "");
                                    const progress = Math.max(0, Math.min(100, numOf(row, ["progress_pct", "progress"]) ?? 0));
                                    const progressLabel = textOf(row, ["progress_label"], progress ? `${progress}%` : "—");
                                    const status = textOf(row, ["status"], "Actif");
                                    return (
                                        <article key={`active-tr-${i}`} className="rounded-xl border border-black/5 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                                            <div className="flex items-start gap-3">
                                                <span className="mt-0.5 flex size-8 items-center justify-center rounded-md bg-[#f3f0ff] text-xs">📚</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[14.5px] font-semibold text-[#18171e]">{title}</p>
                                                    <p className="mt-0.5 text-xs text-[#a09db5]">{provider || "—"}</p>
                                                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#f7f6f3]">
                                                        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: progressColor(i) }} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[#6b6880]">{progressLabel}</span>
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(status)}`}>{status}</span>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section>
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.05em] text-[#6b6880]">Terminees recemment</h2>
                        <div className="space-y-2">
                            {doneRows.length === 0 ? (
                                <div className="rounded-xl border border-black/5 bg-white p-4 text-sm text-[#a09db5]">Aucune formation terminee.</div>
                            ) : (
                                doneRows.map((row, i) => {
                                    const title = textOf(row, ["title", "name", "course"]);
                                    const provider = textOf(row, ["provider", "source"], "");
                                    const status = textOf(row, ["status"], "Certifie");
                                    return (
                                        <article key={`done-tr-${i}`} className="rounded-xl border border-black/5 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                                            <div className="flex items-start gap-3">
                                                <span className="mt-0.5 flex size-8 items-center justify-center rounded-md bg-[#eafaf3] text-xs">🏅</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[14.5px] font-semibold text-[#18171e]">{title}</p>
                                                    <p className="mt-0.5 text-xs text-[#a09db5]">{provider || "—"}</p>
                                                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#f7f6f3]">
                                                        <div className="h-full w-full rounded-full bg-[#d1d5db]" />
                                                    </div>
                                                </div>
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(status)}`}>{status}</span>
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
