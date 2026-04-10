import { useState } from "react";
import type { WhatIfPayload, WhatIfResult } from "@/hooks/use-project";
import { Button } from "@/components/base/buttons/button";
import { getDecisionConfig } from "@/utils/decisionConfig";
import { cx } from "@/utils/cx";

export interface WhatIfSimulatorProps {
    projectId: string;
    onRun: (payload: WhatIfPayload) => Promise<WhatIfResult | null>;
    className?: string;
}

export function WhatIfSimulator({ projectId, onRun, className }: WhatIfSimulatorProps) {
    const [allocationPct, setAllocationPct] = useState<string>("");
    const [talentId, setTalentId] = useState<string>("");
    const [skillId, setSkillId] = useState<string>("");
    const [result, setResult] = useState<WhatIfResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setResult(null);
        setIsRunning(true);
        try {
            const payload: WhatIfPayload = { project_id: projectId };
            const pct = Number(allocationPct);
            if (talentId.trim() && Number.isFinite(pct)) {
                payload.allocation_changes = [{ talent_id: talentId.trim(), new_allocation_pct: pct }];
            }
            if (talentId.trim() && !allocationPct) {
                payload.add_talent = { talent_id: talentId.trim(), allocation_pct: 50 };
            }
            if (skillId.trim()) {
                payload.simulate_training = { skill_id: skillId.trim() };
            }
            const res = await onRun(payload);
            setResult(res ?? null);
        } finally {
            setIsRunning(false);
        }
    };

    const config = result ? getDecisionConfig(result.decision) : null;

    return (
        <section className={cx("rounded-xl border border-secondary bg-primary p-5 shadow-xs md:p-6", className)}>
            <h2 className="text-lg font-semibold text-primary">Simulation What-if</h2>
            <p className="mt-1 text-sm text-tertiary">Modifier allocation, ajouter un talent ou simuler une formation. POST /api/project/what-if</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                    <label className="text-sm font-medium text-secondary">Talent ID (optionnel)</label>
                    <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-focus-ring"
                        placeholder="ID talent"
                        value={talentId}
                        onChange={(e) => setTalentId(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-secondary">Nouvelle allocation % (optionnel)</label>
                    <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-focus-ring"
                        placeholder="Ex: 30"
                        value={allocationPct}
                        onChange={(e) => setAllocationPct(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-secondary">Skill ID formation (optionnel)</label>
                    <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-focus-ring"
                        placeholder="ID competence"
                        value={skillId}
                        onChange={(e) => setSkillId(e.target.value)}
                    />
                </div>
                <Button type="submit" color="primary" isLoading={isRunning} isDisabled={isRunning}>
                    Lancer la simulation
                </Button>
            </form>

            {result && (
                <div className="mt-6 rounded-lg border border-secondary bg-secondary p-4">
                    <p className="text-sm font-medium text-secondary">Résultat</p>
                    <p className="mt-2 text-md font-semibold text-primary">Nouveau score : {result.new_score.toFixed(1)} (delta {result.delta >= 0 ? "+" : ""}{result.delta.toFixed(1)})</p>
                    <p className={cx("mt-1 text-sm font-medium", config?.color === "success" && "text-success-primary", config?.color === "warning" && "text-warning-primary", config?.color === "error" && "text-error-primary")}>
                        Décision : {result.decision}
                    </p>
                    {result.impact_explanation && <p className="mt-2 text-sm text-tertiary">{result.impact_explanation}</p>}
                </div>
            )}
        </section>
    );
}
