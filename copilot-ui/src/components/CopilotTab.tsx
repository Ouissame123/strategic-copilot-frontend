import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { AlertTriangle, Bot, Loader2 } from "lucide-react";
import {
    orchestratorApi,
    type OrchestratorAskDecision,
    type OrchestratorAskResponse,
} from "@/api/orchestrator.api";
import { Button } from "@/components/base/buttons/button";
import { StrategistOptionsPanel } from "@/components/copilot/StrategistOptionsPanel";
import { localeForDateFormatting } from "@/lib/ui-locale";
import i18n from "@/i18n";
import type { MissionControlAiRecommendation } from "@/types/api.types";
import { cx } from "@/utils/cx";

const PROGRESSIVE_HINT_MS = 10_000;
const DEFAULT_QUESTION = "Analyse ce projet.";

export type CopilotTabProps = {
    projectId: string;
    aiRecommendation: MissionControlAiRecommendation | null;
    onNavigateToSimulation: () => void;
    onNavigateToDecisions: () => void;
};

type LiveAnalysis = {
    response: OrchestratorAskResponse;
    receivedAt: string;
};

function decisionDisplayLabel(decision: string | null | undefined): string {
    const d = String(decision ?? "").trim().toLowerCase();
    if (d === "proceed" || d === "continue") return "Poursuivre";
    if (d === "adjust") return "Ajuster";
    if (d === "reject" || d === "stop") return "Arrêter";
    return decision?.trim() || "—";
}

function orchestratorDecisionClass(decision: string | null | undefined): string {
    const d = String(decision ?? "").trim().toLowerCase();
    if (d === "proceed" || d === "continue") return "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200";
    if (d === "adjust") return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
    if (d === "reject" || d === "stop") return "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200";
    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
}

function persistedDecisionClass(decision: string | null | undefined, color?: string | null): string {
    const c = String(color ?? "").toLowerCase();
    if (c === "green") return "border-emerald-300 bg-emerald-100 text-emerald-800";
    if (c === "orange") return "border-amber-300 bg-amber-100 text-amber-900";
    if (c === "red") return "border-red-300 bg-red-100 text-red-800";
    return orchestratorDecisionClass(decision);
}

function formatScore(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return "—";
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatReceivedAt(iso: string): string {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "—";
    return new Date(t).toLocaleString(localeForDateFormatting(i18n.language), {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const AGENT_LABELS: Record<string, string> = {
    project_analysis: "Analyse du projet",
    risk_kpi: "Indicateurs de risque",
    validation_helper: "Validations",
    talent_matching_for_this_specific_project: "Correspondance talents",
    strategist_propose: "Options stratégiques",
    talent_insights_enterprise_wide: "Vue talents entreprise",
};

function agentDisplayLabel(agent: string): string {
    const key = String(agent ?? "").trim();
    if (!key) return "Analyse complémentaire";
    return AGENT_LABELS[key] ?? "Analyse complémentaire";
}

function readAskError(err: unknown): string {
    if (isAxiosError(err)) {
        if (err.code === "ECONNABORTED" || /timeout/i.test(String(err.message))) {
            return "L'analyse prend plus de temps que prévu. Veuillez réessayer.";
        }
        return "Impossible de générer l'analyse pour le moment. Veuillez réessayer.";
    }
    return "Impossible de générer l'analyse pour le moment. Veuillez réessayer.";
}

function AgentTags({ agents }: { agents: string[] }) {
    if (!agents.length) {
        return <p className="text-sm text-slate-500">Aucune source d&apos;analyse disponible.</p>;
    }
    return (
        <div className="flex flex-wrap gap-2">
            {agents.map((agent) => (
                <span
                    key={agent}
                    className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-800 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200"
                >
                    {agentDisplayLabel(agent)}
                </span>
            ))}
        </div>
    );
}

function PersistedRecommendation({ ai }: { ai: MissionControlAiRecommendation }) {
    const decision = ai.decision ?? ai.decision_label ?? null;
    const explanation = ai.explanation?.trim() || null;

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Dernière recommandation
            </p>
            <div className="flex flex-wrap items-end gap-4">
                <span
                    className={cx(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold",
                        persistedDecisionClass(decision, ai.decision_color),
                    )}
                >
                    {ai.decision_icon ? <span aria-hidden>{ai.decision_icon}</span> : null}
                    {decisionDisplayLabel(decision)}
                </span>
                <div>
                    <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatScore(ai.viability_score)}
                        <span className="ml-1 text-base font-medium text-slate-400">/10</span>
                    </p>
                </div>
            </div>
            {explanation ? (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {explanation}
                </p>
            ) : (
                <p className="mt-4 text-sm text-slate-500">
                    Aucune explication disponible pour cette analyse.
                </p>
            )}
            {ai.computed_at ? (
                <p className="mt-3 text-xs text-slate-400">Analysé le {formatReceivedAt(ai.computed_at)}</p>
            ) : null}
        </section>
    );
}

function LiveResult({
    live,
    onNavigateToDecisions,
    onNavigateToSimulation,
}: {
    live: LiveAnalysis;
    onNavigateToDecisions: () => void;
    onNavigateToSimulation: () => void;
}) {
    const { response, receivedAt } = live;
    const decision = String(response.data?.decision ?? "") as OrchestratorAskDecision | string;
    const drivers = Array.isArray(response.data?.key_drivers) ? response.data.key_drivers : [];
    const recommendations = Array.isArray(response.data?.recommendations) ? response.data.recommendations : [];
    const agents = Array.isArray(response.triggered_agents) ? response.triggered_agents : [];
    const pending = Number(response.data?.pending_validations_total ?? 0);
    const fallbackUsed = Boolean(response.meta?.fallback_used);
    const hasPartialIssue = Boolean(response.meta?.agent_error);

    return (
        <div className="space-y-4">
            {fallbackUsed ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    Synthèse détaillée indisponible — résultat basé sur les indicateurs du projet.
                </div>
            ) : null}

            {hasPartialIssue ? (
                <div className="flex gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <p>
                        Une partie de l&apos;analyse n&apos;a pas pu être complétée. Les résultats
                        disponibles restent affichés ci-dessous.
                    </p>
                </div>
            ) : null}

            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-end gap-4">
                    <span
                        className={cx(
                            "inline-flex rounded-full border px-3 py-1 text-sm font-semibold",
                            orchestratorDecisionClass(decision),
                        )}
                    >
                        {decisionDisplayLabel(decision)}
                    </span>
                    <div>
                        <p className="text-4xl font-bold tabular-nums leading-none text-slate-900 dark:text-slate-100">
                            {formatScore(response.data?.final_score)}
                            <span className="ml-1 text-lg font-medium text-slate-400">/10</span>
                        </p>
                    </div>
                    <p className="ml-auto text-xs text-slate-400">
                        Généré le {formatReceivedAt(receivedAt)}
                    </p>
                </div>

                <div className="mt-5">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Analyse détaillée
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                        {response.answer?.trim() || "—"}
                    </p>
                </div>
            </section>

            <StrategistOptionsPanel key={receivedAt} response={response} />

            {drivers.length > 0 ? (
                <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Facteurs clés</h3>
                    <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
                        {drivers.map((driver) => (
                            <li key={driver}>{driver}</li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {recommendations.length > 0 ? (
                <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Recommandations</h3>
                    <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
                        {recommendations.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <section className="rounded-xl border border-primary-200 bg-primary-50/60 p-5 dark:border-primary-900 dark:bg-primary-950/30">
                <h3 className="mb-1 text-sm font-semibold text-primary-900 dark:text-primary-100">
                    Sources de l&apos;analyse
                </h3>
                <p className="mb-3 text-xs text-primary-700/80 dark:text-primary-300/80">
                    Domaines consultés pour produire cette recommandation.
                </p>
                <AgentTags agents={agents} />
            </section>

            {pending > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                    <span>
                        {pending} validation{pending > 1 ? "s" : ""} en attente liée
                        {pending > 1 ? "s" : ""} à ce projet.
                    </span>
                    <button
                        type="button"
                        onClick={onNavigateToDecisions}
                        className="font-medium text-primary-700 underline hover:text-primary-900 dark:text-primary-300"
                    >
                        Voir les validations
                    </button>
                </div>
            ) : null}

            <div className="flex justify-end">
                <Button type="button" color="secondary" size="sm" onClick={onNavigateToSimulation}>
                    Simuler des changements
                </Button>
            </div>
        </div>
    );
}

export function CopilotTab({
    projectId,
    aiRecommendation,
    onNavigateToSimulation,
    onNavigateToDecisions,
}: CopilotTabProps) {
    const [live, setLive] = useState<LiveAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [showLongWaitHint, setShowLongWaitHint] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!loading) {
            setShowLongWaitHint(false);
            return;
        }
        const timer = window.setTimeout(() => setShowLongWaitHint(true), PROGRESSIVE_HINT_MS);
        return () => window.clearTimeout(timer);
    }, [loading]);

    useEffect(() => {
        return () => {
            abortRef.current?.abort();
        };
    }, []);

    async function runAnalysis() {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);
        setShowLongWaitHint(false);

        try {
            const data = await orchestratorApi.ask({
                question: DEFAULT_QUESTION,
                context: { project_id: projectId },
            });

            if (controller.signal.aborted) return;

            if (String(data?.status ?? "").toLowerCase() !== "success") {
                setError("L'analyse n'a pas pu être finalisée. Veuillez réessayer.");
                return;
            }

            setLive({
                response: data,
                receivedAt: new Date().toISOString(),
            });
        } catch (err) {
            if (controller.signal.aborted) return;
            setError(readAskError(err));
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary-100 p-2.5 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
                        <Bot className="size-5" aria-hidden />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            Recommandation stratégique
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Obtenez une recommandation claire pour décider de la suite du projet.
                        </p>
                    </div>
                </div>
                <Button
                    type="button"
                    color="primary"
                    size="sm"
                    onClick={() => void runAnalysis()}
                    isDisabled={loading}
                    isLoading={loading}
                    showTextWhileLoading
                >
                    {loading ? "Analyse en cours…" : "Générer une analyse stratégique"}
                </Button>
            </header>

            {loading ? (
                <div
                    className="rounded-xl border border-primary-200 bg-primary-50/70 px-4 py-5 text-center dark:border-primary-900 dark:bg-primary-950/30"
                    role="status"
                    aria-live="polite"
                >
                    <Loader2 className="mx-auto size-6 animate-spin text-primary-600" aria-hidden />
                    <p className="mt-3 text-sm font-medium text-primary-900 dark:text-primary-100">
                        {showLongWaitHint
                            ? "L'analyse croise plusieurs indicateurs du projet, cela peut prendre jusqu'à une minute."
                            : "Analyse en cours…"}
                    </p>
                </div>
            ) : null}

            {error ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => void runAnalysis()}
                        disabled={loading}
                        className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-200 disabled:opacity-60 dark:bg-red-900/50 dark:text-red-100"
                    >
                        Réessayer
                    </button>
                </div>
            ) : null}

            {live ? (
                <LiveResult
                    live={live}
                    onNavigateToDecisions={onNavigateToDecisions}
                    onNavigateToSimulation={onNavigateToSimulation}
                />
            ) : !loading ? (
                aiRecommendation ? (
                    <PersistedRecommendation ai={aiRecommendation} />
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Ce projet n&apos;a pas encore de recommandation stratégique.
                        </p>
                    </div>
                )
            ) : null}
        </div>
    );
}
