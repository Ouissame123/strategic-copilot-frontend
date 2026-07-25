import { useId, useState } from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { SlideOverShell } from "@/components/manager/inbox-triage/SlideOverShell";
import { triageBadgeClass } from "@/components/manager/inbox-triage/triage-ui";
import { MiniScoreGauge, WeightedScoreBar } from "@/components/decision-log/MiniScoreGauge";
import { SCORE_WEIGHTS } from "@/lib/parse-decision";
import {
    DECISION_BADGE_CLASS,
    DECISION_DOT_CLASS,
    formatOccurrenceRange,
    SCOPE_LABELS,
    type ManagerDecisionGroup,
} from "@/lib/manager-decision-log-inbox";
import type { DecisionStatusAction } from "@/services/decisions.api";
import { cx } from "@/utils/cx";

type DecisionGroupSlideOverProps = {
    group: ManagerDecisionGroup | null;
    actioning: boolean;
    onClose: () => void;
    onMark: (decisionId: string, action: DecisionStatusAction) => void;
};

function TechnicalDetailsSection({
    technicalDetails,
    rawSynthesis,
}: {
    technicalDetails: string | null;
    rawSynthesis: string;
}) {
    const [open, setOpen] = useState(false);
    const panelId = useId();

    return (
        <div className="rounded-lg border border-secondary">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-medium text-secondary transition hover:bg-secondary_subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400"
            >
                Détails techniques
                <ChevronDown
                    size={14}
                    className={cx("shrink-0 transition", open && "rotate-180")}
                    aria-hidden
                />
            </button>
            {open ? (
                <div id={panelId} className="space-y-3 border-t border-secondary px-3 py-3">
                    {technicalDetails ? (
                        <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                                Erreur technique
                            </p>
                            <pre className="whitespace-pre-wrap break-words rounded-md bg-secondary_subtle/80 p-2 font-mono text-[11px] leading-relaxed text-secondary">
                                {technicalDetails}
                            </pre>
                        </div>
                    ) : null}
                    <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                            Texte brut (traçabilité)
                        </p>
                        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-secondary_subtle/80 p-2 font-mono text-[11px] leading-relaxed text-secondary">
                            {rawSynthesis.trim() || "—"}
                        </pre>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function DecisionGroupSlideOver({ group, actioning, onClose, onMark }: DecisionGroupSlideOverProps) {
    if (!group) return null;

    const { parsed, primary } = group;
    const scores = parsed.scores;
    const isOpen = group.status === "open";
    const isHandled = group.status === "handled" || group.status === "dismissed";
    const agent = SCOPE_LABELS[group.scope] ?? group.scope;
    const occurrenceLabel = formatOccurrenceRange(group.occurrences);

    return (
        <SlideOverShell
            open={Boolean(group)}
            onClose={onClose}
            title={group.project_name?.trim() || "Projet sans nom"}
            titleId="decision-log-slide-title"
            headerAside={
                <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                        className={cx(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                            DECISION_BADGE_CLASS[group.decision],
                        )}
                    >
                        <span className={cx("size-1.5 rounded-full", DECISION_DOT_CLASS[group.decision])} aria-hidden />
                        {group.decisionLabel}
                    </span>
                    {group.count > 1 ? (
                        <span className="rounded bg-secondary_subtle px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-tertiary">
                            ×{group.count}
                        </span>
                    ) : null}
                    <MiniScoreGauge score={group.score} />
                </div>
            }
            footer={
                isOpen ? (
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={actioning}
                            onClick={() => onMark(primary.decision_id, "handled")}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {actioning ? (
                                <Loader2 size={14} className="animate-spin" aria-hidden />
                            ) : (
                                <Check size={14} aria-hidden />
                            )}
                            Valider
                        </button>
                        <button
                            type="button"
                            disabled={actioning}
                            onClick={() => onMark(primary.decision_id, "dismissed")}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-secondary px-3 py-2 text-sm font-medium text-secondary transition hover:bg-secondary_subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <X size={14} aria-hidden />
                            Rejeter
                        </button>
                    </div>
                ) : isHandled ? (
                    <button
                        type="button"
                        disabled={actioning}
                        onClick={() => onMark(primary.decision_id, "reopen")}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-secondary px-3 py-2 text-sm font-medium text-secondary transition hover:bg-secondary_subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {actioning ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
                        Rouvrir
                    </button>
                ) : (
                    <p className="text-xs text-tertiary">Lecture seule.</p>
                )
            }
        >
            <div className="space-y-5">
                <div className="flex flex-wrap gap-1.5 text-xs text-tertiary">
                    <span>{agent}</span>
                    {group.reason_code ? (
                        <>
                            <span aria-hidden>·</span>
                            <span className="rounded bg-secondary_subtle px-1.5 py-0.5">{group.reason_code}</span>
                        </>
                    ) : null}
                    {group.confidence != null ? (
                        <>
                            <span aria-hidden>·</span>
                            <span>
                                Confiance : <strong className="text-secondary">{group.confidence}%</strong>
                            </span>
                        </>
                    ) : null}
                    {isHandled ? (
                        <span
                            className={cx(
                                triageBadgeClass(group.status === "handled" ? "emerald" : "slate"),
                                "ml-auto",
                            )}
                        >
                            {group.status === "handled" ? "Validée" : "Rejetée"}
                        </span>
                    ) : null}
                </div>

                {(scores.skills != null ||
                    scores.capacity != null ||
                    scores.budget != null ||
                    scores.risk != null ||
                    scores.fragility != null ||
                    scores.dependence != null) && (
                    <section>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tertiary">
                            Décomposition du score
                        </h3>
                        <div className="space-y-2.5">
                            <WeightedScoreBar label="Skills" value={scores.skills} weight={SCORE_WEIGHTS.skills} />
                            <WeightedScoreBar
                                label="Capacity"
                                value={scores.capacity}
                                weight={SCORE_WEIGHTS.capacity}
                            />
                            <WeightedScoreBar label="Budget" value={scores.budget} weight={SCORE_WEIGHTS.budget} />
                            <WeightedScoreBar label="Risk" value={scores.risk} weight={SCORE_WEIGHTS.risk} />
                            <WeightedScoreBar label="Fragilité" value={scores.fragility} />
                            <WeightedScoreBar label="Dépendance" value={scores.dependence} max={100} unit="%" />
                        </div>
                    </section>
                )}

                <section>
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-tertiary">Résumé</h3>
                    {parsed.hasParsingIssue &&
                    !parsed.summary.includes("Synthèse IA indisponible") ? (
                        <span className={cx(triageBadgeClass("amber"), "mb-2 inline-flex")}>
                            Synthèse IA indisponible — score déterministe utilisé
                        </span>
                    ) : null}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary">
                        {parsed.summary.trim() || "Aucun résumé disponible."}
                    </p>
                </section>

                {group.reason_code ? (
                    <section>
                        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-tertiary">
                            Recommandation
                        </h3>
                        <p className="text-sm text-primary">{group.reason_code}</p>
                    </section>
                ) : null}

                {group.count > 1 ? (
                    <section>
                        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-tertiary">
                            Occurrences
                        </h3>
                        <p className="text-sm text-secondary">{occurrenceLabel}</p>
                        <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                            {group.occurrences.map((o) => (
                                <li
                                    key={o.decision_id}
                                    className="rounded-md border border-secondary px-2.5 py-1.5 text-[11px] text-tertiary"
                                >
                                    <time dateTime={o.created_at}>
                                        {new Date(o.created_at).toLocaleString("fr-FR", {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </time>
                                    <span className="ml-2 tabular-nums">score {Number(o.score).toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}

                <TechnicalDetailsSection
                    technicalDetails={parsed.technicalDetails}
                    rawSynthesis={group.rawSynthesis}
                />
            </div>
        </SlideOverShell>
    );
}
