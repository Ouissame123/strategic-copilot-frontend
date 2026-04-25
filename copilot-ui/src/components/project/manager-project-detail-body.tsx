import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, HeartHexagon, Stars01, Users01 } from "@untitledui/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { useCopilotDecision } from "@/hooks/use-copilot-decision";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { ProjectDetail, Severity } from "@/api/workspace-manager.api";
import { cx } from "@/utils/cx";
import { AgentTracePanel } from "@/features/manager/project-detail/components/agent-trace-panel";
import { buildAgentTraces } from "@/features/manager/project-detail/agent-trace";
import type { AgentKey } from "@/features/manager/project-detail/types";
import { useRecomputeAgent } from "@/features/manager/project-detail/use-recompute-agent";
import { useRhActionsListQuery } from "@/hooks/use-rh-actions-query";
import { rowsFromRhActionsPayload } from "@/utils/rh-actions-list";

type DecisionChoice = "Continue" | "Adjust" | "Stop";

type DriverRow = { key: string; label: string; value: number | null };

function scoreText(value: number | null | undefined, suffix = ""): string {
    if (value == null) return "—";
    return `${value.toFixed(1)}${suffix}`;
}

function statusTone(status: string): string {
    const s = status.toLowerCase();
    if (s === "active") return "bg-success-secondary text-success-primary";
    if (s === "completed") return "bg-secondary text-tertiary";
    if (s === "paused") return "bg-warning-secondary text-warning-primary";
    return "bg-secondary text-tertiary";
}

function severityTone(severity: Severity): string {
    if (severity === "critical" || severity === "high") return "bg-error-secondary text-error-primary";
    if (severity === "medium") return "bg-warning-secondary text-warning-primary";
    return "bg-success-secondary text-success-primary";
}

function riskTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        critical_skills_gap: "Compétences critiques",
        resource_overload: "Surcharge ressources",
    };
    return labels[type] ?? type;
}

function budgetBadge(score: number | null | undefined): { label: string; tone: "ok" | "warn" | "risk" | "neutral" } {
    if (score == null) return { label: "—", tone: "neutral" };
    if (score >= 7) return { label: "OK", tone: "ok" };
    if (score >= 5) return { label: "Tendu", tone: "warn" };
    return { label: "Critique", tone: "risk" };
}

function chargeBadge(load: number | null | undefined): { label: string; tone: "ok" | "warn" | "risk" | "neutral" } {
    if (load == null) return { label: "—", tone: "neutral" };
    if (load < 80) return { label: "OK", tone: "ok" };
    if (load < 100) return { label: "Tendu", tone: "warn" };
    return { label: "Surchargé", tone: "risk" };
}

function pillClass(tone: "ok" | "warn" | "risk" | "neutral"): string {
    if (tone === "ok") return "bg-success-secondary text-success-primary";
    if (tone === "warn") return "bg-warning-secondary text-warning-primary";
    if (tone === "risk") return "bg-error-secondary text-error-primary";
    return "bg-secondary text-tertiary";
}

function freshnessDays(lastRunAt: string | null): number | null {
    if (!lastRunAt) return null;
    const ts = new Date(lastRunAt).getTime();
    if (!Number.isFinite(ts)) return null;
    return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
}

function driverTone(value: number | null): string {
    if (value == null) return "bg-secondary";
    if (value >= 7) return "bg-error-secondary";
    if (value >= 5) return "bg-warning-secondary";
    return "bg-success-secondary";
}

function toDriverRows(project: ProjectDetail): DriverRow[] {
    const drivers = project.risk_score?.drivers;
    return [
        { key: "anxiety_pulse", label: "Pouls d'anxiété", value: drivers?.anxiety_pulse ?? null },
        { key: "chronic_overload", label: "Surcharge chronique", value: drivers?.chronic_overload ?? null },
        { key: "skills_gap", label: "Écart de compétences", value: drivers?.skills_gap ?? null },
        { key: "talent_dependency", label: "Dépendance talent", value: drivers?.talent_dependency ?? null },
    ];
}

function rhStatusLabel(raw: unknown): string {
    const s = String(raw ?? "").trim().toLowerCase();
    if (!s) return "—";
    if (s.includes("pend") || s === "open" || s === "submitted" || s === "new") return "En attente";
    if (s.includes("accept") || s.includes("approved") || s.includes("valid") || s.includes("done") || s.includes("closed")) return "Acceptée";
    if (s.includes("refus") || s.includes("reject") || s.includes("declin") || s.includes("cancel")) return "Refusée";
    return String(raw);
}

function rhDate(value: unknown): string {
    if (value == null || String(value).trim() === "") return "—";
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("fr-FR");
}

export type ManagerProjectDetailBodyProps = {
    project: ProjectDetail;
    onOpenRh: () => void;
};

export function ManagerProjectDetailBody({ project, onOpenRh }: ManagerProjectDetailBodyProps) {
    const TALENTS_PER_PAGE = 4;
    const { t } = useTranslation("common");
    const qc = useQueryClient();
    const { push } = useToast();
    const { saveDecision, loading: savingDecision, resetError } = useCopilotDecision();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [focusAgent, setFocusAgent] = useState<AgentKey | null>(null);
    const [currentTalentsPage, setCurrentTalentsPage] = useState(1);
    const viability = project.viability;
    const analysis = project.analysis;
    const decision = viability?.decision ?? null;
    const [selectedDecision, setSelectedDecision] = useState<DecisionChoice>(decision ?? "Adjust");

    const traces = useMemo(() => buildAgentTraces(project), [project]);
    const recomputeMutation = useRecomputeAgent(project.id);
    const rhActionsQuery = useRhActionsListQuery();
    const staleDays = useMemo(() => {
        const staleRuns = traces
            .filter((trace) => trace.freshness === "stale")
            .map((trace) => freshnessDays(trace.last_run_at))
            .filter((days): days is number => days != null);
        return staleRuns.length ? Math.max(...staleRuns) : null;
    }, [traces]);

    const recommendation = viability?.explanation ?? project.recommendations[0]?.description ?? "—";
    const budget = budgetBadge(viability?.score_budget);
    const charge = chargeBadge(analysis?.capacity_load_pct);
    const riskScore = project.risk_score?.fragility_score ?? null;
    const driverRows = useMemo(() => toDriverRows(project), [project]);
    const totalTalentsPages = Math.max(1, Math.ceil(project.talents.length / TALENTS_PER_PAGE));
    const visibleTalents = useMemo(() => {
        const start = (currentTalentsPage - 1) * TALENTS_PER_PAGE;
        return project.talents.slice(start, start + TALENTS_PER_PAGE);
    }, [currentTalentsPage, project.talents]);
    const visibleTalentsStart = project.talents.length === 0 ? 0 : (currentTalentsPage - 1) * TALENTS_PER_PAGE + 1;
    const visibleTalentsEnd = Math.min(currentTalentsPage * TALENTS_PER_PAGE, project.talents.length);
    const rhProjectRows = useMemo(() => {
        const rows = rowsFromRhActionsPayload(rhActionsQuery.data);
        return rows
            .filter((row) => String(row.project_id ?? "").trim() === project.id)
            .sort((a, b) => {
                const ta = new Date(String(a.created_at ?? a.updated_at ?? 0)).getTime();
                const tb = new Date(String(b.created_at ?? b.updated_at ?? 0)).getTime();
                return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
            });
    }, [project.id, rhActionsQuery.data]);

    const openPanelFor = (agent: AgentKey) => {
        setFocusAgent(agent);
        setPanelOpen(true);
    };

    useEffect(() => {
        setCurrentTalentsPage((prev) => Math.min(prev, totalTalentsPages));
    }, [totalTalentsPages]);

    const rerunAll = async () => {
        const rerunnable = traces.filter((trace) => trace.can_rerun && trace.key !== "helper");
        await Promise.allSettled(rerunnable.map((trace) => recomputeMutation.mutateAsync(trace.key)));
    };

    const submitDecision = async () => {
        resetError();
        try {
            await saveDecision({ scope: "project_detail", project_id: project.id, decision: selectedDecision });
            push("Décision enregistrée côté serveur.", "success");
            void qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(project.id) });
            setConfirmOpen(false);
        } catch (e) {
            push(e instanceof Error ? e.message : "Échec de l’enregistrement.", "error");
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <AgentTracePanel isOpen={panelOpen} onOpenChange={setPanelOpen} project={project} focusAgent={focusAgent} />

            {staleDays != null ? (
                <section className="rounded-xl border border-warning-secondary bg-warning-secondary/20 px-4 py-3 text-sm text-warning-primary">
                    ⚠️ Analyse partielle périmée (dernière exécution il y a {staleDays} jours)
                    <button type="button" className="ml-2 underline" onClick={() => void rerunAll()}>
                        {t("managerProjectDetail.agents.rerunAll", { defaultValue: "Tout relancer" })}
                    </button>
                </section>
            ) : null}

            <section className="rounded-2xl border border-secondary bg-primary p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-lg font-semibold text-primary">{project.name}</h1>
                        <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", statusTone(project.status))}>
                            {project.status}
                        </span>
                    </div>
                    <Button size="sm" color="secondary" onClick={() => setPanelOpen(true)}>
                        🤖 Agents ({traces.length})
                    </Button>
                </div>
                <p className="mt-2 text-sm text-tertiary">
                    Viabilité: <span className="font-semibold text-primary">{scoreText(viability?.viability_score, " /10")}</span> · Santé:{" "}
                    <span className="font-semibold text-primary">{scoreText(analysis?.project_health_score)}</span>
                </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                    <section className="relative rounded-2xl border border-secondary bg-primary p-5">
                    <button type="button" aria-label="Agent Analyst" className="absolute right-3 top-3 text-sm" onClick={() => openPanelFor("analyst")}>
                        🤖
                    </button>
                    <header className="mb-4 flex items-center gap-2">
                        <HeartHexagon className="size-4 text-violet-500" />
                        <h2 className="text-sm font-semibold text-primary">Santé projet</h2>
                    </header>
                    {analysis == null ? (
                        <div className="space-y-2">
                            <div className="h-4 w-full animate-pulse rounded bg-secondary" />
                            <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
                        </div>
                    ) : (
                        <div className="space-y-2 text-sm">
                            <p>Progression: {analysis.progress_pct == null ? "—" : `${analysis.progress_pct}%`}</p>
                            <p>Santé globale: {scoreText(analysis.project_health_score, " /10")}</p>
                            <p>Viabilité IA: {scoreText(viability?.viability_score, " /10")}</p>
                            <div className="flex flex-wrap gap-2">
                                <span className={cx("rounded-full px-2 py-0.5 text-xs", pillClass("neutral"))}>
                                    Retard: {analysis.delay_days == null ? "—" : analysis.delay_days === 0 ? "Aucun" : `${analysis.delay_days}j`}
                                </span>
                                <span className={cx("rounded-full px-2 py-0.5 text-xs", pillClass(budget.tone))}>Budget: {budget.label}</span>
                                <span className={cx("rounded-full px-2 py-0.5 text-xs", pillClass(charge.tone))}>Charge: {charge.label}</span>
                            </div>
                        </div>
                    )}
                    </section>

                    <section className="relative rounded-2xl border border-secondary bg-primary p-5">
                    <button type="button" aria-label="Agent Watchdog" className="absolute right-3 top-3 text-sm" onClick={() => openPanelFor("watchdog")}>
                        🤖
                    </button>
                    <header className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="size-4 text-error-primary" />
                            <h2 className="text-sm font-semibold text-primary">Risques</h2>
                        </div>
                        <Button color="tertiary" size="sm" onClick={onOpenRh}>Demander au RH</Button>
                    </header>

                    {analysis?.alerts?.length ? (
                        <div className="mb-3 space-y-1">
                            {analysis.alerts.map((alert) => (
                                <p key={`${alert.code}-${alert.type}`} className="rounded-lg border border-brand-secondary bg-brand-primary_alt px-3 py-2 text-xs text-brand-secondary">
                                    {alert.description}
                                </p>
                            ))}
                        </div>
                    ) : null}

                    {project.risks.length === 0 ? (
                        <p className="text-sm text-tertiary">Aucun risque listé</p>
                    ) : (
                        <div className="space-y-2">
                            {project.risks.map((risk) => (
                                <div key={risk.id} className="rounded-lg border border-secondary p-3 text-sm">
                                    <span className={cx("rounded-full px-2 py-0.5 text-xs", severityTone(risk.severity))}>{risk.severity}</span>
                                    <p className="mt-1 font-semibold text-primary">{risk.message}</p>
                                    <p className="text-tertiary">{riskTypeLabel(risk.risk_type)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-3 flex gap-2 text-xs">
                        <span className={cx("rounded-full px-2 py-0.5", pillClass("neutral"))}>Risque global: {scoreText(riskScore, " /10")}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                        {driverRows.map((driver) => (
                            <div key={driver.key}>
                                <div className="mb-1 flex justify-between text-xs text-tertiary">
                                    <span>{driver.label}</span>
                                    <span>{scoreText(driver.value, " /10")}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-secondary">
                                    <div
                                        className={cx("h-full rounded-full", driverTone(driver.value))}
                                        style={{ width: `${Math.max(0, Math.min(100, (driver.value ?? 0) * 10))}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="relative rounded-2xl border border-secondary bg-primary p-5">
                    <button type="button" aria-label="Agent Strategist" className="absolute right-3 top-3 text-sm" onClick={() => openPanelFor("strategist")}>
                        🤖
                    </button>
                    <header className="mb-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Stars01 className="size-4 text-amber-500" />
                            <h2 className="text-sm font-semibold text-primary">Décision IA</h2>
                        </div>
                        {viability != null ? (
                            <span className="rounded-full bg-brand-primary_alt px-2.5 py-0.5 text-xs font-semibold text-brand-secondary">
                                {scoreText(viability.viability_score, " /10")}
                            </span>
                        ) : null}
                    </header>
                    {viability == null ? (
                        <div className="space-y-2 text-sm">
                            <p className="text-tertiary">Analyse non disponible</p>
                            <Button color="secondary" size="sm">Lancer une analyse</Button>
                        </div>
                    ) : (
                        <>
                            <p className="text-3xl font-semibold text-primary">{scoreText(viability.viability_score, " /10")}</p>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {(["Continue", "Adjust", "Stop"] as const).map((choice) => (
                                    <button
                                        key={choice}
                                        type="button"
                                        className={cx(
                                            "rounded-lg border px-2 py-1 text-sm",
                                            selectedDecision === choice ? "border-primary text-primary" : "border-secondary text-tertiary",
                                        )}
                                        onClick={() => setSelectedDecision(choice)}
                                    >
                                        {choice}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-3 text-sm text-secondary">Recommandation IA: {recommendation}</p>
                            <div className="mt-3 flex justify-end">
                                <Button color="primary" size="sm" isLoading={savingDecision} onClick={() => setConfirmOpen(true)}>
                                    Confirmer {selectedDecision}
                                </Button>
                            </div>
                        </>
                    )}
                    </section>

                    <section className="relative rounded-2xl border border-secondary bg-primary p-5">
                        <button type="button" aria-label="Agent Talent" className="absolute right-3 top-3 text-sm" onClick={() => openPanelFor("talent")}>
                            🤖
                        </button>
                        <header className="mb-4 flex items-center gap-2">
                            <Users01 className="size-4 text-emerald-500" />
                            <h2 className="text-sm font-semibold text-primary">Talents assignés</h2>
                        </header>
                        {project.talents.length === 0 ? (
                            <p className="text-sm text-tertiary">Aucun talent assigné</p>
                        ) : (
                            <div className="space-y-3">
                                {visibleTalents.map((talent) => (
                                    <div key={talent.assignment_id} className="rounded-lg border border-secondary p-3 text-sm">
                                        <p className="font-semibold text-primary">{talent.talent_name}</p>
                                        <p className="text-tertiary">{talent.role_on_project ?? talent.role ?? "—"}</p>
                                        <p className="text-tertiary">{talent.allocation_pct}%</p>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between gap-2 border-t border-secondary pt-2">
                                    <p className="text-xs text-tertiary">
                                        {visibleTalentsStart}-{visibleTalentsEnd} sur {project.talents.length} talents
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            color="secondary"
                                            disabled={currentTalentsPage <= 1}
                                            onClick={() => setCurrentTalentsPage((prev) => Math.max(1, prev - 1))}
                                        >
                                            Précédent
                                        </Button>
                                        <span className="text-xs text-tertiary">
                                            Page {currentTalentsPage} / {totalTalentsPages}
                                        </span>
                                        <Button
                                            size="sm"
                                            color="secondary"
                                            disabled={currentTalentsPage >= totalTalentsPages}
                                            onClick={() => setCurrentTalentsPage((prev) => Math.min(totalTalentsPages, prev + 1))}
                                        >
                                            Suivant
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <section className="rounded-2xl border border-secondary bg-primary p-5">
                <header className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-primary">Historique des actions manager</h2>
                    <Button color="tertiary" size="sm" onClick={onOpenRh}>Nouvelle demande RH</Button>
                </header>
                {rhActionsQuery.isLoading ? (
                    <div className="space-y-2">
                        <div className="h-4 w-full animate-pulse rounded bg-secondary" />
                        <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
                    </div>
                ) : null}
                {!rhActionsQuery.isLoading && rhProjectRows.length === 0 ? (
                    <p className="text-sm text-tertiary">Aucune demande RH liée à ce projet.</p>
                ) : null}
                {!rhActionsQuery.isLoading && rhProjectRows.length > 0 ? (
                    <div className="space-y-2">
                        {rhProjectRows.slice(0, 8).map((row) => (
                            <article key={row.id} className="rounded-lg border border-secondary p-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-secondary" />
                                    <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-primary">{String(row.type ?? "Demande RH")}</p>
                                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary">
                                        {rhStatusLabel(row.status ?? row.state)}
                                    </span>
                                </div>
                                <p className="mt-1 text-secondary">{String(row.message ?? row.body ?? row.description ?? "—")}</p>
                                <p className="mt-1 text-xs text-tertiary">
                                    {rhDate(row.created_at ?? row.updated_at)}
                                    {row.response_message ? ` · Réponse: ${String(row.response_message)}` : ""}
                                </p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : null}
            </section>

            {confirmOpen ? (
                <div className="fixed inset-x-0 bottom-5 z-20 mx-auto w-fit rounded-lg border border-secondary bg-primary p-3 shadow-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-secondary">Enregistrer la décision {selectedDecision} ?</span>
                        <Button size="sm" color="secondary" onClick={() => setConfirmOpen(false)}>Annuler</Button>
                        <Button size="sm" color="primary" isLoading={savingDecision} onClick={() => void submitDecision()}>Confirmer</Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
