import { useState } from "react";
import {
    extractOrchestratorArbitrageOptions,
    extractOrchestratorStrategistDecision,
    extractOrchestratorTopRecommendation,
    type OrchestratorArbitrageOption,
    type OrchestratorAskResponse,
} from "@/api/orchestrator.api";
import { managerStrategistApi } from "@/api/manager-strategist-options.api";
import { StrategistApiError } from "@/api/strategist.api";
import { Button } from "@/components/base/buttons/button";
import { StrategistOptionImpactBlock } from "@/components/copilot/StrategistOptionImpactBlock";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/hooks/useAuth";
import { localeForDateFormatting } from "@/lib/ui-locale";
import i18n from "@/i18n";
import { useToast } from "@/providers/toast-provider";
import type { ArbitrageOptionType, ExecuteResponse } from "@/types/api.types";
import { cx } from "@/utils/cx";

const OPTION_TYPE_LABELS: Record<ArbitrageOptionType, string> = {
    reallocation: "Réallocation",
    delay: "Décalage de délai",
    reinforce: "Renforcement",
    stop_scope: "Réduction de scope",
};

const STOP_SCOPE_CONFIRM =
    "Si aucune exigence facultative ne peut être retirée, cette action mettra le projet en pause. Confirmer ?";

type PanelOption = OrchestratorArbitrageOption & {
    /** Résumé backend après execute — affiché tel quel. */
    executionSummary?: string;
    /** Horodatage local de l'application (affichage badge Exécuté). */
    executedAt?: string;
};

type StrategistOptionsPanelProps = {
    response: OrchestratorAskResponse;
};

function formatExecutedAt(iso: string): string {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return iso || "—";
    return new Date(t).toLocaleString(localeForDateFormatting(i18n.language), {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function StrategistOptionsPanel({ response }: StrategistOptionsPanelProps) {
    const { user } = useAuth();
    const { push: toast } = useToast();

    const initialOptions = extractOrchestratorArbitrageOptions(response);
    const strategistDecision = extractOrchestratorStrategistDecision(response);
    const topRecommendation = extractOrchestratorTopRecommendation(response);

    const [options, setOptions] = useState<PanelOption[]>(initialOptions);
    const [actingId, setActingId] = useState<string | null>(null);
    const [pendingConfirm, setPendingConfirm] = useState<PanelOption | null>(null);

    if (!options.length) return null;

    const enterpriseId = response.meta?.enterprise_id?.trim() || user?.enterpriseId?.trim() || "";
    const actorUserId = user?.id?.trim() || "";
    const orchestratorRunId = response.meta?.analysis_run_id?.trim() || undefined;
    const batchHasExecuted = options.some((o) => o.status === "executed");
    const topId = topRecommendation?.id ?? null;
    const decisionSummary = strategistDecision?.summary?.trim() || null;

    const applyExecuteSuccess = (optionId: string, data: ExecuteResponse) => {
        const summary = data.decision_executed?.summary?.trim() || "";
        const nextStatus: PanelOption["status"] =
            data.action === "reject" || data.decision_executed?.status === "rejected"
                ? "rejected"
                : "executed";

        setOptions((prev) =>
            prev.map((o) => {
                if (o.id === optionId) {
                    return {
                        ...o,
                        status: nextStatus,
                        executionSummary: summary || o.executionSummary,
                        executedAt:
                            nextStatus === "executed"
                                ? new Date().toISOString()
                                : o.executedAt,
                    };
                }
                return o;
            }),
        );

        if (summary) toast(summary, nextStatus === "rejected" ? "neutral" : "success", 6000);

        const highlights = data.ui?.highlights?.filter((h) => h.trim()) ?? [];
        if (highlights.length) {
            toast(highlights.join(" · "), "info", 7000);
        }
    };

    const confirmOption = async (optionId: string, action: "execute" | "reject") => {
        if (!enterpriseId) {
            toast("Entreprise non identifiée. Reconnectez-vous.", "error");
            return;
        }
        if (!actorUserId) {
            toast("Utilisateur non identifié. Reconnectez-vous.", "error");
            return;
        }
        if (batchHasExecuted && action === "execute") {
            toast("Une autre option a déjà été appliquée pour ce lot.", "neutral");
            return;
        }

        setActingId(optionId);
        try {
            const { data } = await managerStrategistApi.execute({
                enterpriseId,
                optionId,
                action,
                actorUserId,
                orchestratorRunId,
            });
            applyExecuteSuccess(optionId, data);
        } catch (err) {
            if (err instanceof StrategistApiError) {
                if (err.httpStatus === 404) {
                    toast("Cette option n'est plus disponible (déjà exécutée ou expirée).", "error");
                    return;
                }
                if (err.code === "FORBIDDEN_PROJECT" || err.httpStatus === 403) {
                    toast("Accès refusé sur ce projet.", "error");
                    return;
                }
                toast(err.message || "Erreur lors de l'exécution de l'option Strategist.", "error");
                return;
            }
            toast("Erreur lors de l'exécution de l'option Strategist.", "error");
        } finally {
            setActingId(null);
            setPendingConfirm(null);
        }
    };

    const requestConfirm = (opt: PanelOption) => {
        if (opt.status !== "proposed" || batchHasExecuted || actingId) return;
        setPendingConfirm(opt);
    };

    return (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
            <header className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Options d&apos;arbitrage proposées
                </h3>
                {decisionSummary ? (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{decisionSummary}</p>
                ) : null}
            </header>

            <div className="space-y-3">
                {options.map((opt) => {
                    const status = opt.status;
                    const isTop = topId === opt.id;
                    const isTerminal = status === "executed" || status === "rejected";
                    const lockedBySibling = batchHasExecuted && status === "proposed";
                    const canAct = status === "proposed" && !batchHasExecuted && !actingId;
                    const confidencePct = Math.round((opt.confidence ?? 0) * 100);
                    const typeLabel = OPTION_TYPE_LABELS[opt.option_type] ?? opt.option_type;

                    return (
                        <article
                            key={opt.id}
                            className={cx(
                                "rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900",
                                isTerminal && "opacity-60 saturate-50",
                                lockedBySibling && "opacity-50",
                                isTop && "ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-slate-950",
                            )}
                        >
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
                                    {typeLabel}
                                </span>
                                {isTop ? (
                                    <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                        Recommandé
                                    </span>
                                ) : null}
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    Confiance {confidencePct}%
                                </span>
                                {status === "executed" ? (
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                                        Exécuté le{" "}
                                        {formatExecutedAt(
                                            opt.executedAt || opt.created_at || new Date().toISOString(),
                                        )}
                                    </span>
                                ) : null}
                                {status === "rejected" ? (
                                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        Rejeté
                                    </span>
                                ) : null}
                            </div>

                            <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                                {opt.rationale}
                            </p>

                            <div className="mb-3">
                                <StrategistOptionImpactBlock option={opt} />
                            </div>

                            {opt.executionSummary ? (
                                <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                                    {opt.executionSummary}
                                </p>
                            ) : null}

                            {lockedBySibling ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Une autre option a été appliquée
                                </p>
                            ) : null}

                            {status === "proposed" ? (
                                <div className="mt-3 flex justify-end">
                                    <Button
                                        type="button"
                                        color="primary"
                                        size="sm"
                                        isDisabled={!canAct}
                                        isLoading={actingId === opt.id}
                                        showTextWhileLoading
                                        onClick={() => requestConfirm(opt)}
                                    >
                                        Confirmer et appliquer
                                    </Button>
                                </div>
                            ) : null}
                        </article>
                    );
                })}
            </div>

            <ConfirmDialog
                isOpen={Boolean(pendingConfirm)}
                onOpenChange={(open) => {
                    if (!open && !actingId) setPendingConfirm(null);
                }}
                title={
                    pendingConfirm?.option_type === "stop_scope"
                        ? "Réduction de scope"
                        : "Confirmer cette action ?"
                }
                body={
                    <p>
                        {pendingConfirm?.option_type === "stop_scope"
                            ? STOP_SCOPE_CONFIRM
                            : "Confirmer cette action ?"}
                    </p>
                }
                confirmLabel="Confirmer et appliquer"
                cancelLabel="Annuler"
                tone={pendingConfirm?.option_type === "stop_scope" ? "danger" : "default"}
                isConfirmLoading={Boolean(actingId)}
                onConfirm={() => {
                    if (!pendingConfirm) return;
                    void confirmOption(pendingConfirm.id, "execute");
                }}
            />
        </section>
    );
}
