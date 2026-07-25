import type { DashboardAnalystSection, DashboardTeam } from "@/features/manager/types/dashboard-v3";
import {
    NINE_BOX_GRID_LAYOUT,
    normalizeBoxLabel,
    type NineBoxBackendLabel,
} from "@/lib/nine-box-dashboard";
import { blocCardClass } from "../dashboard-v3-ui";

type AnalystTeamBlocProps = {
    team: DashboardTeam;
    analyst: DashboardAnalystSection;
};

function NineBoxMini({ distribution }: { distribution: DashboardAnalystSection["nine_box_distribution"] }) {
    const counts = new Map<string, number>();
    for (const cell of distribution) {
        counts.set(normalizeBoxLabel(cell.box_label), cell.count);
    }

    return (
        <div className="grid grid-cols-3 gap-1" aria-label="Nine-box distribution">
            {NINE_BOX_GRID_LAYOUT.flat().map((label: NineBoxBackendLabel) => {
                const count = counts.get(label) ?? 0;
                return (
                    <div
                        key={label}
                        title={label}
                        className="flex min-h-[44px] flex-col items-center justify-center rounded border border-[color:var(--ws-border)] bg-ws-muted-surface px-1 py-1 text-center"
                    >
                        <span className="text-sm font-semibold tabular-nums text-ws-primary">{count}</span>
                        <span className="truncate text-[9px] text-ws-muted">{label.replace(/_/g, " ")}</span>
                    </div>
                );
            })}
        </div>
    );
}

export function AnalystTeamBloc({ team, analyst }: AnalystTeamBlocProps) {
    const s = analyst.summary;
    const talents = analyst.at_risk_talents.slice(0, 5);

    return (
        <section className={blocCardClass()} id="dashboard-analyst">
            <header className="mb-4">
                <h3 className="text-base font-semibold text-ws-primary">Équipe & Analyst</h3>
                <p className="mt-0.5 text-sm text-ws-muted">Signaux IPI, mobilité et nine-box</p>
            </header>

            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-xl font-bold tabular-nums text-ws-primary">{team.total}</p>
                    <p className="text-[11px] text-ws-muted">Total</p>
                </div>
                <div>
                    <p className={`text-xl font-bold tabular-nums ${team.overloaded > 0 ? "text-amber-600" : "text-ws-primary"}`}>
                        {team.overloaded}
                    </p>
                    <p className="text-[11px] text-ws-muted">Surchargés</p>
                </div>
                <div>
                    <p className={`text-xl font-bold tabular-nums ${team.contract_ending_90d > 0 ? "text-red-600" : "text-ws-primary"}`}>
                        {team.contract_ending_90d}
                    </p>
                    <p className="text-[11px] text-ws-muted">Contrats &lt; 90j</p>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                    { label: "IPI moy.", value: s.ipi_avg.toFixed(1) },
                    { label: "IPI top", value: s.ipi_top.toFixed(1) },
                    { label: "IPI à risque", value: s.ipi_at_risk },
                    { label: "Taille analyste", value: s.team_size },
                    { label: "Mob. stable", value: s.mob_stable },
                    { label: "Mob. watch", value: s.mob_watch },
                    { label: "Mob. risk", value: s.mob_at_risk },
                    { label: "9box ★ / crit.", value: `${s.ninebox_stars}/${s.ninebox_critical}` },
                ].map((kpi) => (
                    <div key={kpi.label} className="rounded-lg bg-ws-muted-surface px-2 py-2 text-center">
                        <p className="text-sm font-semibold tabular-nums text-ws-primary">{kpi.value}</p>
                        <p className="text-[10px] text-ws-muted">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {analyst.nine_box_distribution.length > 0 ? (
                <div className="mb-4">
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ws-muted">Nine-box</h4>
                    <NineBoxMini distribution={analyst.nine_box_distribution} />
                </div>
            ) : null}

            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ws-muted">Talents à risque</h4>
            {talents.length === 0 ? (
                <p className="text-sm text-ws-muted">Équipe stable — aucun signal critique</p>
            ) : (
                <ul className="space-y-2">
                    {talents.map((tal) => (
                        <li key={tal.talent_id || tal.talent_name} className="rounded-lg border border-[color:var(--ws-border)] px-3 py-2 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-ws-primary">{tal.talent_name}</span>
                                <span className="rounded bg-ws-muted-surface px-1.5 py-0.5 text-[10px]">{tal.ipi_band}</span>
                                <span className="text-ws-muted">{tal.mobility_flag}</span>
                                {tal.has_watchdog_alert ? (
                                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800">watchdog</span>
                                ) : null}
                                {tal.contract_risk ? (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                        contrat {tal.contract_risk}
                                    </span>
                                ) : null}
                            </div>
                            <p className="mt-1 text-ws-muted">
                                IPI {tal.ipi_score != null ? tal.ipi_score.toFixed(1) : "—"} · mobilité{" "}
                                {tal.mobility_score != null ? tal.mobility_score.toFixed(1) : "—"}
                                {tal.box_label ? ` · ${tal.box_label}` : ""}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
