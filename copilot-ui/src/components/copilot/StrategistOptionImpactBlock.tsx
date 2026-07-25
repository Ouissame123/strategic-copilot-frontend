import type { OrchestratorArbitrageImpact, OrchestratorArbitrageOption } from "@/api/orchestrator.api";
import { cx } from "@/utils/cx";

function pct(value: number | undefined): string | null {
    if (value == null || !Number.isFinite(value)) return null;
    return `${value > 0 ? "+" : ""}${value}%`;
}

function riskLabel(value: number | undefined): string | null {
    if (value == null || !Number.isFinite(value)) return null;
    return `${value > 0 ? "+" : ""}${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

function ImpactChip({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "good" | "warn" }) {
    return (
        <span
            className={cx(
                "rounded px-1.5 py-0.5 text-[11px] font-medium",
                tone === "good" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
                tone === "warn" && "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
                tone === "neutral" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            )}
        >
            {children}
        </span>
    );
}

function ReallocationImpact({ impact }: { impact: OrchestratorArbitrageImpact }) {
    const candidates = impact.candidates ?? [];
    const risk = riskLabel(impact.expected_risk_reduction);
    const capacity = pct(impact.expected_capacity_gain_pct);

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {risk ? <ImpactChip tone="good">Risque {risk}</ImpactChip> : null}
                {capacity ? <ImpactChip>Capacité {capacity}</ImpactChip> : null}
            </div>
            {candidates.length > 0 ? (
                <ul className="space-y-1.5">
                    {candidates.map((c, idx) => (
                        <li
                            key={c.talent_id || `${c.talent_name ?? "talent"}-${idx}`}
                            className="rounded-md border border-slate-200/80 bg-white/60 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300"
                        >
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                {c.talent_name?.trim() || c.talent_id || "Talent"}
                            </span>
                            <span className="mt-0.5 block text-slate-500 dark:text-slate-400">
                                Charge {c.current_load_pct != null ? `${c.current_load_pct}%` : "—"}
                                {c.matching_skills_count != null
                                    ? ` · ${c.matching_skills_count} compétence${c.matching_skills_count > 1 ? "s" : ""}`
                                    : ""}
                                {c.proposed_allocation_pct != null
                                    ? ` · allocation proposée ${c.proposed_allocation_pct}%`
                                    : ""}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

function DelayImpact({ impact }: { impact: OrchestratorArbitrageImpact }) {
    const risk = riskLabel(impact.expected_risk_reduction);
    return (
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex flex-wrap gap-1.5">
                {impact.delta_days != null ? (
                    <ImpactChip tone="warn">
                        {impact.delta_days > 0 ? "+" : ""}
                        {impact.delta_days} j
                    </ImpactChip>
                ) : null}
                {risk ? <ImpactChip tone="good">Risque {risk}</ImpactChip> : null}
            </div>
            {impact.current_milestone_at ? (
                <p>
                    Jalon actuel : <span className="font-medium">{impact.current_milestone_at}</span>
                </p>
            ) : null}
            {impact.proposed_milestone_at ? (
                <p>
                    Jalon proposé : <span className="font-medium">{impact.proposed_milestone_at}</span>
                </p>
            ) : null}
            {impact.business_cost ? <p className="text-slate-500">{impact.business_cost}</p> : null}
        </div>
    );
}

function ReinforceImpact({ impact }: { impact: OrchestratorArbitrageImpact }) {
    const risk = riskLabel(impact.expected_risk_reduction);
    const skills = impact.uncovered_skills ?? [];
    return (
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex flex-wrap gap-1.5">
                {impact.proposed_hires != null ? (
                    <ImpactChip>{impact.proposed_hires} recrutement{impact.proposed_hires > 1 ? "s" : ""}</ImpactChip>
                ) : null}
                {impact.uncovered_skills_count != null ? (
                    <ImpactChip>
                        {impact.uncovered_skills_count} compétence
                        {impact.uncovered_skills_count > 1 ? "s" : ""} non couverte
                        {impact.uncovered_skills_count > 1 ? "s" : ""}
                    </ImpactChip>
                ) : null}
                {impact.critical_gap_count != null ? (
                    <ImpactChip tone="warn">{impact.critical_gap_count} écart(s) critique(s)</ImpactChip>
                ) : null}
                {risk ? <ImpactChip tone="good">Risque {risk}</ImpactChip> : null}
            </div>
            {skills.length > 0 ? (
                <p>
                    Compétences : <span className="font-medium">{skills.join(", ")}</span>
                </p>
            ) : null}
            {impact.business_cost ? <p className="text-slate-500">{impact.business_cost}</p> : null}
            {impact.note ? <p className="italic text-slate-500">{impact.note}</p> : null}
        </div>
    );
}

function StopScopeImpact({ impact }: { impact: OrchestratorArbitrageImpact }) {
    const risk = riskLabel(impact.expected_risk_reduction);
    const reqs = impact.droppable_requirements ?? [];
    return (
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex flex-wrap gap-1.5">
                {risk ? <ImpactChip tone="good">Risque {risk}</ImpactChip> : null}
                {reqs.length > 0 ? (
                    <ImpactChip tone="warn">
                        {reqs.length} exigence{reqs.length > 1 ? "s" : ""} retirable
                        {reqs.length > 1 ? "s" : ""}
                    </ImpactChip>
                ) : null}
            </div>
            {reqs.length > 0 ? (
                <ul className="list-disc space-y-0.5 pl-4">
                    {reqs.map((r, idx) => (
                        <li key={r.id || `${r.skill_id ?? "req"}-${idx}`}>
                            {r.skill_name?.trim() || r.skill_id || r.id || "Exigence"}
                            {r.priority != null ? ` · priorité ${r.priority}` : ""}
                            {r.weight != null ? ` · poids ${r.weight}` : ""}
                        </li>
                    ))}
                </ul>
            ) : null}
            {impact.business_cost ? <p className="text-slate-500">{impact.business_cost}</p> : null}
        </div>
    );
}

export function StrategistOptionImpactBlock({ option }: { option: OrchestratorArbitrageOption }) {
    switch (option.option_type) {
        case "reallocation":
            return <ReallocationImpact impact={option.impact} />;
        case "delay":
            return <DelayImpact impact={option.impact} />;
        case "reinforce":
            return <ReinforceImpact impact={option.impact} />;
        case "stop_scope":
            return <StopScopeImpact impact={option.impact} />;
        default:
            return null;
    }
}
