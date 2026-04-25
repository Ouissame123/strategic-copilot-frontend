import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentWorkspacePageQuery } from "@/hooks/use-talent-workspace-page-query";
import { textOf } from "@/utils/talent-page-parsers";

type TaskRow = Record<string, unknown>;

function isDone(row: TaskRow): boolean {
    const s = textOf(row, ["status", "state"], "").toLowerCase();
    return s.includes("done") || s.includes("term") || s.includes("completed") || s.includes("closed");
}

function isUrgent(row: TaskRow): boolean {
    const p = textOf(row, ["priority", "urgency"], "").toLowerCase();
    return p.includes("urgent") || p.includes("high") || p.includes("crit");
}

function badgeTone(label: string): string {
    const v = label.toLowerCase();
    if (v.includes("urgent")) return "bg-[#fef2f2] text-[#991b1b]";
    if (v.includes("moyen") || v.includes("medium")) return "bg-[#fffbeb] text-[#92400e]";
    if (v.includes("formation")) return "bg-[#ede9ff] text-[#5a4de0]";
    if (v.includes("fait") || v.includes("done")) return "bg-[#eafaf3] text-[#15803d]";
    return "bg-[#eff6ff] text-[#1d4ed8]";
}

function TaskLine({ row }: { row: TaskRow }) {
    const title = textOf(row, ["title", "name", "label"]);
    const project = textOf(row, ["project_name", "project"], "");
    const due = textOf(row, ["due_date", "deadline", "due_at"], "");
    const done = isDone(row);
    const priority = textOf(row, ["priority"], done ? "Fait" : "Normal");

    return (
        <div className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-[#f7f6f3]">
            <div className={`mt-1 size-4 rounded-full border ${done ? "border-[#22c27a] bg-[#22c27a]" : "border-black/10"}`} />
            <div className="min-w-0 flex-1">
                <p className={`truncate text-[13.5px] ${done ? "text-[#a09db5] line-through" : "text-[#18171e]"}`}>{title}</p>
                <p className="mt-0.5 text-[11.5px] text-[#a09db5]">
                    {[project, due].filter(Boolean).join(" · ") || "—"}
                </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeTone(priority)}`}>{priority}</span>
        </div>
    );
}

export function TalentTasksPage() {
    useCopilotPage("projects_list", "Talent Tasks");
    const q = useTalentWorkspacePageQuery("tasks");

    if (q.isLoading) {
        return <div className="space-y-2">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />)}</div>;
    }
    if (q.error) {
        return <ErrorState title="Taches indisponibles" message="Impossible de charger les taches talent." detail={q.error instanceof Error ? q.error.message : String(q.error)} onRetry={() => void q.refetch()} />;
    }

    const rows = (q.data?.items ?? []) as TaskRow[];
    const urgentRows = rows.filter((row) => !isDone(row) && isUrgent(row));
    const activeRows = rows.filter((row) => !isDone(row) && !isUrgent(row));
    const doneRows = rows.filter((row) => isDone(row));
    const tabs = ["Toutes", "Urgentes", "Aujourd'hui", "Cette semaine", "Terminees"];

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-[33px] font-semibold leading-none tracking-[-0.03em] text-[#18171e]">Mes taches</h1>
                    <p className="mt-2 text-sm text-[#6b6880]">{activeRows.length + urgentRows.length} taches actives · {urgentRows.length} prioritaires</p>
                </div>
                <button type="button" className="rounded-lg bg-[#7c6ef5] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#5a4de0]">
                    + Nouvelle tache
                </button>
            </header>

            <div className="inline-flex gap-1 rounded-lg bg-[#f7f6f3] p-1">
                {tabs.map((tab, i) => (
                    <button
                        key={tab}
                        type="button"
                        className={`rounded-md px-3 py-1.5 text-[12.5px] ${
                            i === 0
                                ? "bg-white font-medium text-[#18171e] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                                : "text-[#a09db5]"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {rows.length === 0 ? (
                <div className="rounded-xl border border-black/5 bg-white p-6 text-sm text-tertiary">Aucune tache disponible.</div>
            ) : (
                <div className="space-y-4">
                    <section className="rounded-xl border border-black/5 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.05em] text-[#6b6880]">Urgentes</h2>
                        {urgentRows.length === 0 ? <p className="px-3 py-2 text-sm text-[#a09db5]">Aucune tache urgente.</p> : urgentRows.map((row, i) => <TaskLine key={`urgent-${i}`} row={row} />)}
                    </section>

                    <section className="rounded-xl border border-black/5 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.05em] text-[#6b6880]">Cette semaine</h2>
                        {activeRows.length === 0 ? <p className="px-3 py-2 text-sm text-[#a09db5]">Aucune tache en cours.</p> : activeRows.map((row, i) => <TaskLine key={`active-${i}`} row={row} />)}
                    </section>

                    <section className="rounded-xl border border-black/5 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.05em] text-[#6b6880]">Recemment terminees</h2>
                        {doneRows.length === 0 ? <p className="px-3 py-2 text-sm text-[#a09db5]">Aucune tache terminee.</p> : doneRows.map((row, i) => <TaskLine key={`done-${i}`} row={row} />)}
                    </section>
                </div>
            )}
        </div>
    );
}
