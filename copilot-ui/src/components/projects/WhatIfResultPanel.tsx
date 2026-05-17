import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
    AlertTriangle,
    BookOpen,
    Check,
    Clock,
    Crosshair,
    Link2,
    UserMinus,
    Users,
    type LucideIcon,
} from "lucide-react";
import { useRiskAlertAction } from "@/hooks/useNotifications";
import { formatUserFacingExplanation } from "@/lib/business-explanation";
import { cx } from "@/utils/cx";

// ——— Types (contrat API What-If) ———

export type WhatIfDecision = "Continue" | "Adjust" | "Stop";

export type WhatIfOwnerRole = "manager" | "rh" | "direction" | "pmo";

export type WhatIfRiskSeverity = "low" | "medium" | "high" | "critical";

export interface WhatIfScoreBreakdown {
    skills_fit: number;
    capacity: number;
    budget: number;
    risk: number;
}

export interface WhatIfRecommendationAction {
    priority?: number;
    type?: string;
    action_type?: string;
    option_type?: string;
    rationale?: string;
    action_summary?: string;
    summary?: string;
    message?: string;
    owner_role?: WhatIfOwnerRole | string;
    linked_arbitrage_id?: string | null;
}

export interface WhatIfRecommendation {
    summary: string;
    key_drivers: string[];
    actions: WhatIfRecommendationAction[];
    warnings: string[];
}

export interface WhatIfKpi {
    progress_pct: number;
    delay_days: number;
    capacity_load_pct: number;
    project_health_score: number;
    skills_fit_score: number;
    fragility_score: number;
    [k: string]: number;
}

export interface WhatIfRiskRow {
    id: string;
    type: string;
    severity: WhatIfRiskSeverity;
    message: string;
    risk_score: number;
    impact_area: string;
    owner_role: string;
}

export interface WhatIfResponse {
    status: "success";
    project_id: string;
    scenario_summary: string;
    score_before: number;
    score_after: number;
    delta: number;
    decision_before: WhatIfDecision;
    decision_after: WhatIfDecision;
    explanation_before: string;
    explanation_after: string;
    score_breakdown_before: WhatIfScoreBreakdown;
    score_breakdown_after: WhatIfScoreBreakdown;
    recommendation: WhatIfRecommendation;
    kpi: WhatIfKpi;
    /** État KPI avant scénario (si fourni par l’API ; sinon repli sur `kpi`). */
    kpi_before?: WhatIfKpi;
    /** État KPI après scénario (si fourni ; sinon `kpi`). */
    kpi_after?: WhatIfKpi;
    risks: WhatIfRiskRow[];
    impact_explained: string;
}

type BreakdownKey = keyof WhatIfScoreBreakdown;

const BREAKDOWN_LABELS: Record<BreakdownKey, string> = {
    skills_fit: "Compétences",
    capacity: "Capacité",
    budget: "Budget",
    risk: "Risque",
};

const SCORE_BAR_WIDTH = 120;
const SCORE_MAX = 10;
const DELTA_NEUTRAL_EPS = 0.05;

// ——— Utilitaires ———

function fmtScore(n: number | undefined, digits = 2): string {
    return n != null && Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function fmtDelta(n: number, digits = 2): string {
    if (!Number.isFinite(n)) return "—";
    if (Math.abs(n) < DELTA_NEUTRAL_EPS) return "=";
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toFixed(digits)}`;
}

function getActionType(action: WhatIfRecommendationAction): string {
    return action?.type ?? action?.action_type ?? action?.option_type ?? "action";
}

function formatActionType(value?: string): string {
    return String(value ?? "action")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getActionText(action: WhatIfRecommendationAction): string {
    return (
        action?.rationale ??
        action?.action_summary ??
        action?.summary ??
        action?.message ??
        "Action recommandée"
    );
}

function deltaTone(value: number, invert = false): "up" | "down" | "neutral" {
    if (Math.abs(value) < DELTA_NEUTRAL_EPS) return "neutral";
    const effective = invert ? -value : value;
    if (effective > 0) return "up";
    if (effective < 0) return "down";
    return "neutral";
}

function normalizeSeverity(s: string): WhatIfRiskSeverity {
    const v = s.trim().toLowerCase();
    if (v === "critical") return "critical";
    if (v === "high") return "high";
    if (v === "medium") return "medium";
    return "low";
}

function severityBadgeClass(level: WhatIfRiskSeverity): string {
    if (level === "critical") return "bg-rose-600 text-white";
    if (level === "high") return "bg-rose-500 text-white";
    if (level === "medium") return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-700";
}

function decisionBadgeClass(decision: string): string {
    const d = decision.trim().toLowerCase();
    if (d === "continue") return "bg-emerald-100 text-emerald-800";
    if (d === "adjust") return "bg-amber-100 text-amber-800";
    if (d === "stop") return "bg-rose-100 text-rose-800";
    return "bg-slate-100 text-slate-700";
}

function impactAreaIcon(area: string): LucideIcon {
    const a = area.trim().toLowerCase();
    if (a === "skills") return BookOpen;
    if (a === "capacity") return Users;
    if (a === "schedule") return Clock;
    if (a === "turnover") return UserMinus;
    if (a === "conflict") return Crosshair;
    if (a === "dependency") return Link2;
    return AlertTriangle;
}

function shouldShowWarnings(warnings: string[] | undefined): boolean {
    if (!warnings?.length) return false;
    if (warnings.length === 1 && warnings[0]?.trim().toLowerCase() === "aucune alerte") return false;
    return true;
}

function narrativeText(
    raw: string | undefined,
    ctx: { score?: number | null; decision?: string | null },
): string {
    return formatUserFacingExplanation(raw, ctx).trim();
}

// ——— Sous-composants exportés ———

export function DeltaIndicator({
    value,
    invert = false,
    className,
    formatValue = fmtDelta,
}: {
    value: number;
    invert?: boolean;
    className?: string;
    formatValue?: (n: number) => string;
}) {
    const tone = deltaTone(value, invert);
    const isNeutral = tone === "neutral";
    const display = isNeutral ? "=" : formatValue(value);
    const arrow = isNeutral ? null : tone === "up" ? "▲" : "▼";
    const color =
        tone === "neutral"
            ? "text-slate-500"
            : tone === "up"
              ? "text-emerald-600"
              : "text-rose-600";

    const aria =
        tone === "neutral"
            ? `Variation nulle : ${display}`
            : tone === "up"
              ? `Amélioration de ${display}`
              : `Dégradation de ${display}`;

    return (
        <span className={cx("inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums", color, className)} aria-label={aria}>
            {arrow ? <span aria-hidden="true">{arrow}</span> : null}
            <span>{display}</span>
        </span>
    );
}

export function ScoreBar({
    value,
    max = SCORE_MAX,
    className,
    fillClassName,
}: {
    value: number;
    max?: number;
    className?: string;
    fillClassName?: string;
}) {
    const clamped = Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0;
    const pct = max > 0 ? (clamped / max) * 100 : 0;
    const fill =
        fillClassName ??
        (clamped >= 8 ? "fill-emerald-500" : clamped >= 5 ? "fill-amber-500" : "fill-rose-500");

    return (
        <svg
            width={SCORE_BAR_WIDTH}
            height={8}
            viewBox={`0 0 ${SCORE_BAR_WIDTH} 8`}
            className={cx("shrink-0", className)}
            role="img"
            aria-label={`Score ${fmtScore(clamped, 1)} sur ${max}`}
        >
            <rect x={0} y={0} width={SCORE_BAR_WIDTH} height={8} rx={4} className="fill-slate-200" />
            <rect x={0} y={0} width={(pct / 100) * SCORE_BAR_WIDTH} height={8} rx={4} className={fill} />
        </svg>
    );
}

export function OwnerBadge({ role }: { role: WhatIfOwnerRole | string }) {
    const r = String(role ?? "").trim().toLowerCase() as WhatIfOwnerRole;
    const cls =
        r === "manager"
            ? "bg-indigo-100 text-indigo-700"
            : r === "rh"
              ? "bg-fuchsia-100 text-fuchsia-700"
              : r === "direction"
                ? "bg-amber-100 text-amber-700"
                : r === "pmo"
                  ? "bg-cyan-100 text-cyan-700"
                  : "bg-slate-100 text-slate-600";

    return (
        <span className={cx("inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", cls)}>
            {r || "—"}
        </span>
    );
}

function DecisionBadge({ decision }: { decision: string }) {
    if (!decision.trim()) return null;
    return (
        <span className={cx("rounded-md px-2 py-0.5 text-xs font-semibold", decisionBadgeClass(decision))}>
            {decision}
        </span>
    );
}

function SectionTitle({ children }: { children: ReactNode }) {
    return <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h4>;
}

// ——— Sections internes ———

function ScoreBreakdownSection({
    before,
    after,
}: {
    before: WhatIfScoreBreakdown;
    after: WhatIfScoreBreakdown;
}) {
    const keys = Object.keys(BREAKDOWN_LABELS) as BreakdownKey[];

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="whatif-breakdown-title">
            <SectionTitle>
                <span id="whatif-breakdown-title">Score breakdown</span>
            </SectionTitle>
            <ul className="mt-3 space-y-3">
                {keys.map((key) => {
                    const b = before[key] ?? 0;
                    const a = after[key] ?? 0;
                    const d = a - b;
                    return (
                        <li key={key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <span className="w-24 shrink-0 font-medium text-slate-700">{BREAKDOWN_LABELS[key]}</span>
                            <ScoreBar value={b} />
                            <span className="w-8 shrink-0 text-right tabular-nums text-slate-600">{fmtScore(b, 1)}</span>
                            <span className="text-slate-400" aria-hidden="true">
                                →
                            </span>
                            <ScoreBar value={a} />
                            <span className="w-8 shrink-0 text-right tabular-nums text-slate-800">{fmtScore(a, 1)}</span>
                            <DeltaIndicator value={d} className="ml-1" formatValue={(n) => fmtDelta(n, 1)} />
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

type KpiRowDef = {
    key: keyof WhatIfKpi;
    label: string;
    format: (v: number) => string;
    invertDelta?: boolean;
};

const KPI_ROWS: KpiRowDef[] = [
    { key: "progress_pct", label: "Avancement", format: (v) => `${v.toFixed(0)}%` },
    { key: "delay_days", label: "Retard", format: (v) => `${v.toFixed(0)} j`, invertDelta: true },
    { key: "capacity_load_pct", label: "Charge équipe", format: (v) => `${v.toFixed(0)}%`, invertDelta: true },
    { key: "project_health_score", label: "Santé projet", format: (v) => v.toFixed(1) },
    { key: "skills_fit_score", label: "Talents (indic.)", format: (v) => v.toFixed(1) },
    { key: "fragility_score", label: "Fragilité", format: (v) => v.toFixed(1), invertDelta: true },
];

function KpiIndicatorsTable({ before, after }: { before: WhatIfKpi; after: WhatIfKpi }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="whatif-kpi-title">
            <SectionTitle>
                <span id="whatif-kpi-title">Indicateurs scénario</span>
            </SectionTitle>
            <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[320px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <th scope="col" className="pb-2 pr-2 font-semibold">
                                Indicateur
                            </th>
                            <th scope="col" className="pb-2 pr-2 font-semibold">
                                Avant
                            </th>
                            <th scope="col" className="pb-2 pr-2 font-semibold">
                                Après
                            </th>
                            <th scope="col" className="pb-2 text-right font-semibold">
                                Δ
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {KPI_ROWS.map(({ key, label, format, invertDelta }) => {
                            const b = before[key] ?? 0;
                            const a = after[key] ?? 0;
                            const d = a - b;
                            const forceRose = key === "fragility_score" && d > DELTA_NEUTRAL_EPS;
                            return (
                                <tr key={key} className="border-b border-slate-50 last:border-0">
                                    <th scope="row" className="py-2 pr-2 font-medium text-slate-700">
                                        {label}
                                    </th>
                                    <td className="py-2 pr-2 tabular-nums text-slate-600">{format(b)}</td>
                                    <td className="py-2 pr-2 tabular-nums text-slate-800">
                                        <span className="inline-flex items-center gap-1">
                                            <span className="text-slate-400" aria-hidden="true">
                                                →
                                            </span>
                                            {format(a)}
                                        </span>
                                    </td>
                                    <td className="py-2 text-right">
                                        {forceRose ? (
                                            <span className="inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums text-rose-600">
                                                <span aria-hidden="true">▲</span>
                                                {fmtDelta(d, 1)}
                                            </span>
                                        ) : (
                                            <DeltaIndicator value={d} invert={invertDelta} formatValue={(n) => fmtDelta(n, 1)} />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function ActionsSection({ actions }: { actions: WhatIfRecommendationAction[] }) {
    const sorted = useMemo(
        () => [...actions].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
        [actions],
    );
    if (sorted.length === 0) return null;

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="whatif-actions-title">
            <SectionTitle>
                <span id="whatif-actions-title">Actions recommandées</span>
            </SectionTitle>
            <ol className="mt-3 space-y-3">
                {sorted.map((action, idx) => (
                    <li key={`${action.priority ?? idx}-${getActionType(action)}-${idx}`} className="flex gap-3 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                            {action.priority ?? idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-800">{formatActionType(getActionType(action))}</span>
                                <OwnerBadge role={action.owner_role ?? ""} />
                            </div>
                            <p className="mt-1 text-slate-600">{getActionText(action)}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function WarningsBanner({ warnings }: { warnings: string[] }) {
    return (
        <section
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
            role="alert"
            aria-labelledby="whatif-warnings-title"
        >
            <p id="whatif-warnings-title" className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                Avertissements
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {warnings.map((w) => (
                    <li key={w}>{w}</li>
                ))}
            </ul>
        </section>
    );
}

function RiskRow({
    risk,
    onDismiss,
    dismissing,
}: {
    risk: WhatIfRiskRow;
    onDismiss: (id: string) => void;
    dismissing: boolean;
}) {
    const severity = normalizeSeverity(risk.severity);
    const Icon = impactAreaIcon(risk.impact_area);

    return (
        <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span
                className={cx(
                    "inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    severityBadgeClass(severity),
                )}
            >
                {severity}
            </span>
            <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800">{risk.type}</div>
                <div className="text-xs text-slate-600">{risk.message}</div>
            </div>
            <span className="shrink-0 tabular-nums text-xs font-medium text-slate-500">{risk.risk_score}/10</span>
            <button
                type="button"
                disabled={dismissing}
                onClick={() => onDismiss(risk.id)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                aria-label={`Acquitter le risque ${risk.type}`}
            >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Acquitter
            </button>
        </li>
    );
}

function RisksSection({
    risks,
    dismissedIds,
    onDismiss,
    dismissingId,
}: {
    risks: WhatIfRiskRow[];
    dismissedIds: Set<string>;
    onDismiss: (id: string) => void;
    dismissingId: string | null;
}) {
    const visible = risks.filter((r) => !dismissedIds.has(r.id));

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="whatif-risks-title">
            <SectionTitle>
                <span id="whatif-risks-title">Risques détectés ({visible.length})</span>
            </SectionTitle>
            {visible.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Aucun nouveau risque détecté</p>
            ) : (
                <ul className="mt-3 space-y-2">
                    {visible.map((r) => (
                        <RiskRow key={r.id} risk={r} onDismiss={onDismiss} dismissing={dismissingId === r.id} />
                    ))}
                </ul>
            )}
        </section>
    );
}

// ——— Panneau principal ———

export function WhatIfResultPanel({ data }: { data: WhatIfResponse }) {
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
    const [dismissingId, setDismissingId] = useState<string | null>(null);
    const riskAction = useRiskAlertAction();

    const delta = data.delta ?? 0;
    const scoreDegraded = delta < -DELTA_NEUTRAL_EPS;

    const kpiBefore = data.kpi_before ?? data.kpi;
    const kpiAfter = data.kpi_after ?? data.kpi;

    const explanationBefore = narrativeText(data.explanation_before, {
        score: data.score_before,
        decision: data.decision_before,
    });
    const explanationAfter = narrativeText(data.explanation_after, {
        score: data.score_after,
        decision: data.decision_after,
    });

    const impactExplained = data.impact_explained?.trim() ?? "";
    const recoSummary = data.recommendation?.summary?.trim() ?? "";

    const showSingleNarrative = explanationBefore === explanationAfter;
    const showImpactExplained =
        impactExplained.length > 0 &&
        impactExplained !== explanationAfter &&
        impactExplained !== explanationBefore &&
        impactExplained !== recoSummary;

    const sortedActions = data.recommendation?.actions ?? [];
    const warnings = data.recommendation?.warnings ?? [];
    const showWarnings = shouldShowWarnings(warnings);

    const handleDismissRisk = useCallback(
        (id: string) => {
            setDismissingId(id);
            riskAction.mutate(
                { id, body: { action: "dismiss" } },
                {
                    onSuccess: () => {
                        setDismissedIds((prev) => new Set(prev).add(id));
                        setDismissingId(null);
                    },
                    onError: () => setDismissingId(null),
                },
            );
        },
        [riskAction],
    );

    return (
        <div className="mt-4 space-y-4">
            {/* Header scores */}
            <header className="rounded-xl border border-slate-200 bg-white p-4">
                {data.scenario_summary ? (
                    <p className="mb-3 text-sm text-slate-500">{data.scenario_summary}</p>
                ) : null}
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                    <div className="text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Avant</p>
                        <p className="text-3xl font-bold tabular-nums text-slate-800">{fmtScore(data.score_before)}</p>
                        <DecisionBadge decision={data.decision_before} />
                    </div>
                    <div className="flex flex-col items-center gap-1 px-2">
                        <span className="text-slate-400" aria-hidden="true">
                            →
                        </span>
                        <DeltaIndicator value={delta} className="text-base" />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Après</p>
                        <p className="text-3xl font-bold tabular-nums text-slate-800">{fmtScore(data.score_after)}</p>
                        <DecisionBadge decision={data.decision_after} />
                    </div>
                </div>
            </header>

            {/* Narratif avant / après */}
            {(explanationBefore || explanationAfter) && (
                <div
                    className={cx(
                        "grid gap-3",
                        showSingleNarrative ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2",
                    )}
                >
                    {showSingleNarrative ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Synthèse
                            </p>
                            <p className="text-sm leading-relaxed text-slate-700">{explanationBefore}</p>
                        </div>
                    ) : (
                        <>
                            <div
                                className={cx(
                                    "rounded-xl border border-slate-200 p-4",
                                    scoreDegraded ? "bg-slate-50" : "bg-slate-50",
                                )}
                            >
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    Avant
                                </p>
                                <p className="text-sm leading-relaxed text-slate-700">{explanationBefore}</p>
                            </div>
                            <div
                                className={cx(
                                    "rounded-xl border border-slate-200 p-4",
                                    scoreDegraded ? "bg-amber-50" : "bg-emerald-50/40",
                                )}
                            >
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    Après
                                </p>
                                <p
                                    className={cx(
                                        "text-sm leading-relaxed",
                                        scoreDegraded ? "text-rose-900/90" : "text-emerald-900/90",
                                    )}
                                >
                                    {explanationAfter}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {showImpactExplained ? (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {formatUserFacingExplanation(data.impact_explained, {
                        score: data.score_after,
                        decision: data.decision_after,
                    })}
                </p>
            ) : null}

            {data.score_breakdown_before && data.score_breakdown_after ? (
                <ScoreBreakdownSection before={data.score_breakdown_before} after={data.score_breakdown_after} />
            ) : null}

            {kpiBefore && kpiAfter ? <KpiIndicatorsTable before={kpiBefore} after={kpiAfter} /> : null}

            {sortedActions.length > 0 ? <ActionsSection actions={sortedActions} /> : null}

            {showWarnings ? <WarningsBanner warnings={warnings} /> : null}

            <RisksSection
                risks={data.risks ?? []}
                dismissedIds={dismissedIds}
                onDismiss={handleDismissRisk}
                dismissingId={dismissingId}
            />
        </div>
    );
}
