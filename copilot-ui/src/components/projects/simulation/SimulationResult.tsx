import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { WhatIfResponse } from "@/api/whatif.types";
import { DecisionBadge } from "./DecisionBadgeCompare";
import {
    BREAKDOWN_DIMENSIONS,
    isLlmEnriched,
    readAiRecommendationText,
    readApproximationNotes,
    readBreakdownValue,
    readWhatIfNarrative,
} from "./simulation-parse";
import { formatDelta, formatScore, LEVER_LABELS } from "./whatif-format";
import { cx } from "@/utils/cx";

type SimulationResultProps = {
    result: WhatIfResponse;
};

function SectionCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
    return (
        <section className={cx("w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900", className)}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <div className="mt-3">{children}</div>
        </section>
    );
}

function ProvenanceBadge({ llm }: { llm: boolean }) {
    if (llm) {
        return (
            <span className="inline-flex items-center rounded-full border border-primary-300 bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-800 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200">
                Narration IA
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Calcul déterministe
        </span>
    );
}

export function SimulationResult({ result }: SimulationResultProps) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);

    const narrative = readWhatIfNarrative(result);
    const recommendation = readAiRecommendationText(result);
    const notes = readApproximationNotes(result);
    const llm = isLlmEnriched(result);
    const decisionChanged = result.decision_changed === true;
    const keyChange = typeof result.key_change === "string" && result.key_change.trim() ? result.key_change.trim() : null;

    const primaryLeverRaw =
        typeof result.primary_lever === "string" && result.primary_lever.trim() ? result.primary_lever.trim() : null;
    const primaryLeverKey =
        primaryLeverRaw &&
        primaryLeverRaw !== "aucun" &&
        BREAKDOWN_DIMENSIONS.some((d) => d.key === primaryLeverRaw)
            ? primaryLeverRaw
            : null;

    const delta = Number(result.delta);
    const deltaFinite = Number.isFinite(delta) ? delta : null;
    const deltaHighlight =
        deltaFinite == null || deltaFinite === 0 ? "neutral" : deltaFinite > 0 ? "positive" : "negative";

    return (
        <div className="flex w-full flex-col gap-4" aria-live="polite">
            <SectionCard title={tm("simulationResultTitle")}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <ProvenanceBadge llm={llm} />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Metric
                        label={tm("simulationBeforeLabel")}
                        value={`${formatScore(result.score_before)}/10`}
                        badge={<DecisionBadge value={String(result.decision_before ?? "—")} />}
                    />
                    <Metric
                        label={tm("simulationAfterLabel")}
                        value={`${formatScore(result.score_after)}/10`}
                        badge={<DecisionBadge value={String(result.decision_after ?? "—")} />}
                    />
                    <Metric
                        label={tm("whatIf.delta")}
                        value={formatDelta(deltaFinite)}
                        highlight={deltaHighlight}
                    />
                </div>
            </SectionCard>

            {decisionChanged && keyChange ? (
                <div
                    className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
                    role="status"
                >
                    {keyChange}
                </div>
            ) : null}

            <SectionCard title={tm("simulationBreakdownTitle")}>
                <ul className="space-y-2.5">
                    {BREAKDOWN_DIMENSIONS.map(({ key }) => {
                        const before = readBreakdownValue(result.score_breakdown_before, key);
                        const after = readBreakdownValue(result.score_breakdown_after, key);
                        const isPrimary = primaryLeverKey === key;
                        const changed = before != null && after != null && Math.abs(after - before) > 0.001;
                        return (
                            <li
                                key={key}
                                className={cx(
                                    "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                                    isPrimary
                                        ? "border-primary-200 bg-primary-50/80 dark:border-primary-900 dark:bg-primary-950/35"
                                        : changed
                                          ? "border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/30"
                                          : "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30",
                                )}
                            >
                                <span className="flex flex-wrap items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                                    {LEVER_LABELS[key] ?? key}
                                    {isPrimary ? (
                                        <span className="inline-flex items-center rounded-full border border-primary-300 bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-800 dark:border-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
                                            LEVIER PRINCIPAL
                                        </span>
                                    ) : null}
                                </span>
                                <span className="tabular-nums text-slate-600 dark:text-slate-300">
                                    {formatScore(before)}
                                    <span className="mx-1.5 text-slate-400" aria-hidden>
                                        →
                                    </span>
                                    {formatScore(after)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </SectionCard>

            {narrative ? (
                <SectionCard title={tm("simulationNarrative")}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">{narrative}</p>
                </SectionCard>
            ) : null}

            {recommendation ? (
                <SectionCard title={tm("simulationRecommendation")}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">{recommendation}</p>
                </SectionCard>
            ) : null}

            {notes.length > 0 ? (
                <SectionCard title={tm("simulationApproximationNotes")}>
                    <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
                        {notes.map((note, i) => (
                            <li key={`${i}-${note.slice(0, 24)}`}>{note}</li>
                        ))}
                    </ul>
                </SectionCard>
            ) : null}
        </div>
    );
}

function Metric({
    label,
    value,
    highlight,
    badge,
}: {
    label: string;
    value: string;
    highlight?: "positive" | "negative" | "neutral";
    badge?: ReactNode;
}) {
    return (
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/30">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p
                className={cx(
                    "mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100",
                    highlight === "positive" && "text-emerald-600",
                    highlight === "negative" && "text-rose-600",
                    highlight === "neutral" && "text-slate-500 dark:text-slate-400",
                )}
            >
                {value}
            </p>
            {badge ? <div className="mt-2">{badge}</div> : null}
        </div>
    );
}
