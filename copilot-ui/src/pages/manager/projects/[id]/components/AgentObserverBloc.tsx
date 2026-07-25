import type { MissionControlLatestKpi, MissionControlRiskScores } from "@/types/api.types";
import { AgentBlocShell } from "./agent-bloc-shell";
import { useMissionControlT } from "../use-mission-control-i18n";

type KpiCardProps = { label: string; value: string; pct?: number | null; tone?: "ok" | "warn" | "danger" };

function KpiCard({ label, value, pct, tone = "ok" }: KpiCardProps) {
    const bar =
        tone === "danger" ? "bg-rose-500" : tone === "warn" ? "bg-amber-500" : "bg-emerald-500";
    return (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
            {pct != null ? (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className={bar} style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%" }} />
                </div>
            ) : null}
        </div>
    );
}

type AgentObserverBlocProps = {
    kpi: MissionControlLatestKpi | null;
    riskScores: MissionControlRiskScores | null;
};

const RISK_SCORE_KEYS = [
    "fragility_score",
    "anxiety_pulse",
    "key_talent_dependency_score",
    "critical_skills_gap_score",
] as const;

export function AgentObserverBloc({ kpi, riskScores }: AgentObserverBlocProps) {
    const { mc } = useMissionControlT();

    if (!kpi) {
        return (
            <AgentBlocShell agentNumber={1} title={mc("agents.observer")} active={false}>
                <p className="text-sm text-slate-500">{mc("kpi.noData")}</p>
            </AgentBlocShell>
        );
    }

    const load = kpi.capacity_load_pct;
    const loadTone = load == null ? "ok" : load > 100 ? "danger" : load >= 80 ? "warn" : "ok";

    return (
        <AgentBlocShell agentNumber={1} title={mc("agents.observer")} accentClass="bg-sky-100 text-sky-800">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard
                    label={mc("kpi.health")}
                    value={kpi.project_health_score != null ? String(Math.round(kpi.project_health_score)) : "—"}
                    pct={kpi.project_health_score}
                />
                <KpiCard
                    label={mc("kpi.progress")}
                    value={kpi.progress_pct != null ? `${Math.round(kpi.progress_pct)}%` : "—"}
                    pct={kpi.progress_pct}
                />
                <KpiCard
                    label={mc("kpi.capacity")}
                    value={load != null ? `${Math.round(load)}%` : "—"}
                    pct={load}
                    tone={loadTone}
                />
                <KpiCard
                    label={mc("kpi.delay")}
                    value={kpi.delay_days != null ? `${kpi.delay_days}j` : "—"}
                    tone={kpi.delay_days != null && kpi.delay_days > 0 ? "danger" : "ok"}
                />
            </div>
            {riskScores ? (
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
                    {RISK_SCORE_KEYS.map((key) => {
                        const val = riskScores[key];
                        return (
                            <div key={key} className="flex justify-between gap-2 border-b border-slate-100 pb-1 dark:border-slate-800">
                                <span className="truncate">{mc(`riskScores.${key}`)}</span>
                                <span className="shrink-0 font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                                    {val != null ? val.toFixed(1) : "—"}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </AgentBlocShell>
    );
}
