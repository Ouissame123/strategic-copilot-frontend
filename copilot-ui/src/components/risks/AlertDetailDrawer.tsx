import { useState } from "react";
import { Link } from "react-router";
import { Bot, FileText, Send, Sparkles, X } from "lucide-react";
import {
    workflowStatusShowsReopen,
    workflowStatusShowsResolveIgnore,
} from "@/components/notifications/notification-alert-utils";
import { getAlertDescription, getAlertTitle } from "@/lib/risk-alert-display";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";
import type { DisplayAlert, RiskAlertPatchRequest } from "./risks-shared";
import { scoreColorClass, severityBadgeClass, severityRank, timeAgo } from "./risks-shared";

type AlertDetailDrawerProps = {
    open: boolean;
    alert: DisplayAlert | null;
    onClose: () => void;
    loading?: boolean;
    analyzePending?: boolean;
    onPatch: (p: RiskAlertPatchRequest) => void;
    onAnalyze: (projectId: string) => void;
    onTransfer?: () => void;
};

function RiskTimeline({ alert }: { alert: DisplayAlert }) {
    const st = (alert.status ?? "").toLowerCase();
    const steps = [
        { label: "Détecté", done: Boolean(alert.detectedAt) },
        { label: "Analysé", done: alert.riskScore != null },
        { label: "Action", done: alert.riskScore != null || severityRank(alert.severity) >= 3 },
        { label: "Décision", done: st.includes("invest") || st === "in_progress" || st === "acknowledged" },
        { label: "Résolu", done: st.includes("resolv") || st === "closed" || st === "dismissed" },
    ];
    return (
        <ol className="space-y-2">
            {steps.map((s, i) => (
                <li key={s.label} className="flex items-center gap-3">
                    <span
                        className={cx(
                            "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            s.done ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800",
                        )}
                    >
                        {i + 1}
                    </span>
                    <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.label}</p>
                        <p className="text-[10px] text-slate-500">{s.done ? "Complété" : "À venir"}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

export function AlertDetailDrawer({
    open,
    alert,
    onClose,
    loading,
    analyzePending,
    onPatch,
    onAnalyze,
    onTransfer,
}: AlertDetailDrawerProps) {
    const [showNote, setShowNote] = useState(false);
    const [note, setNote] = useState("");

    if (!open || !alert) return null;

    const showResolveIgnore = workflowStatusShowsResolveIgnore(alert.status);
    const showReopen = workflowStatusShowsReopen(alert.status);

    const submit = (action: RiskAlertPatchRequest["action"]) => {
        onPatch({ alert, action, note: note.trim() || undefined });
        setShowNote(false);
        setNote("");
    };

    const impactLabel =
        alert.severity === "critical" || alert.severity === "high"
            ? "Élevé"
            : alert.severity === "medium"
              ? "Modéré"
              : "Faible";

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Fermer" />
            <aside
                className={cx(
                    "relative flex h-full w-full max-w-[520px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900",
                )}
                role="dialog"
                aria-modal="true"
            >
                <header className="border-b border-slate-200 bg-gradient-to-r from-violet-600/10 to-indigo-600/5 px-5 py-4 dark:border-slate-700">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">Alerte risque</p>
                            <h2 className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-slate-50">{alert.projectName}</h2>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", severityBadgeClass(alert.severity))}>
                                    {alert.severity}
                                </span>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] dark:border-slate-600 dark:bg-slate-800">{alert.category}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                        >
                            <X className="size-4" aria-hidden />
                        </button>
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <section>
                        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <FileText className="size-3.5" aria-hidden />
                            Contexte
                        </h3>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{getAlertTitle(alert)}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{getAlertDescription(alert)}</p>
                        <dl className="mt-3 grid gap-2 text-xs">
                            <div className="flex justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <dt className="text-slate-500">Impact estimé</dt>
                                <dd className="font-semibold text-slate-900 dark:text-slate-100">{impactLabel}</dd>
                            </div>
                            {alert.riskScore != null ? (
                                <div className="flex justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                                    <dt className="text-slate-500">Score</dt>
                                    <dd className={cx("font-bold tabular-nums", scoreColorClass(alert.riskScore))}>{alert.riskScore.toFixed(1)}/10</dd>
                                </div>
                            ) : null}
                            <div className="flex justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                                <dt className="text-slate-500">Détection</dt>
                                <dd className="font-medium text-slate-800 dark:text-slate-200">{timeAgo(alert.detectedAt)}</dd>
                            </div>
                        </dl>
                    </section>

                    <section className="mt-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</h3>
                        <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                            <RiskTimeline alert={alert} />
                        </div>
                    </section>

                    <section className="mt-6 rounded-xl border border-violet-200 bg-violet-50/80 p-3 dark:border-violet-900 dark:bg-violet-950/30">
                        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
                            <Sparkles className="size-3.5" aria-hidden />
                            Recommandations IA
                        </h3>
                        <p className="mt-2 text-sm text-violet-900 dark:text-violet-100">
                            Prioriser une revue courte avec le chef de projet et sécuriser les ressources critiques sur{" "}
                            <span className="font-semibold">{alert.projectName}</span>.
                        </p>
                        {alert.projectId ? (
                            <button
                                type="button"
                                disabled={analyzePending}
                                onClick={() => onAnalyze(alert.projectId!)}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                            >
                                <Bot className="size-3.5" aria-hidden />
                                Lancer analyse projet
                            </button>
                        ) : null}
                    </section>

                    <section className="mt-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</h3>
                        {showNote ? (
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                                placeholder="Ajouter une note de suivi…"
                            />
                        ) : (
                            <p className="mt-2 text-xs text-slate-500">Aucune note pour le moment.</p>
                        )}
                    </section>
                </div>

                <footer className="border-t border-slate-200 px-5 py-4 dark:border-slate-700">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Actions</p>
                    <div className="flex flex-wrap gap-2">
                        {showResolveIgnore ? (
                            <>
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => submit("resolve")}
                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                    Résoudre
                                </button>
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => submit("ignore")}
                                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                    Ignorer
                                </button>
                            </>
                        ) : null}
                        {showReopen ? (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => submit("reopen")}
                                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                                Réouvrir
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => setShowNote((v) => !v)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-600"
                        >
                            Ajouter note
                        </button>
                        <button
                            type="button"
                            onClick={onTransfer}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-600"
                        >
                            <Send className="size-3.5" aria-hidden />
                            Transférer
                        </button>
                        {alert.projectId ? (
                            <Link
                                to={managerProjectsOpenModalPath(alert.projectId)}
                                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
                            >
                                Ouvrir projet
                            </Link>
                        ) : null}
                    </div>
                </footer>
            </aside>
        </div>
    );
}
