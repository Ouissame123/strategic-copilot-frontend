import type { DashboardMatchmakerSection } from "@/features/manager/types/dashboard-v3";
import { blocCardClass } from "../dashboard-v3-ui";

type MatchmakerBlocProps = {
    matchmaker: DashboardMatchmakerSection;
};

export function MatchmakerBloc({ matchmaker }: MatchmakerBlocProps) {
    const s = matchmaker.summary;

    return (
        <section className={blocCardClass()} id="dashboard-matchmaker">
            <header className="mb-4">
                <h3 className="text-base font-semibold text-ws-primary">Matchmaker</h3>
                <p className="mt-0.5 text-sm text-ws-muted">Agent compétences — gaps et talents disponibles</p>
            </header>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                    { label: "Projets scorés", value: s.projects_scored },
                    { label: "Match moy.", value: s.avg_match_score.toFixed(1) },
                    { label: "Gaps", value: s.total_skill_gaps },
                    { label: "Recrutement", value: s.needs_recruitment },
                    { label: "Redéployables", value: s.can_redeploy },
                ].map((kpi) => (
                    <div key={kpi.label} className="rounded-lg border border-[color:var(--ws-border)] bg-ws-muted-surface px-2 py-2 text-center">
                        <p className="text-lg font-semibold tabular-nums text-ws-primary">{kpi.value}</p>
                        <p className="text-[10px] text-ws-muted">{kpi.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ws-muted">Top skill gaps</h4>
                    {matchmaker.top_skill_gaps.length === 0 ? (
                        <p className="text-sm text-ws-muted">Aucun gap signalé</p>
                    ) : (
                        <ul className="space-y-2">
                            {matchmaker.top_skill_gaps.slice(0, 5).map((g) => (
                                <li key={`${g.skill_name}-${g.category}`} className="rounded-lg border border-[color:var(--ws-border)] px-3 py-2 text-xs">
                                    <p className="font-medium text-ws-primary">{g.skill_name}</p>
                                    <p className="text-ws-muted">
                                        {g.category || "—"} · {g.projects_affected} projet(s) · critique {g.critical_count} · écart moy.{" "}
                                        {g.avg_gap_size.toFixed(1)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ws-muted">Talents disponibles</h4>
                    {matchmaker.top_available_talents.length === 0 ? (
                        <p className="text-sm text-ws-muted">Aucun talent listé</p>
                    ) : (
                        <ul className="space-y-2">
                            {matchmaker.top_available_talents.slice(0, 5).map((tal) => (
                                <li key={tal.talent_id || tal.talent_name} className="rounded-lg border border-[color:var(--ws-border)] px-3 py-2 text-xs">
                                    <p className="font-medium text-ws-primary">{tal.talent_name}</p>
                                    <p className="text-ws-muted">
                                        {tal.job_title || "—"} · charge {Math.round(tal.current_load_pct)}%
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}
