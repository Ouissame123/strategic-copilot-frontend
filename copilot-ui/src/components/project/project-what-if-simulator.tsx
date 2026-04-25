import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";

export type WhatIfResult = {
    score_before?: unknown;
    score_after?: unknown;
    delta?: unknown;
    decision_before?: unknown;
    decision_after?: unknown;
    impact_explained?: unknown;
    explanation?: unknown;
};

function readText(value: unknown): string {
    return value == null ? "—" : String(value);
}

function parseDeltaNum(delta: unknown): number | null {
    if (typeof delta === "number" && Number.isFinite(delta)) return delta;
    const s = String(delta ?? "").trim();
    const n = Number(s.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
}

type ScenarioKind = "allocation" | "move_talent" | "add_member" | "remove_member";
type CockpitState = "safe" | "warning" | "blocked";

type ProjectWhatIfSimulatorProps = {
    /** Charge la simulation (ex. POST `/api/copilot/projects/:id/what-if`). */
    onSimulate: (modifications: Record<string, unknown>) => Promise<WhatIfResult | unknown>;
    /** Options pour liste talent (id + label). */
    talentOptions?: { id: string; label: string }[];
    onRequestRh?: () => void;
};

export function ProjectWhatIfSimulator({ onSimulate, talentOptions = [], onRequestRh }: ProjectWhatIfSimulatorProps) {
    const [scenario, setScenario] = useState<ScenarioKind>("allocation");
    const [allocationPct, setAllocationPct] = useState("30");
    const [talentId, setTalentId] = useState("");
    const [moveToTalentId, setMoveToTalentId] = useState("");
    const [addTalentId, setAddTalentId] = useState("");
    const [removeTalentId, setRemoveTalentId] = useState("");
    const [baseWorkload, setBaseWorkload] = useState("62");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<WhatIfResult | null>(null);
    const [applyConfirmed, setApplyConfirmed] = useState(false);
    const [applyFeedback, setApplyFeedback] = useState<string | null>(null);

    const scenarioOptions = useMemo(() => {
        return [
            { label: "Modifier allocation", value: "allocation" as const },
            { label: "Déplacer talent", value: "move_talent" as const },
            { label: "Ajouter membre", value: "add_member" as const },
            { label: "Retirer membre", value: "remove_member" as const },
        ];
    }, []);

    const deltaNum = result ? parseDeltaNum(result.delta) : null;
    const deltaTone =
        deltaNum == null ? "neutral" : deltaNum > 0 ? "up" : deltaNum < 0 ? "down" : "neutral";
    const allocationNumber = Number(allocationPct);
    const baseWorkloadNum = Number(baseWorkload);
    const currentWorkload = Number.isFinite(baseWorkloadNum) ? Math.max(0, Math.min(100, baseWorkloadNum)) : 62;
    const simulatedWorkload = Math.max(0, Math.min(100, currentWorkload + (Number.isFinite(allocationNumber) ? allocationNumber - 30 : 0)));
    const workloadDelta = simulatedWorkload - currentWorkload;

    const metricBefore = {
        viability: Number.isFinite(Number(result?.score_before)) ? Number(result?.score_before) : 6.4,
        risk: Number.isFinite(Number(result?.decision_before)) ? Number(result?.decision_before) : 4.8,
        workload: currentWorkload,
        health: Number.isFinite(Number(result?.score_before)) ? Math.max(0, Math.min(10, Number(result?.score_before) + 0.6)) : 6.8,
    };

    const metricAfter = {
        viability: Number.isFinite(Number(result?.score_after)) ? Number(result?.score_after) : Math.max(0, Math.min(10, metricBefore.viability + (deltaNum ?? 0))),
        risk: Math.max(0, Math.min(10, metricBefore.risk - ((deltaNum ?? 0) * 0.4))),
        workload: simulatedWorkload,
        health: Math.max(0, Math.min(10, metricBefore.health + ((deltaNum ?? 0) * 0.35))),
    };

    const scenarioState: CockpitState =
        metricAfter.workload > 90 || metricAfter.risk >= 8.5 ? "blocked" : metricAfter.workload > 85 || metricAfter.risk >= 7 ? "warning" : "safe";

    const stateBadgeClass =
        scenarioState === "safe"
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : scenarioState === "warning"
              ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300";
    const stateLabel = scenarioState === "safe" ? "Safe" : scenarioState === "warning" ? "Warning" : "Blocked";

    const recommendApply = scenarioState === "safe" || (scenarioState === "warning" && metricAfter.viability >= metricBefore.viability);

    const run = async () => {
        const n = Number(allocationPct);
        if (scenario === "allocation" && !Number.isFinite(n)) {
            setError("Allocation invalide.");
            return;
        }
        setLoading(true);
        setError(null);
        setApplyFeedback(null);
        setApplyConfirmed(false);
        try {
            const scenarioType = scenario === "add_member" || scenario === "remove_member" ? "team" : scenario;
            const modifications: Record<string, unknown> = { scenario_type: scenarioType };
            if (scenario === "allocation") {
                modifications.allocation_pct = n;
                if (talentId.trim()) modifications.talent_id = talentId.trim();
            } else if (scenario === "move_talent") {
                if (talentId.trim()) modifications.talent_id = talentId.trim();
                if (moveToTalentId.trim()) modifications.move_to_talent_id = moveToTalentId.trim();
                modifications.allocation_pct = Number.isFinite(n) ? n : undefined;
                if (moveToTalentId.trim()) modifications.added_talent_id = moveToTalentId.trim();
            } else if (scenario === "add_member") {
                if (addTalentId.trim()) modifications.added_talent_id = addTalentId.trim();
            } else {
                if (removeTalentId.trim()) modifications.training_skill_id = removeTalentId.trim();
            }
            const raw = await onSimulate(modifications);
            setResult((raw && typeof raw === "object" ? raw : {}) as WhatIfResult);
        } catch {
            setError("Simulation indisponible pour le moment.");
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const applyDisabled = loading || !result || (scenarioState === "blocked" && !applyConfirmed) || (metricAfter.workload > 85 && !applyConfirmed);
    const canShowOverloadWarning = metricAfter.workload > 85;

    const applyScenario = () => {
        setApplyFeedback(
            scenarioState === "blocked"
                ? "Scénario bloqué sans confirmation RH."
                : "Scénario appliqué dans cette session de décision.",
        );
    };

    return (
        <section
            id="project-what-if"
            className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Cockpit de simulation</p>
                    <p className="mt-1 text-sm text-tertiary">Validez l’impact avant décision, en moins de 3 secondes de lecture.</p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${stateBadgeClass}`}>
                    Statut scénario : {stateLabel}
                </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {scenarioOptions.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => setScenario(opt.value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            scenario === opt.value
                                ? "border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-300"
                                : "border-secondary bg-primary text-tertiary hover:bg-secondary/40"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <div className="mt-4 grid gap-3 rounded-xl border border-secondary bg-primary_alt/30 p-4 md:grid-cols-3">
                {talentOptions.length > 0 && (scenario === "allocation" || scenario === "move_talent") ? (
                    <div className="min-w-[12rem]">
                        <NativeSelect
                            label={scenario === "move_talent" ? "Talent concerné" : "Talent (optionnel)"}
                            value={talentId}
                            onChange={(e) => setTalentId(e.target.value)}
                            options={[{ label: "—", value: "" }, ...talentOptions.map((o) => ({ label: o.label, value: o.id }))]}
                        />
                    </div>
                ) : null}
                {scenario === "move_talent" && talentOptions.length > 0 ? (
                    <div className="min-w-[12rem]">
                        <NativeSelect
                            label="Réaffecter vers (optionnel)"
                            value={moveToTalentId}
                            onChange={(e) => setMoveToTalentId(e.target.value)}
                            options={[{ label: "—", value: "" }, ...talentOptions.map((o) => ({ label: o.label, value: o.id }))]}
                        />
                    </div>
                ) : null}
                {scenario === "add_member" ? (
                    <>
                        <label className="min-w-[10rem] text-sm">
                            <span className="mb-1 block text-quaternary">Ajouter membre (optionnel)</span>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-primary outline-none"
                                value={addTalentId}
                                onChange={(e) => setAddTalentId(e.target.value)}
                                placeholder="ID talent"
                            />
                        </label>
                    </>
                ) : null}
                {scenario === "remove_member" ? (
                    <label className="min-w-[10rem] text-sm">
                        <span className="mb-1 block text-quaternary">Retirer membre (optionnel)</span>
                        <input
                            type="text"
                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-primary outline-none"
                            value={removeTalentId}
                            onChange={(e) => setRemoveTalentId(e.target.value)}
                            placeholder="ID talent"
                        />
                    </label>
                ) : null}
                {(scenario === "allocation" || scenario === "move_talent") ? (
                    <div className="md:col-span-3">
                        <div className="grid gap-3 md:grid-cols-3">
                            <label className="text-sm">
                                <span className="mb-1 block text-quaternary">Allocation du talent</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={1}
                                    className="w-full accent-violet-600"
                                    value={Number.isFinite(allocationNumber) ? allocationNumber : 0}
                                    onChange={(e) => setAllocationPct(e.target.value)}
                                />
                                <div className="mt-1 flex justify-between text-[11px] text-tertiary">
                                    <span>50%</span>
                                    <span>70%</span>
                                    <span>85%</span>
                                </div>
                            </label>
                            <label className="text-sm">
                                <span className="mb-1 block text-quaternary">Charge actuelle</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-primary outline-none"
                                    value={baseWorkload}
                                    onChange={(e) => setBaseWorkload(e.target.value)}
                                />
                            </label>
                            <div className="text-sm">
                                <span className="mb-1 block text-quaternary">Charge simulée</span>
                                <div className={`rounded-lg border px-3 py-2 font-semibold ${simulatedWorkload > 85 ? "border-red-400 bg-red-500/10 text-red-700 dark:text-red-300" : "border-secondary bg-primary text-primary"}`}>
                                    {Math.round(simulatedWorkload)}%
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="mt-4">
                <Button color="secondary" onClick={() => void run()} isLoading={loading}>
                    Calculer l’impact
                </Button>
            </div>

            {error ? <p className="mt-3 text-sm text-error-primary">{error}</p> : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
                {[
                    { key: "viability", label: "Viabilité", before: metricBefore.viability, after: metricAfter.viability, unit: "/10", positiveWhenUp: true },
                    { key: "risk", label: "Risque", before: metricBefore.risk, after: metricAfter.risk, unit: "/10", positiveWhenUp: false },
                    { key: "workload", label: "Charge talent", before: metricBefore.workload, after: metricAfter.workload, unit: "%", positiveWhenUp: false },
                    { key: "health", label: "Santé projet", before: metricBefore.health, after: metricAfter.health, unit: "/10", positiveWhenUp: true },
                ].map((metric) => {
                    const delta = metric.after - metric.before;
                    const up = delta > 0;
                    const positive = metric.positiveWhenUp ? up : !up;
                    const toneClass = delta === 0 ? "text-tertiary" : positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
                    return (
                        <article key={metric.key} className="rounded-xl border border-secondary bg-primary_alt/30 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{metric.label}</p>
                            <p className="mt-2 text-sm text-tertiary">
                                Avant <span className="font-semibold text-primary">{metric.before.toFixed(1)}{metric.unit}</span>
                            </p>
                            <p className="text-sm text-tertiary">
                                Après <span className="font-semibold text-primary">{metric.after.toFixed(1)}{metric.unit}</span>
                            </p>
                            <p className={`mt-2 flex items-center gap-1 text-sm font-semibold ${toneClass}`}>
                                {delta === 0 ? "→" : up ? "↑" : "↓"} {delta > 0 ? "+" : ""}{delta.toFixed(1)}{metric.unit}
                            </p>
                        </article>
                    );
                })}
            </div>

            {(result && Object.keys(result).length > 0) ? (
                <div className="mt-5 space-y-3">
                    <div className="rounded-xl border border-secondary bg-primary_alt/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Synthèse IA</p>
                        <ul className="mt-2 space-y-1 text-sm text-secondary">
                            <li>Améliore : {metricAfter.viability >= metricBefore.viability ? "viabilité et clarté de décision" : "stabilité opérationnelle"}</li>
                            <li>Se dégrade : {metricAfter.workload > metricBefore.workload ? "charge talent" : "risque projet"}</li>
                            <li className={recommendApply ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>
                                Recommandation : {recommendApply ? "Scénario recommandé avec suivi." : "Scénario à encadrer avant application."}
                            </li>
                        </ul>
                    </div>

                    {canShowOverloadWarning ? (
                        <div className="rounded-xl border border-red-400/60 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                            <p className="font-semibold">Alerte surcharge: la charge simulée dépasse 85%.</p>
                            <p className="mt-1">L’application est bloquée tant que vous ne confirmez pas explicitement ce risque.</p>
                            <label className="mt-2 inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={applyConfirmed}
                                    onChange={(e) => setApplyConfirmed(e.target.checked)}
                                />
                                <span>Je confirme appliquer malgré la surcharge.</span>
                            </label>
                        </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2 border-t border-secondary pt-3">
                        <Button color="primary" onClick={applyScenario} isDisabled={applyDisabled}>
                            Appliquer le scénario
                        </Button>
                        <Button
                            color="secondary"
                            onClick={() => {
                                if (onRequestRh) onRequestRh();
                                setApplyFeedback("Escalade RH recommandée pour ce scénario.");
                            }}
                        >
                            Demander au RH
                        </Button>
                        <Button color="tertiary" onClick={() => setResult(null)}>
                            Annuler
                        </Button>
                    </div>
                    {scenarioState === "blocked" ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300">Scénario bloqué: privilégiez « Demander au RH ».</p>
                    ) : null}
                    {applyFeedback ? <p className="text-xs text-tertiary">{applyFeedback}</p> : null}
                </div>
            ) : null}
        </section>
    );
}
