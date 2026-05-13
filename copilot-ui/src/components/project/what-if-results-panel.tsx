import type { ReactNode } from "react";
import { formatUserFacingExplanation } from "@/lib/business-explanation";
import type { WhatIfResult } from "@/types/api.types";

export function SeverityBadge({ severity }: { severity: string }) {
    const s = (severity ?? "").toLowerCase();
    const cls =
        s === "critical"
            ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800"
            : s === "high"
              ? "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800"
              : s === "medium"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200";

    return (
        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${cls}`}>
            {severity}
        </span>
    );
}

function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "destructive" }) {
    const base = "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium";
    const styles =
        variant === "destructive"
            ? "border-utility-error-200 bg-utility-error-50 text-utility-error-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            : "border-secondary bg-secondary_subtle text-secondary";
    return <span className={`${base} ${styles}`}>{children}</span>;
}

function num(n: number | undefined, digits = 2): string {
    return n != null && Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function num1(n: number | undefined): string {
    return n != null && Number.isFinite(n) ? n.toFixed(1) : "—";
}

/**
 * Panneau résultats What-If — aligné sur le contrat orchestrator (scores, décision, breakdown, reco, risques, KPI).
 */
export function WhatIfResultsPanel({ data }: { data: WhatIfResult }) {
    const d = data.delta ?? 0;
    const deltaColor =
        d > 0 ? "text-green-600 dark:text-green-400" : d < 0 ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400";

    const decBefore = data.decision_before ?? "";
    const decAfter = data.decision_after ?? "";

    return (
        <div className="mt-4 space-y-4 rounded-2xl border border-secondary bg-primary p-4">
            <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">{num(data.score_after)}</span>
                <span className="text-sm text-tertiary">/ {num(data.score_before)}</span>
                <span className={`text-lg font-semibold ${deltaColor}`}>
                    ({d >= 0 ? "+" : ""}
                    {num(d)})
                </span>
                {data.scenario_summary ? (
                    <span className="ml-auto max-w-[min(100%,22rem)] text-right text-sm text-tertiary">{data.scenario_summary}</span>
                ) : null}
            </div>

            {data.impact_explained ? (
                <p className="text-sm text-secondary">
                    {formatUserFacingExplanation(data.impact_explained, {
                        score: data.score_after ?? data.score_before ?? null,
                        decision: decAfter || decBefore || null,
                    })}
                </p>
            ) : null}

            {(decBefore || decAfter) && (
                <div className="flex flex-wrap items-center gap-2">
                    {decBefore ? <Badge>{decBefore}</Badge> : null}
                    <span className="text-tertiary">→</span>
                    {decAfter ? (
                        <Badge variant={decAfter !== decBefore ? "destructive" : "default"}>{decAfter}</Badge>
                    ) : null}
                </div>
            )}

            {(data.explanation_before || data.explanation_after) && (
                <div className="grid gap-2 text-sm md:grid-cols-2">
                    {data.explanation_before ? (
                        <div className="rounded-lg border border-secondary bg-secondary_subtle/30 p-2">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Avant</p>
                            <p className="text-tertiary">
                                {formatUserFacingExplanation(data.explanation_before, {
                                    score: data.score_before ?? null,
                                    decision: decBefore || null,
                                })}
                            </p>
                        </div>
                    ) : null}
                    {data.explanation_after ? (
                        <div className="rounded-lg border border-secondary bg-primary p-2">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Après</p>
                            <p className="text-secondary">
                                {formatUserFacingExplanation(data.explanation_after, {
                                    score: data.score_after ?? null,
                                    decision: decAfter || null,
                                })}
                            </p>
                        </div>
                    ) : null}
                </div>
            )}

            {data.recommendation?.summary || (data.recommendation?.key_drivers?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                    {data.recommendation?.summary ? (
                        <p className="text-sm font-medium text-primary">
                            {formatUserFacingExplanation(data.recommendation.summary, {
                                score: data.score_after ?? null,
                                decision: decAfter || null,
                            })}
                        </p>
                    ) : null}
                    {(data.recommendation?.key_drivers?.length ?? 0) > 0 ? (
                        <ul className="list-inside list-disc text-sm text-tertiary">
                            {(data.recommendation?.key_drivers ?? []).map((x) => (
                                <li key={x}>
                                    {formatUserFacingExplanation(x, {
                                        score: data.score_after ?? null,
                                        decision: decAfter || null,
                                    })}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : null}

            {(data.recommendation?.actions?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-primary">Actions recommandées</h4>
                    {(data.recommendation?.actions ?? []).map((a, idx) => (
                        <div
                            key={`${a.priority}-${a.type}-${idx}`}
                            className="rounded-lg border-l-4 border-primary bg-secondary_subtle/50 p-3 dark:bg-secondary_subtle/20"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded bg-brand-secondary px-2 py-0.5 text-xs font-medium text-white">
                                    P{a.priority}
                                </span>
                                <span className="text-sm font-medium text-primary">{a.type}</span>
                                <span className="ml-auto text-xs text-tertiary">{a.owner_role}</span>
                            </div>
                            <p className="mt-1 text-sm text-tertiary">{a.rationale}</p>
                        </div>
                    ))}
                </div>
            ) : null}

            {(data.recommendation?.warnings?.length ?? 0) > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    <p className="font-medium">Avertissements</p>
                    <ul className="mt-1 list-inside list-disc">
                        {(data.recommendation?.warnings ?? []).map((w) => (
                            <li key={w}>{w}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {data.kpi ? (
                    <div className="rounded-lg border border-secondary p-3 text-sm">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tertiary">Indicateurs scénario</p>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                            <div>
                                <span className="text-tertiary">Avancement </span>
                                <span className="font-medium text-primary">{data.kpi.progress_pct != null ? `${data.kpi.progress_pct.toFixed(0)}%` : "—"}</span>
                            </div>
                            <div>
                                <span className="text-tertiary">Retard (jours) </span>
                                <span className="font-medium text-primary">{data.kpi.delay_days ?? "—"}</span>
                            </div>
                            <div>
                                <span className="text-tertiary">Charge équipe </span>
                                <span className="font-medium text-primary">
                                    {data.kpi.capacity_load_pct != null ? `${data.kpi.capacity_load_pct.toFixed(0)}%` : "—"}
                                </span>
                            </div>
                            <div>
                                <span className="text-tertiary">Santé projet </span>
                                <span className="font-medium text-primary">{num1(data.kpi.project_health_score)}</span>
                            </div>
                            <div>
                                <span className="text-tertiary">Indicateur global talents </span>
                                <span className="font-medium text-primary">{num1(data.kpi.skills_fit_score)}</span>
                            </div>
                            <div>
                                <span className="text-tertiary">Niveau de fragilité </span>
                                <span className="font-medium text-primary">{num1(data.kpi.fragility_score)}</span>
                            </div>
                        </div>
                    </div>
            ) : null}

            {(data.risks?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-primary">Risques détectés ({data.risks?.length ?? 0})</h4>
                    {(data.risks ?? []).map((r) => (
                        <div key={r.id} className="flex items-start gap-2 rounded-lg border border-secondary p-2 text-sm">
                            <SeverityBadge severity={r.severity} />
                            <div className="min-w-0 flex-1">
                                <div className="font-medium text-primary">{r.type}</div>
                                <div className="text-xs text-tertiary">{r.message}</div>
                            </div>
                            <span className="shrink-0 text-xs tabular-nums text-tertiary">{r.risk_score}/10</span>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
