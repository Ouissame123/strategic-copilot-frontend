import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { useWhatIfSimulation } from "@/hooks/use-whatif-simulation";
import type { ProjectStateItem } from "@/features/manager/types/dashboard-v3";
import type { WhatIfResponse } from "@/api/whatif.types";
import { cx } from "@/utils/cx";

type WhatIfPanelProps = {
    project: ProjectStateItem;
    onClose: () => void;
};

export function WhatIfPanel({ project, onClose }: WhatIfPanelProps) {
    const { t } = useTranslation("common");
    const tw = (key: string) => t(`managerWorkspace.dashboard.whatIf.${key}`);
    const [allocation, setAllocation] = useState("20");
    const [result, setResult] = useState<WhatIfResponse | null>(null);
    const simulation = useWhatIfSimulation();

    const run = () => {
        const pct = Number(allocation);
        if (!Number.isFinite(pct) || pct <= 0) return;
        simulation.mutate(
            {
                project_id: project.id,
                modifications: { allocation_pct: pct, added_talent_id: null, training_skill_id: null },
            },
            { onSuccess: (data) => setResult(data) },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal>
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[color:var(--ws-border)] bg-ws-card p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h4 className="text-base font-semibold text-ws-primary">{tw("title")}</h4>
                        <p className="text-sm text-ws-muted">{project.name}</p>
                        <p className="mt-1 text-[11px] text-ws-muted">
                            Simulation uniquement — aucune écriture métier, pas de confirmation requise.
                        </p>
                    </div>
                    <Button type="button" color="tertiary" size="sm" onClick={onClose}>
                        Fermer
                    </Button>
                </div>

                <label className="mt-4 block text-sm font-medium text-ws-primary">
                    {tw("allocationLabel")}
                    <input
                        type="range"
                        min={10}
                        max={100}
                        value={allocation}
                        onChange={(e) => setAllocation(e.target.value)}
                        className="mt-2 w-full"
                    />
                    <span className="text-xs text-ws-muted">{allocation}%</span>
                </label>

                <Button type="button" color="primary" size="sm" className="mt-4" onClick={run} isLoading={simulation.isPending}>
                    {tw("simulateBtn")}
                </Button>

                {result ? (
                    <div className="mt-4 space-y-2 rounded-lg border border-[color:var(--ws-border)] bg-ws-muted-surface p-3 text-sm">
                        <div className="flex flex-wrap gap-4 tabular-nums">
                            <span>
                                {tw("scoreBefore")}: {result.score_before?.toFixed(1)}
                            </span>
                            <span>
                                {tw("scoreAfter")}: {result.score_after?.toFixed(1)}
                            </span>
                            <span className={cx(result.delta >= 0 ? "text-emerald-700" : "text-red-700")}>
                                {tw("delta")}: {result.delta >= 0 ? "+" : ""}
                                {result.delta?.toFixed(1)}
                            </span>
                        </div>
                        {result.scenario_summary || result.impact_explained ? (
                            <p className="text-ws-muted">{result.scenario_summary || result.impact_explained}</p>
                        ) : null}
                        {result.decision_before && result.decision_after && result.decision_before !== result.decision_after ? (
                            <p className="font-medium text-amber-700">
                                {tw("decisionChanged")}: {result.decision_before} → {result.decision_after}
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
