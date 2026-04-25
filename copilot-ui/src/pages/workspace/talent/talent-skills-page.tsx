import { TalentStatCard } from "@/components/talent/talent-stat-card";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentWorkspacePageQuery } from "@/hooks/use-talent-workspace-page-query";
import { numOf, textOf } from "@/utils/talent-page-parsers";

type SkillRow = Record<string, unknown>;

function skillCategory(row: SkillRow): string {
    const raw = textOf(row, ["category", "skill_category", "type"], "");
    return raw.toLowerCase();
}

function barColor(index: number): string {
    const palette = ["#7c6ef5", "#22c27a", "#f59e0b", "#3b82f6", "#ef4444"];
    return palette[index % palette.length]!;
}

function recTone(kind: string): string {
    const k = kind.toLowerCase();
    if (k.includes("renfor")) return "bg-[#fef2f2] border-[#fecaca]";
    if (k.includes("progress")) return "bg-[#fffbeb] border-[#fde68a]";
    return "bg-[#eafaf3] border-[#bbf7d0]";
}

export function TalentSkillsPage() {
    useCopilotPage("none", "Talent Skills");
    const q = useTalentWorkspacePageQuery("skills");

    if (q.isLoading) {
        return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />)}</div>;
    }
    if (q.error) {
        return <ErrorState title="Competences indisponibles" message="Impossible de charger les competences talent." detail={q.error instanceof Error ? q.error.message : String(q.error)} onRetry={() => void q.refetch()} />;
    }

    const root = q.data?.root ?? {};
    const skills = (q.data?.items ?? (Array.isArray(root.skills) ? (root.skills as Array<Record<string, unknown>>) : [])) as SkillRow[];
    const managerial = skills.filter((row) => skillCategory(row).includes("manag"));
    const technical = skills.filter((row) => !skillCategory(row).includes("manag"));
    const leftCol = managerial.length > 0 ? managerial : skills.slice(0, Math.ceil(skills.length / 2));
    const rightCol = technical.length > 0 ? technical : skills.slice(Math.ceil(skills.length / 2));
    const recommendations = Array.isArray(root.recommendations)
        ? (root.recommendations as SkillRow[])
        : Array.isArray(root.skill_recommendations)
          ? (root.skill_recommendations as SkillRow[])
          : [];
    const globalScore = textOf(root, ["score_global", "global_score", "score"], "—");
    const mastered = textOf(root, ["mastered_count", "skills_mastered"], "—");
    const toDevelop = textOf(root, ["to_develop_count", "skills_to_develop"], "—");

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-[33px] font-semibold leading-none tracking-[-0.03em] text-[#18171e]">Mes competences</h1>
                    <p className="mt-2 text-sm text-[#6b6880]">Niveaux et progression des competences.</p>
                </div>
                <button type="button" className="rounded-lg bg-[#7c6ef5] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#5a4de0]">
                    Demander une evaluation
                </button>
            </header>

            <div className="grid gap-3 md:grid-cols-3">
                <TalentStatCard label="Score global" value={globalScore} hint={globalScore !== "—" ? "Mise a jour automatique" : undefined} />
                <TalentStatCard label="Competences maitrisees" value={mastered} />
                <TalentStatCard label="A developper" value={toDevelop} />
            </div>

            {skills.length === 0 ? (
                <div className="rounded-xl border border-black/5 bg-white p-6 text-sm text-tertiary">Aucune competence disponible.</div>
            ) : (
                <>
                    <div className="grid gap-4 xl:grid-cols-2">
                        <section className="rounded-xl border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.05em] text-[#6b6880]">Competences manageriales</h2>
                            {leftCol.length === 0 ? (
                                <p className="text-sm text-[#a09db5]">Aucune entree.</p>
                            ) : (
                                leftCol.map((row, i) => {
                                    const pct = Math.max(0, Math.min(100, numOf(row, ["score_pct", "level_pct", "progress_pct", "value"]) ?? 0));
                                    const name = textOf(row, ["name", "skill_name", "title"]);
                                    const label = textOf(row, ["level", "score_label"], pct ? `${pct}%` : "—");
                                    return (
                                        <div key={`left-${i}`} className="border-b border-black/5 py-2.5 last:border-b-0">
                                            <div className="flex items-center gap-2">
                                                <span className="flex size-7 items-center justify-center rounded-md bg-[#f3f0ff] text-[12px]">⚙</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13.5px] font-medium text-[#18171e]">{name}</p>
                                                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#f7f6f3]">
                                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor(i) }} />
                                                    </div>
                                                </div>
                                                <span className="text-xs font-semibold text-[#6b6880]">{label}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </section>

                        <section className="rounded-xl border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.05em] text-[#6b6880]">Competences techniques</h2>
                            {rightCol.length === 0 ? (
                                <p className="text-sm text-[#a09db5]">Aucune entree.</p>
                            ) : (
                                rightCol.map((row, i) => {
                                    const pct = Math.max(0, Math.min(100, numOf(row, ["score_pct", "level_pct", "progress_pct", "value"]) ?? 0));
                                    const name = textOf(row, ["name", "skill_name", "title"]);
                                    const label = textOf(row, ["level", "score_label"], pct ? `${pct}%` : "—");
                                    return (
                                        <div key={`right-${i}`} className="border-b border-black/5 py-2.5 last:border-b-0">
                                            <div className="flex items-center gap-2">
                                                <span className="flex size-7 items-center justify-center rounded-md bg-[#eff6ff] text-[12px]">◆</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13.5px] font-medium text-[#18171e]">{name}</p>
                                                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#f7f6f3]">
                                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor(i + 2) }} />
                                                    </div>
                                                </div>
                                                <span className="text-xs font-semibold text-[#6b6880]">{label}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </section>
                    </div>

                    <section className="rounded-xl border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.05em] text-[#6b6880]">Recommandations de developpement</h2>
                        {recommendations.length === 0 ? (
                            <p className="text-sm text-[#a09db5]">Aucune recommandation disponible.</p>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-3">
                                {recommendations.slice(0, 3).map((row, i) => {
                                    const type = textOf(row, ["type", "category", "kind"], i === 0 ? "A renforcer" : i === 1 ? "En progression" : "Quasi maitrise");
                                    const skill = textOf(row, ["skill", "name", "title"]);
                                    const note = textOf(row, ["note", "recommendation", "description"], "");
                                    return (
                                        <article key={`rec-${i}`} className={`rounded-lg border p-3 ${recTone(type)}`}>
                                            <p className="text-xs font-semibold text-[#6b6880]">{type}</p>
                                            <p className="mt-1 text-[15px] font-semibold text-[#18171e]">{skill}</p>
                                            <p className="mt-1 text-xs text-[#6b6880]">{note || "—"}</p>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
