import { statusNeutralBadgeClass } from "@/components/manager/projects/projects-list-ui";
import type { ProjectViability, ProjectViabilityDecision } from "@/types/api.types";
import { cx } from "@/utils/cx";

type ProjectViabilityBannerProps = {
    viability: ProjectViability | null;
    onNavigateToCopilot?: () => void;
};

const DECISION_LABEL: Record<ProjectViabilityDecision, string> = {
    Proceed: "Continuer",
    Adjust: "Ajuster",
    Reject: "Stop",
};

function decisionBadgeClass(decision: ProjectViabilityDecision): string {
    if (decision === "Proceed") {
        return statusNeutralBadgeClass("active");
    }
    if (decision === "Adjust") {
        return "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50";
    }
    return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50";
}

function decisionBorderColor(decision: ProjectViabilityDecision | null): string {
    if (decision === "Proceed") return "var(--ok)";
    if (decision === "Adjust") return "var(--warn)";
    if (decision === "Reject") return "var(--critical)";
    return "var(--border)";
}

function formatComputedAt(iso: string): string | null {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("fr-FR");
}

export function ProjectViabilityBanner({ viability, onNavigateToCopilot }: ProjectViabilityBannerProps) {
    if (viability == null) {
        return (
            <section
                className="rounded-xl bg-[color:var(--surface-2)] px-[1.15rem] py-4"
                style={{ border: "0.5px solid var(--border)" }}
            >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <p
                        className="text-[12px] tracking-wider uppercase"
                        style={{ color: "var(--text-muted)" }}
                    >
                        SCORE DE VIABILITÉ
                    </p>
                    <p className="text-[14px] font-medium" style={{ color: "var(--text)" }}>
                        Pas encore analysé
                    </p>
                </div>
                {onNavigateToCopilot ? (
                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={onNavigateToCopilot}
                            className="text-[13px] font-medium text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
                        >
                            Lancer une analyse →
                        </button>
                    </div>
                ) : null}
            </section>
        );
    }

    const scoreLabel = Number.isFinite(viability.score) ? viability.score.toFixed(1) : "—";
    const computedLabel = formatComputedAt(viability.computed_at);

    return (
        <section
            className="rounded-xl bg-[color:var(--surface-2)] px-[1.15rem] py-4"
            style={{ border: `0.5px solid ${decisionBorderColor(viability.decision)}` }}
        >
            {/* Ligne 1 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p
                    className="text-[12px] tracking-wider uppercase"
                    style={{ color: "var(--text-muted)" }}
                >
                    SCORE DE VIABILITÉ
                </p>
                <p
                    className="text-[15px] font-medium tabular-nums"
                    style={{ color: "var(--text)" }}
                >
                    {scoreLabel}
                    <span className="font-normal" style={{ color: "var(--text-muted)" }}>
                        /10
                    </span>
                </p>
                <span
                    className={cx(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                        decisionBadgeClass(viability.decision),
                    )}
                >
                    {DECISION_LABEL[viability.decision]}
                </span>
            </div>

            {/* Ligne 2 — explanation jamais tronquée */}
            {viability.explanation ? (
                <p
                    className="mt-2.5 text-[14px]"
                    style={{ color: "var(--text)", lineHeight: 1.65 }}
                >
                    {viability.explanation}
                </p>
            ) : null}

            {/* Ligne 3 */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {computedLabel ? (
                    <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                        Calculé le {computedLabel}
                    </p>
                ) : (
                    <span />
                )}
                {onNavigateToCopilot ? (
                    <button
                        type="button"
                        onClick={onNavigateToCopilot}
                        className="shrink-0 text-[13px] font-medium text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
                    >
                        Voir l&apos;analyse complète →
                    </button>
                ) : null}
            </div>
        </section>
    );
}
