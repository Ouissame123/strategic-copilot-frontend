import { Link } from "react-router";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentWorkspacePageQuery } from "@/hooks/use-talent-workspace-page-query";
import { numOf, textOf } from "@/utils/talent-page-parsers";

function statusTone(status: string): string {
    const s = status.toLowerCase();
    if (s.includes("risk") || s.includes("retard")) return "bg-[#fffbeb] text-[#92400e]";
    if (s.includes("start") || s.includes("demarr")) return "bg-[#eff6ff] text-[#1d4ed8]";
    if (s.includes("term") || s.includes("done")) return "bg-[#f3f4f6] text-[#6b7280]";
    return "bg-[#eafaf3] text-[#15803d]";
}

function avatarInitials(row: Record<string, unknown>): string[] {
    const names = textOf(row, ["members", "team_members", "team"], "")
        .split(/[;,]/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 4);
    if (names.length === 0) return ["T"];
    return names.map((name) => name[0]?.toUpperCase() ?? "T");
}

export function TalentProjectsPage() {
    useCopilotPage("projects_list", "Talent Projects");
    const q = useTalentWorkspacePageQuery("projects");

    if (q.isLoading) {
        return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-xl bg-secondary" />)}</div>;
    }
    if (q.error) {
        return <ErrorState title="Projets indisponibles" message="Impossible de charger les projets talent." detail={q.error instanceof Error ? q.error.message : String(q.error)} onRetry={() => void q.refetch()} />;
    }

    const projects = q.data?.items ?? [];
    const active = projects.filter((row) => !/done|termine|completed/i.test(textOf(row, ["status"], ""))).length;
    const done = projects.length - active;
    const tabs = ["Tous", "En cours", "A risque", "Termines"];

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-[33px] font-semibold leading-none tracking-[-0.03em] text-[#18171e]">Mes projets</h1>
                    <p className="mt-2 text-sm text-[#6b6880]">{active} projets actifs · {done} termines</p>
                </div>
                <button type="button" className="rounded-lg bg-[#7c6ef5] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#5a4de0]">
                    + Nouveau projet
                </button>
            </header>

            <div className="inline-flex gap-1 rounded-lg bg-[#f7f6f3] p-1">
                {tabs.map((tab, i) => (
                    <button
                        key={tab}
                        type="button"
                        className={`rounded-md px-3 py-1.5 text-[12.5px] ${
                            i === 2
                                ? "bg-white font-medium text-[#18171e] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                                : "text-[#a09db5]"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {projects.length === 0 ? (
                <div className="rounded-xl border border-black/5 bg-white p-6 text-sm text-tertiary">Aucun projet disponible.</div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {projects.map((row, i) => {
                        const id = textOf(row, ["project_id", "id"], "");
                        const name = textOf(row, ["name", "title", "project_name"]);
                        const subtitle = textOf(row, ["client", "role", "project_role"], "");
                        const status = textOf(row, ["status"], "");
                        const due = textOf(row, ["due_date", "deadline"], "");
                        const progress = Math.max(0, Math.min(100, numOf(row, ["progress_pct", "progress", "completion_pct"]) ?? 0));
                        const progressLabel = textOf(row, ["progress_label"], progress ? `${progress}%` : "—");
                        const initials = avatarInitials(row);
                        return (
                            <div key={`project-${i}`} className="rounded-xl border border-black/5 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                                <div className="mb-1.5 flex items-start justify-between gap-2">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(status)}`}>{status || "N/A"}</span>
                                    <span className="text-xs text-[#a09db5]">{due || "—"}</span>
                                </div>
                                <p className="text-[14.5px] font-semibold text-[#18171e]">{name}</p>
                                <p className="mt-1 text-xs text-[#a09db5]">{subtitle || "—"}</p>
                                <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#f7f6f3]">
                                    <div className="h-full rounded-full bg-[#7c6ef5]" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center">
                                        {initials.map((initial, idx) => (
                                            <span
                                                key={`${initial}-${idx}`}
                                                className="-ml-1.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-[#7c6ef5] text-[9px] font-semibold text-white first:ml-0"
                                            >
                                                {initial}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-xs text-[#a09db5]">{progressLabel}</span>
                                </div>
                                {id ? (
                                    <Link to={`/workspace/talent/projects/${encodeURIComponent(id)}`} className="mt-2 inline-block text-[11px] font-semibold text-[#7c6ef5] underline">
                                        Ouvrir
                                    </Link>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
