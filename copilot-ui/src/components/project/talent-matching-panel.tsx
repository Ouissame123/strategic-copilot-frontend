import { useMemo } from "react";
import type { TalentMatchingRecommendedAction, TalentMatchingResult } from "@/types/talent-matching";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";

type ActionRow = TalentMatchingRecommendedAction & { id: string };

export type TalentMatchingPanelVariant = "project" | "rh";

export interface TalentMatchingPanelProps {
    data: TalentMatchingResult | null;
    error: string | null;
    className?: string;
    /** `project` : fiche projet (manager). `rh` : espace RH / test. */
    variant?: TalentMatchingPanelVariant;
}

const scoreLabel = (value: number, max = 10) => `${value.toFixed(2)} / ${max}`;

export function TalentMatchingPanel({ data, error, className, variant = "project" }: TalentMatchingPanelProps) {
    const isProject = variant === "project";

    if (error && !data) {
        return (
            <section
                className={cx(
                    "rounded-xl border border-secondary bg-primary px-4 py-3 text-sm ring-1 ring-warning-primary/20",
                    className,
                )}
                role="status"
            >
                <p className="font-medium text-warning-primary">
                    {isProject ? "Talent Fit — données indisponibles" : "Matching talents (workflow)"}
                </p>
                <p className="mt-1 text-tertiary">{error}</p>
            </section>
        );
    }

    if (!data) return null;

    const kpi = data.kpi;
    const s = data.scores;

    return (
        <section className={cx("space-y-6", className)} aria-labelledby={isProject ? "talent-fit-heading" : undefined}>
            <div className="rounded-xl border border-secondary bg-primary p-5 shadow-xs md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">
                    {isProject ? "Compétences" : "WF_Talent_Matching"}
                </p>
                <h2 id={isProject ? "talent-fit-heading" : undefined} className="mt-1 text-lg font-semibold text-primary">
                    {isProject ? "Talent Fit" : "Adéquation talents & disponibilité"}
                </h2>
                <p className="mt-2 text-sm text-tertiary">
                    {isProject
                        ? "Couverture des compétences par rapport aux besoins du projet, disponibilité des ressources et actions suggérées. Valeurs fournies par le workflow métier — aucun score n’est recalculé dans l’interface."
                        : "Scores calculés côté serveur — aucun recalcul côté interface."}
                </p>

                <dl className="mt-4 grid gap-2 text-sm text-tertiary sm:grid-cols-2">
                    <div className="flex justify-between gap-2">
                        <dt className="font-medium text-quaternary">status</dt>
                        <dd className="min-w-0 text-right text-secondary">{data.status ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="font-medium text-quaternary">workflow</dt>
                        <dd className="min-w-0 text-right text-secondary">{data.workflow ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="font-medium text-quaternary">project_id</dt>
                        <dd className="min-w-0 break-all text-right font-mono text-xs text-secondary">{data.project_id}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="font-medium text-quaternary">enterprise_id</dt>
                        <dd className="min-w-0 break-all text-right font-mono text-xs text-secondary">{data.enterprise_id ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="font-medium text-quaternary">analysis_run_id</dt>
                        <dd className="min-w-0 break-all text-right font-mono text-xs text-secondary">{data.analysis_run_id ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="font-medium text-quaternary">meta.analysis_version</dt>
                        <dd className="text-right text-secondary">{data.meta?.analysis_version ?? "—"}</dd>
                    </div>
                </dl>

                <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col rounded-lg bg-secondary px-4 py-3">
                        <dt className="text-xs font-medium text-quaternary">
                            {isProject ? "Adéquation compétences" : "Skills fit"}
                        </dt>
                        <dd className="mt-1 text-lg font-semibold text-primary">
                            {scoreLabel(s?.skills_fit ?? kpi.skills_fit_score)}
                        </dd>
                    </div>
                    <div className="flex flex-col rounded-lg bg-secondary px-4 py-3">
                        <dt className="text-xs font-medium text-quaternary">Disponibilité</dt>
                        <dd className="mt-1 text-lg font-semibold text-primary">
                            {scoreLabel(s?.availability ?? kpi.availability_score)}
                        </dd>
                    </div>
                    <div className="flex flex-col rounded-lg bg-secondary px-4 py-3">
                        <dt className="text-xs font-medium text-quaternary">Score global</dt>
                        <dd className="mt-1 text-lg font-semibold text-primary">
                            {scoreLabel(s?.overall ?? kpi.overall_score)}
                        </dd>
                    </div>
                    <div className="flex flex-col rounded-lg bg-secondary px-4 py-3">
                        <dt className="text-xs font-medium text-quaternary">Talents analysés</dt>
                        <dd className="mt-1 text-lg font-semibold text-primary">{kpi.talents_processed}</dd>
                    </div>
                </dl>

                {data.scores ? (
                    <dl className="mt-4 grid gap-2 rounded-lg border border-dashed border-secondary/80 px-3 py-2 text-xs text-tertiary sm:grid-cols-3">
                        <div>
                            <dt className="font-medium text-quaternary">scores.skills_fit</dt>
                            <dd className="font-mono text-secondary">{data.scores.skills_fit}</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-quaternary">scores.availability</dt>
                            <dd className="font-mono text-secondary">{data.scores.availability}</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-quaternary">scores.overall</dt>
                            <dd className="font-mono text-secondary">{data.scores.overall}</dd>
                        </div>
                    </dl>
                ) : null}

                {(data.meta?.computed_at != null || isProject) && (
                    <p className="mt-4 text-xs text-quaternary">
                        {data.meta?.computed_at != null ? (
                            <>
                                meta.computed_at : {String(data.meta.computed_at)}
                                {data.meta.scenario_type != null ? ` · meta.scenario_type : ${String(data.meta.scenario_type)}` : ""}
                            </>
                        ) : null}
                        {isProject ? (
                            <span className={data.meta?.computed_at != null ? "mt-1 block" : "block"}>
                                Source analyse : WF_Talent_Matching
                            </span>
                        ) : null}
                    </p>
                )}

                {data.raw != null ? (
                    <details className="mt-4 rounded-lg border border-dashed border-secondary/80 bg-primary_alt/20 p-3">
                        <summary className="cursor-pointer text-xs font-medium text-secondary">JSON brut (WF_Talent_Matching)</summary>
                        <pre className="mt-2 max-h-64 overflow-auto font-mono text-xs text-tertiary">
                            {JSON.stringify(data.raw, null, 2)}
                        </pre>
                    </details>
                ) : null}
            </div>

            {data.explanation ? (
                <div className="rounded-xl border border-secondary bg-primary p-5 shadow-xs md:p-6">
                    <h3 className="text-sm font-semibold text-primary">Synthèse</h3>
                    <p className="mt-2 text-sm leading-relaxed text-tertiary">{data.explanation}</p>
                </div>
            ) : null}

            {data.recommended_actions.length > 0 ? (
                <RecommendedActionsTable actions={data.recommended_actions} variant={variant} />
            ) : null}
        </section>
    );
}

function RecommendedActionsTable({
    actions,
    variant,
}: {
    actions: TalentMatchingRecommendedAction[];
    variant: TalentMatchingPanelVariant;
}) {
    const rows = useMemo<ActionRow[]>(
        () => actions.map((a, i) => ({ ...a, id: `recommended-action-${i}` })),
        [actions],
    );
    const isProject = variant === "project";

    return (
        <TableCard.Root size="sm">
            <TableCard.Header
                title={isProject ? "Actions recommandées pour le projet" : "Actions RH recommandées"}
                description={
                    isProject
                        ? "Pistes RH (recrutement, formation, mobilité) proposées par l’analyse — à valider selon votre process."
                        : "Propositions issues de l’analyse (recrutement, formation, etc.)."
                }
            />
            <Table aria-label="Actions recommandées" className="min-w-full">
                <Table.Header>
                    <Table.Head id="type" label="type" />
                    <Table.Head id="skill" label="skill" />
                    <Table.Head id="talent" label="talent" />
                    <Table.Head id="reason" label="reason" />
                </Table.Header>
                <Table.Body items={rows}>
                    {(action) => (
                        <Table.Row id={action.id}>
                            <Table.Cell>
                                <Badge type="pill-color" size="sm" color="brand">
                                    {action.type || "—"}
                                </Badge>
                            </Table.Cell>
                            <Table.Cell>
                                <span className="text-sm text-primary">{action.skill ?? "—"}</span>
                            </Table.Cell>
                            <Table.Cell>
                                <span className="text-sm text-primary">{action.talent ?? "—"}</span>
                            </Table.Cell>
                            <Table.Cell>
                                <span className="text-sm text-tertiary">{action.reason ?? "—"}</span>
                            </Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
        </TableCard.Root>
    );
}
