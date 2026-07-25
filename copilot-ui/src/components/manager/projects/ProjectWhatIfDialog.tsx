import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { useWhatIfSimulation } from "@/hooks/use-whatif-simulation";
import type { WhatIfResponse } from "@/api/whatif.types";
import type { ProjectListItem } from "@/types/api.types";
import { fmtScore, viabilityTextClass, normalizeCopilotDecision } from "./projects-list-ui";
import { cx } from "@/utils/cx";

type ProjectWhatIfDialogProps = {
    project: ProjectListItem;
    onClose: () => void;
};

export function ProjectWhatIfDialog({ project, onClose }: ProjectWhatIfDialogProps) {
    const { t } = useTranslation("common");
    const tw = (key: string, opts?: Record<string, string | number>) =>
        String(opts ? t(`managerWorkspace.projects.listWhatIf.${key}`, opts as never) : t(`managerWorkspace.projects.listWhatIf.${key}`));
    const [alloc, setAlloc] = useState(50);
    const [result, setResult] = useState<WhatIfResponse | null>(null);
    const simulation = useWhatIfSimulation();
    const ai = project.ai_recommendation;
    const score = ai?.viability_score ?? project.latest_viability_score;
    const decision = normalizeCopilotDecision(ai?.decision);

    const run = () => {
        simulation.mutate(
            {
                project_id: project.id,
                modifications: { allocation_pct: alloc, added_talent_id: null, training_skill_id: null },
            },
            {
                onSuccess: (data) => setResult(data),
                onError: () => setResult(null),
            },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-950">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-primary-700">{tw("title")}</p>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{project.name}</h4>
                        {score != null ? (
                            <p className="mt-0.5 text-[11px] text-slate-500">
                                {tw("currentScore", { score: fmtScore(score) ?? "—", decision: String(decision ?? "—") })}
                            </p>
                        ) : null}
                    </div>
                    <Button type="button" color="tertiary" size="sm" onClick={onClose} aria-label={tw("close")}>
                        ✕
                    </Button>
                </div>

                <div className="mb-4">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>{tw("allocationLabel")}</span>
                        <span className="text-sm font-bold text-primary-600">{alloc}%</span>
                    </div>
                    <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={alloc}
                        onChange={(e) => { setAlloc(Number(e.target.value)); setResult(null); }}
                        className="w-full accent-primary-600"
                    />
                    <div className="mt-0.5 flex justify-between text-[10px] text-slate-300">
                        <span>10%</span>
                        <span>100%</span>
                    </div>
                </div>

                <Button type="button" color="primary" size="md" className="w-full" onClick={run} isLoading={simulation.isPending}>
                    {simulation.isPending ? tw("simulating") : tw("simulateBtn")}
                </Button>

                {simulation.isError ? (
                    <p className="mt-3 text-center text-xs text-red-600">{tw("error")}</p>
                ) : null}

                {result ? (
                    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                            {[
                                { label: tw("scoreBefore"), value: fmtScore(result.score_before), className: "text-slate-500" },
                                { label: tw("scoreAfter"), value: fmtScore(result.score_after), className: viabilityTextClass(result.score_after) },
                                {
                                    label: tw("delta"),
                                    value: `${result.delta >= 0 ? "+" : ""}${fmtScore(result.delta)}`,
                                    className: result.delta >= 0 ? "text-emerald-600" : "text-red-600",
                                },
                            ].map((m) => (
                                <div key={m.label} className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-900/50">
                                    <div className={cx("text-lg font-extrabold tabular-nums", m.className)}>{m.value}</div>
                                    <div className="text-[10px] text-slate-400">{m.label}</div>
                                </div>
                            ))}
                        </div>
                        {result.decision_before && result.decision_after && result.decision_before !== result.decision_after ? (
                            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                                ⚡ {tw("decisionChanged")}: {result.decision_before} → {result.decision_after}
                            </p>
                        ) : null}
                        {result.scenario_summary || result.impact_explained ? (
                            <p className="rounded-lg border-l-[3px] border-primary-500 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                                {result.scenario_summary || result.impact_explained}
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
