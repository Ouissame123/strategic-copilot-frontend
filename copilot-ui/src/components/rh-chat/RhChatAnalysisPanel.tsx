import { BrainCircuit, Database, Lightbulb, Sparkles, Target, Zap } from "lucide-react";
import { memo, type ReactNode } from "react";
import type { RhChatAnalysisMeta } from "@/types/rh-chat";
import {
    confidenceBadgeClasses,
    confidenceBadgeTone,
    formatConfidenceShort,
    inferIntentFromText,
    intentToneClasses,
} from "@/components/rh-chat/rh-chat-ui.utils";
import { cx } from "@/utils/cx";

type RhChatAnalysisPanelProps = {
    meta: RhChatAnalysisMeta | null;
};

function AnalysisCard({
    title,
    icon: Icon,
    children,
    className,
}: {
    title: string;
    icon: typeof Sparkles;
    children: ReactNode;
    className?: string;
}) {
    return (
        <article
            className={cx(
                "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 animate-in fade-in slide-in-from-right-2 dark:border-slate-700 dark:bg-slate-900",
                className,
            )}
        >
            <div className="mb-3 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm">
                    <Icon className="size-4" aria-hidden />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
            </div>
            {children}
        </article>
    );
}

export const RhChatAnalysisPanel = memo(function RhChatAnalysisPanel({ meta }: RhChatAnalysisPanelProps) {
    const intentVisual = inferIntentFromText(meta?.intent ?? "");
    const confTone = confidenceBadgeTone(meta?.confidence ?? null);
    const confLabel = formatConfidenceShort(meta?.confidence ?? null);
    const sourcesCount = meta?.sources?.length ?? 0;
    const actions = meta?.suggested_actions ?? [];

    return (
        <aside
            className={cx(
                "hidden h-full min-h-0 w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm xl:flex dark:border-slate-700 dark:bg-slate-950/40",
            )}
        >
            <div className="border-b border-slate-200 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-4 text-white dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="size-4" aria-hidden />
                    <h2 className="text-sm font-bold tracking-tight">Analyse IA</h2>
                </div>
                <p className="mt-1 text-[11px] text-violet-100/90">Insights en temps réel sur la dernière réponse</p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                {!meta ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
                        <Sparkles className="mx-auto size-8 text-violet-500" aria-hidden />
                        <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                            En attente d&apos;analyse
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Envoyez un message pour afficher l&apos;intent, la confiance et les actions suggérées.
                        </p>
                    </div>
                ) : (
                    <>
                        <AnalysisCard title="Intent détecté" icon={Target}>
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={cx(
                                        "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                                        intentToneClasses(intentVisual.tone),
                                    )}
                                >
                                    {meta.intent || intentVisual.label}
                                </span>
                            </div>
                        </AnalysisCard>

                        <AnalysisCard title="Confiance" icon={Zap}>
                            {confLabel && confTone ? (
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cx(
                                            "flex size-14 items-center justify-center rounded-2xl text-lg font-bold ring-2",
                                            confidenceBadgeClasses(confTone),
                                        )}
                                    >
                                        {confLabel}
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                        Score de confiance du modèle sur cette réponse.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">—</p>
                            )}
                        </AnalysisCard>

                        <AnalysisCard title="Sources consultées" icon={Database}>
                            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{sourcesCount}</p>
                            {sourcesCount > 0 ? (
                                <ul className="mt-2 space-y-1.5">
                                    {meta.sources.slice(0, 5).map((s, i) => (
                                        <li
                                            key={`${s.id ?? s.label ?? i}`}
                                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                        >
                                            {s.label || s.type || s.id || "Source"}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-1 text-xs text-slate-500">Aucune source référencée.</p>
                            )}
                        </AnalysisCard>

                        <AnalysisCard title="Actions suggérées" icon={Lightbulb}>
                            {actions.length > 0 ? (
                                <ul className="space-y-2">
                                    {actions.map((a, i) => (
                                        <li
                                            key={`${a.label}-${i}`}
                                            className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-3 py-2 text-xs font-medium text-violet-900 dark:border-violet-800 dark:from-violet-950/40 dark:to-indigo-950/30 dark:text-violet-100"
                                        >
                                            {a.label}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500">Aucune action suggérée.</p>
                            )}
                        </AnalysisCard>
                    </>
                )}
            </div>
        </aside>
    );
});
