import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "@untitledui/icons";
import {
    getProjectDetails,
    getProjectRisks,
    getProjectTalents,
    getProjectViability,
    type ProjectDetailsResponse,
    type ProjectRisksResponse,
    type ProjectTalentsResponse,
    type ProjectViabilityResponse,
} from "@/api/project-by-id.api";
import { postCopilotProjectWhatIf } from "@/api/copilot.api";
import { Button } from "@/components/base/buttons/button";
import { ManagerProjectDetailBody } from "@/components/project/manager-project-detail-body";
import { ProjectWhatIfSimulator, type WhatIfResult } from "@/components/project/project-what-if-simulator";
import { RequestRhActionModal } from "@/components/project/request-rh-action-modal";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePostRhActionMutation } from "@/hooks/use-rh-actions-query";
import { useProjectDetail } from "@/hooks/use-project-detail";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { useToast } from "@/providers/toast-provider";
import { unwrapDataPayload } from "@/utils/unwrap-api-payload";

type LoadState = "loading" | "success" | "error";

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) return [];
    return value.map((item) => asRecord(item));
}

function readText(value: unknown): string {
    return value == null ? "—" : String(value);
}

function readNumber(value: unknown): string {
    return typeof value === "number" && Number.isFinite(value) ? String(value) : "—";
}

function formatRecommendationAction(action: unknown): string {
    if (typeof action === "string") return action;
    if (!action || typeof action !== "object") return "Action non détaillée";
    const row = action as Record<string, unknown>;
    const parts = [row.type, row.skill, row.talent, row.reason].filter((p) => p != null && String(p).trim().length > 0);
    return parts.length > 0 ? parts.map((p) => String(p)).join(" - ") : "Action non détaillée";
}

function getDecisionBadgeClass(decision: unknown): string {
    const value = String(decision ?? "").trim().toLowerCase();
    if (value === "continue") return "bg-success-secondary text-success-primary ring-success-secondary";
    if (value === "adjust") return "bg-warning-secondary text-warning-primary ring-warning-secondary";
    if (value === "stop") return "bg-error-secondary text-error-primary ring-error-secondary";
    return "bg-primary_alt text-tertiary ring-secondary";
}

function getGlobalDecisionMessage(decision: unknown): { text: string; className: string } {
    const value = String(decision ?? "").trim().toLowerCase();
    if (value === "continue") {
        return { text: "🟢 Projet stable", className: "text-success-primary bg-success-secondary/40 border-success-secondary" };
    }
    if (value === "adjust") {
        return {
            text: "🟠 Projet sous tension — ajustement recommande",
            className: "text-warning-primary bg-warning-secondary/40 border-warning-secondary",
        };
    }
    if (value === "stop") {
        return { text: "🔴 Projet critique", className: "text-error-primary bg-error-secondary/40 border-error-secondary" };
    }
    return { text: "Statut de decision indisponible", className: "text-tertiary bg-primary_alt border-secondary" };
}

function extractTalentOptions(talents: ProjectTalentsResponse | null): { id: string; label: string }[] {
    const t = asRecord(talents);
    const keys = ["members", "talents", "items", "rows"];
    for (const k of keys) {
        const arr = t[k];
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const seen = new Set<string>();
        const out: { id: string; label: string }[] = [];
        for (let i = 0; i < arr.length; i++) {
            const r = asRecord(arr[i]);
            const id = String(r.talent_id ?? r.id ?? r.talentId ?? "").trim() || `row-${i}`;
            if (seen.has(id)) continue;
            seen.add(id);
            const label = String(r.name ?? r.full_name ?? r.email ?? id).trim() || id;
            out.push({ id, label });
        }
        return out;
    }
    return [];
}

function formatExplanationText(explanation: unknown): string {
    const text = String(explanation ?? "").trim();
    if (!text) return "Analyse IA indisponible pour le moment.";
    const cleaned = text
        .replace(/score\s*=\s*[^.]+/gi, "")
        .replace(/\|\s*/g, ", ")
        .replace(/\s{2,}/g, " ")
        .trim();
    return cleaned.length > 0 ? cleaned : "Analyse IA disponible, mais necessite une interpretation metier.";
}

export function ProjectDetailsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const paths = useWorkspacePaths();
    const { push } = useToast();
    const isManager = user?.role === "manager";
    const enterpriseIdLegacy = (user?.enterpriseId ?? (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined) ?? "").trim();
    const enterpriseIdForCrud = enterpriseIdLegacy || undefined;
    const postRhAction = usePostRhActionMutation();
    const { projectId: routeProjectId } = useParams<{ projectId: string }>();
    const projectId = routeProjectId ?? "";

    const [state, setState] = useState<LoadState>("loading");
    const [error, setError] = useState<string | null>(null);
    const [details, setDetails] = useState<ProjectDetailsResponse | null>(null);
    const [talents, setTalents] = useState<ProjectTalentsResponse | null>(null);
    const [risks, setRisks] = useState<ProjectRisksResponse | null>(null);
    const [viability, setViability] = useState<ProjectViabilityResponse | null>(null);
    const [rhActionOpen, setRhActionOpen] = useState(false);
    const managerDetailQuery = useProjectDetail(projectId, isManager);

    useEffect(() => {
        if (!isManager || !managerDetailQuery.error) return;
        const err = managerDetailQuery.error as { status?: number };
        if (err.status === 401) {
            void navigate("/login");
            return;
        }
        if (err.status === 403) push("Accès refusé", "error");
        if (err.status != null && err.status >= 500) push("Erreur serveur, réessayer", "error");
    }, [isManager, managerDetailQuery.error, navigate, push]);

    const loadData = useCallback(async () => {
        if (!projectId) {
            setState("error");
            setError("Identifiant projet manquant.");
            return;
        }

        setState("loading");
        setError(null);
        try {
            if (isManager) {
                setState("success");
                return;
            } else {
                const [detailsRes, talentsRes, risksRes, viabilityRes] = await Promise.all([
                    getProjectDetails(projectId, enterpriseIdForCrud),
                    getProjectTalents(projectId, enterpriseIdForCrud),
                    getProjectRisks(projectId, enterpriseIdForCrud),
                    getProjectViability(projectId, enterpriseIdForCrud),
                ]);
                setDetails(detailsRes);
                setTalents(talentsRes);
                setRisks(risksRes);
                setViability(viabilityRes);
            }
            setState("success");
        } catch (e) {
            setState("error");
            setError(e instanceof Error ? e.message : "Erreur de chargement de la fiche projet.");
        }
    }, [enterpriseIdForCrud, isManager, projectId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const talentOptions = useMemo(() => extractTalentOptions(talents), [talents]);

    const runWhatIf = useCallback(
        async (modifications: Record<string, unknown>) => {
            if (!projectId) throw new Error("Identifiant projet manquant.");
            if (isManager) {
                const scenario = {
                    name: String(modifications.scenario_type ?? "what-if"),
                    allocation_pct: modifications.allocation_pct,
                    added_talent_id: modifications.added_talent_id ?? null,
                    training_skill_id: modifications.training_skill_id ?? null,
                };
                const raw = await postCopilotProjectWhatIf(projectId, {
                    scenarios: [scenario],
                    modifications,
                });
                return unwrapDataPayload(raw) as WhatIfResult;
            }
            const response = await fetch("/api/project/what-if", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_id: projectId, modifications }),
            });
            if (!response.ok) throw new Error(`What-if API error: ${response.status}`);
            return (await response.json()) as WhatIfResult;
        },
        [isManager, projectId],
    );

    const projectTitle = useMemo(() => {
        const d = asRecord(details);
        const name = d.name;
        if (typeof name === "string" && name.trim()) return name;
        return projectId ? `Projet ${projectId}` : "Fiche projet";
    }, [details, projectId]);

    const copilotProjectChatPayload = useMemo(() => {
        const d = asRecord(details);
        const detailsKpi = asRecord(d.kpi);
        const vi = asRecord(viability);
        const risksData = asRecord(risks);
        const talentsData = asRecord(talents);
        const risksAlerts = asArray(risksData.alerts);
        const talentRows = asArray(talentsData.members ?? talentsData.talents ?? talentsData.items);
        return {
            project: {
                id: projectId,
                name: readText(d.name),
                status: readText(d.status),
                viability: readNumber(vi.viability_score),
                health: readNumber(detailsKpi.project_health_score),
                decision: readText(vi.decision),
                risk: readText(asRecord(risksData.kpi ?? {}).severity_label),
            },
            talents: talentRows.map((t) => ({
                name: readText(t.name),
                role: readText(t.role),
                allocation: readText(t.allocation_pct ?? t.allocation),
                workload: readText(t.workload ?? t.load),
            })),
            risks: risksAlerts,
            aiExplanation: readText(vi.explanation),
        };
    }, [projectId, details, talents, risks, viability]);

    useCopilotPage("project_detail", projectTitle, { projectId, entityLabel: projectTitle });
    useCopilotPage(isManager ? "manager_project_detail" : "project_detail_workspace", copilotProjectChatPayload);

    if (isManager && managerDetailQuery.isLoading) {
        return <LoadingState label="Chargement de la fiche projet..." size="md" />;
    }

    if (isManager && managerDetailQuery.isError) {
        return (
            <div className="space-y-6">
                <Button color="secondary" size="sm" iconLeading={ArrowLeft} href={paths.projects}>
                    Retour aux projets
                </Button>
                <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                    <ErrorState title="Erreur de chargement" message="Fiche projet indisponible." onRetry={() => void managerDetailQuery.refetch()} retryLabel="Reessayer" />
                </div>
            </div>
        );
    }

    if (isManager && managerDetailQuery.data) {
        return (
            <>
                <ManagerProjectDetailBody
                    project={managerDetailQuery.data}
                    onOpenRh={() => setRhActionOpen(true)}
                />
                <RequestRhActionModal
                    open={rhActionOpen}
                    onOpenChange={setRhActionOpen}
                    projectId={projectId}
                    onSubmit={async (body) => {
                        await postRhAction.mutateAsync(body);
                    }}
                />
            </>
        );
    }

    if (state === "loading") {
        return <LoadingState label="Chargement de la fiche projet..." size="md" />;
    }

    if (state === "error") {
        return (
            <div className="space-y-6">
                <Button color="secondary" size="sm" iconLeading={ArrowLeft} href={paths.projects}>
                    Retour aux projets
                </Button>
                <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                    <ErrorState title="Erreur de chargement" message={error ?? "Erreur inconnue"} onRetry={loadData} retryLabel="Reessayer" />
                </div>
            </div>
        );
    }

    const detailsData = asRecord(details);
    const detailsKpi = asRecord(detailsData.kpi);
    const risksData = asRecord(risks);
    const risksKpi = asRecord(risksData.kpi);
    const risksAlerts = asArray(risksData.alerts);
    const talentsData = asRecord(talents);
    const talentsKpi = asRecord(talentsData.kpi);
    const viabilityData = asRecord(viability);
    const viabilityRecommendation = asRecord(viabilityData.recommendation);
    const recommendationActions = Array.isArray(viabilityRecommendation.actions) ? viabilityRecommendation.actions : [];
    const talentActions = Array.isArray(talentsData.recommended_actions) ? talentsData.recommended_actions : [];
    const skillsFitScore = Number(talentsKpi.skills_fit_score ?? 0);
    const availabilityScore = Number(talentsKpi.availability_score ?? 0);
    const overallScore = Number(talentsKpi.overall_score ?? 0);
    const noTalentInsights =
        !Number.isFinite(skillsFitScore) ||
        !Number.isFinite(availabilityScore) ||
        !Number.isFinite(overallScore) ||
        (skillsFitScore === 0 && availabilityScore === 0 && overallScore === 0);
    const globalDecisionMessage = getGlobalDecisionMessage(viabilityData.decision);

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <div className="flex flex-wrap items-center gap-2">
                    <Button color="secondary" size="sm" iconLeading={ArrowLeft} href={paths.projects}>
                        Retour aux projets
                    </Button>
                    {isManager ? (
                        <Button color="secondary" size="sm" onClick={() => setRhActionOpen(true)}>
                            Demander une action RH
                        </Button>
                    ) : null}
                </div>
                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">{projectTitle}</h1>
                <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${globalDecisionMessage.className}`}>
                    {globalDecisionMessage.text}
                </div>
            </header>

            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Header stratégique</p>
                <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                    <div className="rounded-xl border border-secondary bg-primary_alt/30 p-4">
                        <dt className="text-quaternary">Score de viabilite</dt>
                        <dd className="mt-2 text-display-sm font-semibold leading-none text-primary">
                            {readNumber(viabilityData.viability_score)}
                        </dd>
                    </div>
                    <div className="rounded-xl border border-secondary bg-primary_alt/30 p-4">
                        <dt className="text-quaternary">Decision</dt>
                        <dd className="mt-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${getDecisionBadgeClass(viabilityData.decision)}`}>
                                {readText(viabilityData.decision)}
                            </span>
                        </dd>
                    </div>
                    <div>
                        <dt className="text-quaternary">Synthese de recommandation</dt>
                        <dd className="text-secondary">{readText(viabilityRecommendation.summary)}</dd>
                    </div>
                    <div>
                        <dt className="text-quaternary">Derniere analyse</dt>
                        <dd className="text-secondary">{readText(viabilityData.computed_at)}</dd>
                    </div>
                </dl>
            </section>

            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">KPI projet</p>
                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-secondary bg-primary_alt/30 p-4"><dd className="text-2xl font-semibold text-primary">{readNumber(detailsKpi.progress_pct)}</dd><dt className="mt-1 text-xs text-quaternary">Avancement</dt><p className="mt-1 text-xs text-tertiary">Avancement du projet</p></div>
                    <div className="rounded-xl border border-secondary bg-primary_alt/30 p-4"><dd className="text-2xl font-semibold text-primary">{readNumber(detailsKpi.delay_days)}</dd><dt className="mt-1 text-xs text-quaternary">Retard (jours)</dt><p className="mt-1 text-xs text-tertiary">Retard cumule</p></div>
                    <div className="rounded-xl border border-secondary bg-primary_alt/30 p-4"><dd className="text-2xl font-semibold text-primary">{readNumber(detailsKpi.capacity_load_pct)}</dd><dt className="mt-1 text-xs text-quaternary">Charge capacitaire</dt><p className="mt-1 text-xs text-tertiary">Pression sur les ressources</p></div>
                    <div className="rounded-xl border border-secondary bg-primary_alt/30 p-4"><dd className="text-2xl font-semibold text-primary">{readNumber(detailsKpi.time_to_impact_days)}</dd><dt className="mt-1 text-xs text-quaternary">Temps vers impact (jours)</dt><p className="mt-1 text-xs text-tertiary">Delai avant benefices metier</p></div>
                    <div className="rounded-xl border border-secondary bg-primary_alt/30 p-4"><dd className="text-2xl font-semibold text-primary">{readNumber(detailsKpi.strategic_alignment_score)}</dd><dt className="mt-1 text-xs text-quaternary">Alignement strategique</dt><p className="mt-1 text-xs text-tertiary">Cohérence avec les priorites</p></div>
                    <div className="rounded-xl border border-secondary bg-primary_alt/30 p-4"><dd className="text-2xl font-semibold text-primary">{readNumber(detailsKpi.project_health_score)}</dd><dt className="mt-1 text-xs text-quaternary">Sante globale projet</dt><p className="mt-1 text-xs text-tertiary">Etat global de pilotage</p></div>
                </dl>
            </section>

            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Risques & signaux faibles</p>
                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <div><dt className="text-quaternary">Fragilite</dt><dd className="text-primary">{readNumber(risksKpi.fragility_score)}</dd></div>
                    <div><dt className="text-quaternary">Dependances critiques</dt><dd className="text-primary">{readNumber(risksKpi.dependency_score)}</dd></div>
                    <div><dt className="text-quaternary">Pulse anxiete</dt><dd className="text-primary">{readNumber(risksKpi.anxiety_pulse)}</dd></div>
                    <div><dt className="text-quaternary">Niveau de severite</dt><dd className="text-primary">{readText(risksKpi.severity_label)}</dd></div>
                </dl>
                <div className="mt-4 space-y-2">
                    {risksAlerts.length === 0 ? (
                        <p className="inline-flex items-center gap-2 rounded-lg border border-success-secondary bg-success-secondary/30 px-3 py-2 text-sm font-medium text-success-primary">
                            <span>✔</span>
                            <span>Aucun risque détecté</span>
                        </p>
                    ) : (
                        risksAlerts.map((alert, index) => (
                            <div key={`${readText(alert.severity)}-${index}`} className="rounded-lg border border-secondary/80 bg-primary_alt/30 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Alerte - {readText(alert.severity)}</p>
                                <p className="mt-1 text-sm text-secondary">{readText(alert.description)}</p>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Talents & compétences</p>
                {noTalentInsights ? (
                    <p className="mt-4 text-sm font-medium text-warning-primary">Données insuffisantes pour analyse</p>
                ) : (
                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                        <div><dt className="text-quaternary">Adequation competences</dt><dd className="text-primary">{readNumber(talentsKpi.skills_fit_score)}</dd></div>
                        <div><dt className="text-quaternary">Disponibilite talents</dt><dd className="text-primary">{readNumber(talentsKpi.availability_score)}</dd></div>
                        <div><dt className="text-quaternary">Score global talent</dt><dd className="text-primary">{readNumber(talentsKpi.overall_score)}</dd></div>
                    </dl>
                )}
                <div className="mt-4">
                    <p className="text-sm font-medium text-primary">Actions recommandees</p>
                    {talentActions.length === 0 ? (
                        <p className="mt-1 text-sm text-tertiary">Aucune action recommandée.</p>
                    ) : (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary">
                            {talentActions.map((action, index) => (
                                <li key={`talent-action-${index}`}>{readText(action)}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Recommandation IA</p>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-xl border border-secondary bg-primary_alt/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Analyse IA</p>
                        <p className="mt-2 text-secondary">{formatExplanationText(viabilityData.explanation)}</p>
                    </div>
                    <div className="rounded-xl border border-secondary bg-primary_alt/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Actions</p>
                        {recommendationActions.length === 0 ? (
                            <p className="mt-2 text-tertiary">Aucune action concrete recommandee.</p>
                        ) : (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-secondary">
                                {recommendationActions.map((action, index) => (
                                    <li key={`viability-action-${index}`}>{formatRecommendationAction(action)}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </section>

            <ProjectWhatIfSimulator onSimulate={runWhatIf} talentOptions={talentOptions} />

            <RequestRhActionModal
                open={rhActionOpen}
                onOpenChange={setRhActionOpen}
                projectId={projectId}
                onSubmit={async (body) => {
                    await postRhAction.mutateAsync(body);
                }}
            />
        </div>
    );
}
