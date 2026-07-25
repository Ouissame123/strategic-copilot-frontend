import { ChevronUp, Loader2, Sparkles, X } from "lucide-react";
import { REPORT_CARD } from "./reports-shared";

type ReportPreviewPanelProps = {
    templateTitle: string;
    sections: string[];
    pageEst: number;
    projectsIncluded: number;
    decisionsCount: number;
    alertsCount: number;
    talents: number;
    healthLabel: string;
    volumeBars: { label: string; count: number; hPct: number }[];
    aiBullets: string[];
    includeCharts: boolean;
    includeAi: boolean;
    onGenerate: () => void;
    generating?: boolean;
    generateDisabled?: boolean;
    mobileOpen?: boolean;
    onMobileOpenChange?: (open: boolean) => void;
    /** Données dashboard chargées — sinon état neutre sans KPI estimés */
    dataReady?: boolean;
    /** embedded = carte dans colonne sticky desktop ; mobileBar = barre fixe mobile uniquement */
    variant?: "default" | "embedded" | "mobileBar";
};

type PreviewBodyProps = Pick<
    ReportPreviewPanelProps,
    | "sections"
    | "pageEst"
    | "projectsIncluded"
    | "decisionsCount"
    | "alertsCount"
    | "talents"
    | "healthLabel"
    | "volumeBars"
    | "aiBullets"
    | "includeCharts"
    | "includeAi"
    | "dataReady"
>;

function PreviewBody({
    sections,
    pageEst,
    projectsIncluded,
    decisionsCount,
    alertsCount,
    talents,
    healthLabel,
    volumeBars,
    aiBullets,
    includeCharts,
    includeAi,
    dataReady = true,
}: PreviewBodyProps) {
    if (!dataReady) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-center dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Les indicateurs apparaîtront après le chargement des données du tableau de bord.
                </p>
            </div>
        );
    }

    const hasVolume = includeCharts && volumeBars.some((b) => b.count > 0);
    const showAi = includeAi && aiBullets.length > 0;

    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sections prévues</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {sections.map((s) => (
                    <li key={s}>{s}</li>
                ))}
            </ul>

            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {[
                    { label: "Pages (estim.)", value: pageEst },
                    { label: "Projets", value: projectsIncluded },
                    { label: "Décisions", value: decisionsCount },
                    { label: "Alertes", value: alertsCount },
                    { label: "Talents", value: talents },
                    { label: "Santé", value: healthLabel },
                ].map((k) => (
                    <div key={k.label} className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900">
                        <dt className="text-slate-500">{k.label}</dt>
                        <dd className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{k.value}</dd>
                    </div>
                ))}
            </dl>

            {hasVolume ? (
                <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase text-slate-500">Volume décisions</p>
                    <div className="mt-2 flex h-14 items-end gap-1">
                        {volumeBars.map((b) => (
                            <div key={b.label} className="flex flex-1 flex-col items-center gap-0.5">
                                <div
                                    className="w-full max-w-[2rem] rounded-t bg-primary-500/80"
                                    style={{ height: `${Math.max(8, b.hPct)}%` }}
                                    title={`${b.label}: ${b.count}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {showAi ? (
                <div className="mt-4 rounded-xl border border-primary-200/50 bg-primary-50/50 p-3 dark:border-primary-900/40 dark:bg-primary-950/30">
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase text-primary-700 dark:text-primary-300">
                        <Sparkles className="size-3.5" /> Recommandations IA
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                        {aiBullets.map((b, i) => (
                            <li key={i}>{b}</li>
                        ))}
                    </ul>
                </div>
            ) : includeAi ? (
                <p className="mt-4 text-[11px] text-slate-500">Aucune recommandation IA pour la période sélectionnée.</p>
            ) : null}
        </div>
    );
}

function GenerateButton({
    generating,
    generateDisabled,
    onGenerate,
}: Pick<ReportPreviewPanelProps, "generating" | "generateDisabled" | "onGenerate">) {
    return (
        <button
            type="button"
            disabled={generateDisabled || generating}
            onClick={onGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
        >
            {generating ? <Loader2 className="size-4 animate-spin" /> : null}
            {generating ? "Génération…" : "Générer maintenant"}
        </button>
    );
}

function EmbeddedPreviewCard(props: ReportPreviewPanelProps) {
    const { templateTitle, onGenerate, generating, generateDisabled, dataReady, ...body } = props;
    return (
        <div className={REPORT_CARD + " p-5"} id="executive-report-preview">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Aperçu du rapport</h2>
            <p className="mt-1 text-sm font-medium text-primary-600 dark:text-primary-400">{templateTitle}</p>
            <div className="mt-4">
                <PreviewBody {...body} dataReady={dataReady} />
            </div>
            <div className="mt-4">
                <GenerateButton generating={generating} generateDisabled={generateDisabled} onGenerate={onGenerate} />
            </div>
        </div>
    );
}

function MobilePreviewBar(props: ReportPreviewPanelProps) {
    const {
        templateTitle,
        onGenerate,
        generating,
        generateDisabled,
        mobileOpen = false,
        onMobileOpenChange,
        dataReady,
        ...body
    } = props;

    return (
        <div className="xl:hidden">
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                {!mobileOpen ? (
                    <button
                        type="button"
                        onClick={() => onMobileOpenChange?.(true)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-700 dark:text-slate-100"
                    >
                        <span className="truncate">Aperçu · {templateTitle}</span>
                        <ChevronUp className="size-4 shrink-0 text-primary-600" />
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            aria-label="Fermer l'aperçu"
                            className="fixed inset-0 z-40 bg-slate-900/40"
                            onClick={() => onMobileOpenChange?.(false)}
                        />
                        <div className="relative z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl border border-slate-200/60 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Aperçu du rapport</h2>
                                    <p className="text-xs font-medium text-primary-600 dark:text-primary-400">{templateTitle}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onMobileOpenChange?.(false)}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                            <PreviewBody {...body} dataReady={dataReady} />
                            <div className="mt-4">
                                <GenerateButton
                                    generating={generating}
                                    generateDisabled={generateDisabled}
                                    onGenerate={onGenerate}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export function ReportPreviewPanel(props: ReportPreviewPanelProps) {
    const { variant = "default" } = props;

    if (variant === "embedded") {
        return <EmbeddedPreviewCard {...props} />;
    }

    if (variant === "mobileBar") {
        return <MobilePreviewBar {...props} />;
    }

    return (
        <>
            <div className="hidden xl:block">
                <EmbeddedPreviewCard {...props} />
            </div>
            <MobilePreviewBar {...props} />
        </>
    );
}
