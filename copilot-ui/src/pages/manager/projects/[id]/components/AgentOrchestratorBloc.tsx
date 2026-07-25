import type { MissionControlAiRecommendation, MissionControlLatestViability } from "@/types/api.types";
import { AgentBlocShell } from "./agent-bloc-shell";
import { useMissionControlT } from "../use-mission-control-i18n";
import { cx } from "@/utils/cx";

type AgentOrchestratorBlocProps = {
    ai: MissionControlAiRecommendation | null;
    viability: MissionControlLatestViability | null;
    onSimulate?: () => void;
};

function scoreColor(score: number): string {
    if (score < 4) return "text-rose-600";
    if (score <= 6.5) return "text-amber-600";
    return "text-emerald-600";
}

const AXIS_KEYS = ["skills", "capacity", "budget", "risk"] as const;

export function AgentOrchestratorBloc({ ai, viability, onSimulate }: AgentOrchestratorBlocProps) {
    const { mc } = useMissionControlT();
    const score = ai?.viability_score ?? viability?.viability_score ?? null;

    if (!ai && !viability) {
        return (
            <AgentBlocShell agentNumber={7} title={mc("agents.orchestrator")} active={false}>
                <p className="text-sm text-slate-500">{mc("agents.noData")}</p>
            </AgentBlocShell>
        );
    }

    const axisValues: Record<(typeof AXIS_KEYS)[number], number | null | undefined> = {
        skills: viability?.score_skills_fit,
        capacity: viability?.score_capacity,
        budget: viability?.score_budget,
        risk: viability?.score_risk,
    };

    return (
        <AgentBlocShell agentNumber={7} title={mc("agents.orchestrator")} accentClass="bg-violet-100 text-violet-800">
            <div className="flex flex-wrap gap-4">
                {score != null ? (
                    <div className="flex size-[72px] shrink-0 items-center justify-center rounded-full border-4 border-violet-200 bg-white dark:border-violet-800 dark:bg-slate-900">
                        <span className={cx("text-xl font-bold tabular-nums", scoreColor(score))}>{score.toFixed(1)}</span>
                    </div>
                ) : null}
                <div className="min-w-0 flex-1 space-y-2">
                    {ai?.decision_label ? (
                        <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                            {ai.decision_label}
                        </span>
                    ) : null}
                    {ai?.reason_label ? <p className="text-xs text-slate-500">{ai.reason_label}</p> : null}
                    {AXIS_KEYS.map((axis) => {
                        const value = axisValues[axis];
                        return (
                            <div key={axis}>
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>{mc(`viabilityAxes.${axis}`)}</span>
                                    <span>{value != null ? value.toFixed(1) : "—"}</span>
                                </div>
                                <div className="mt-0.5 h-1 rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                        className="h-1 rounded-full bg-violet-500"
                                        style={{ width: `${Math.min(100, ((value ?? 0) / 10) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {ai?.explanation ? (
                <blockquote className="mt-4 border-l-4 border-violet-400 bg-violet-50/50 px-3 py-2 text-sm text-slate-700 dark:bg-violet-950/20 dark:text-slate-300">
                    {ai.explanation}
                    <footer className="mt-2 text-[10px] text-slate-400">{mc("whatIf.llmSource")}</footer>
                </blockquote>
            ) : null}
            {onSimulate ? (
                <button
                    type="button"
                    onClick={onSimulate}
                    className="mt-3 w-full rounded-lg border border-violet-200 bg-white py-2 text-xs font-semibold text-violet-800 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200 dark:hover:bg-violet-950/40"
                >
                    {mc("actions.simulate")}
                </button>
            ) : null}
        </AgentBlocShell>
    );
}
