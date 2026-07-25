import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useManagerDecisionLog } from "@/hooks/useManagerDecisionLog";
import { formatRelativeShort } from "@/lib/format-relative-short";
import { localeForDateFormatting } from "@/lib/ui-locale";
import i18n from "@/i18n";
import type { DecisionLogDecision } from "@/services/decisions.api";
import { decisionBadgeClass } from "@/components/decision-log/decision-log-ui";
import { cx } from "@/utils/cx";

type DecisionsTabProps = {
    projectId: string;
};

const DECISION_LABEL: Record<string, string> = {
    continue: "Poursuivre",
    adjust: "Ajuster",
    stop: "Arrêter",
    other: "Autre",
};

function decisionKind(value: string): keyof typeof decisionBadgeClass {
    const v = String(value ?? "").trim().toLowerCase();
    if (v === "continue" || v === "adjust" || v === "stop") return v;
    return "other";
}

function statusLabel(status: string): string | null {
    const s = String(status ?? "").trim().toLowerCase();
    if (s === "handled") return "Traité";
    if (s === "dismissed") return "Ignoré";
    return null;
}

function formatFullDate(iso: string): string {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "—";
    return new Date(t).toLocaleString(localeForDateFormatting(i18n.language), {
        dateStyle: "long",
        timeStyle: "short",
    });
}

function DecisionsSkeleton() {
    return (
        <div className="space-y-3" aria-label="Chargement">
            {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
        </div>
    );
}

function DecisionTimelineRow({ decision }: { decision: DecisionLogDecision }) {
    const [open, setOpen] = useState(false);
    const kind = decisionKind(decision.decision);
    const badgeClass = decisionBadgeClass[kind] ?? decisionBadgeClass.other;
    const label = DECISION_LABEL[kind] ?? DECISION_LABEL.other;
    const status = statusLabel(decision.status);
    const score = Number(decision.score);
    const scoreLabel = Number.isFinite(score) ? score.toFixed(1) : "—";

    return (
        <li className="relative pl-6">
            <span
                className="absolute left-0 top-4 size-2.5 rounded-full bg-primary-500 ring-4 ring-white dark:ring-slate-950"
                aria-hidden
            />
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/80"
            >
                <span className={cx("shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", badgeClass)}>
                    {label}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                            {scoreLabel}
                            <span className="font-normal text-slate-400">/10</span>
                        </span>
                        <span className="text-xs text-slate-500">{formatRelativeShort(decision.created_at)}</span>
                        {status ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {status}
                            </span>
                        ) : null}
                    </div>
                </div>
                <ChevronRight
                    className={cx("mt-0.5 size-4 shrink-0 text-slate-400 transition-transform", open && "rotate-90")}
                    aria-hidden
                />
            </button>

            {open ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <p className="text-xs text-slate-500">{formatFullDate(decision.created_at)}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {decision.synthesis?.trim() || "—"}
                    </p>
                    {decision.scope ? (
                        <span className="mt-3 inline-flex rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                            {decision.scope}
                        </span>
                    ) : null}
                </div>
            ) : null}
        </li>
    );
}

export function DecisionsTab({ projectId }: DecisionsTabProps) {
    const query = useManagerDecisionLog({
        period: "all",
        project_id: projectId,
    });

    const decisions = query.data?.decisions ?? [];
    const count = query.data?.count ?? decisions.length;

    if (query.isLoading) {
        return (
            <div className="mx-auto w-full max-w-3xl p-5">
                <DecisionsSkeleton />
            </div>
        );
    }

    if (query.isError) {
        return (
            <div className="mx-auto w-full max-w-3xl p-5">
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                    <p>Impossible de charger l&apos;historique des décisions.</p>
                    <button
                        type="button"
                        onClick={() => void query.refetch()}
                        className="mt-2 font-medium underline"
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    if (count === 0 || decisions.length === 0) {
        return (
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-2 px-5 py-16 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Aucune analyse enregistrée. Cliquez sur Analyser dans l&apos;onglet Copilot pour créer la
                    première entrée.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-3xl p-5">
            <ol className="relative space-y-3 border-l border-slate-200 pl-2 dark:border-slate-700">
                {decisions.map((decision) => (
                    <DecisionTimelineRow key={decision.decision_id} decision={decision} />
                ))}
            </ol>
        </div>
    );
}
