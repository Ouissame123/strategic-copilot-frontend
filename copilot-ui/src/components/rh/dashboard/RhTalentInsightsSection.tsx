/**
 * Talent Intelligence — IPI + 9-Box (mêmes appels API, présentation à onglets).
 */
import { useCallback, useEffect, useState } from "react";
import { RhNineBoxMatrix } from "@/components/rh/dashboard/RhNineBoxMatrix";
import { DashboardSection } from "@/components/rh/dashboard/rh-dashboard-shared";
import {
    AlertTriangle,
    Grid3X3,
    Gauge,
    RefreshCw,
    Sparkles,
    Users,
} from "lucide-react";
import { fetchRhAnalystInsights } from "@/services/rh-analyst.api";
import type { RhAnalystIpiResponse, RhAnalystNineBoxResponse } from "@/types/rh-analyst.types";
import {
    RH_ALERT_ERROR,
    RH_BTN_PRIMARY,
    RH_BTN_SECONDARY,
    RH_CARD,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TEXT_SECONDARY,
    WS_MUTED_SURFACE,
    WS_TEXT_FAINT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type RhTalentInsightsSectionProps = {
    enterpriseId: string;
    token?: string;
};

type InsightTab = "summary" | "ninebox" | "ipi";

const TABS: { id: InsightTab; label: string }[] = [
    { id: "summary", label: "Résumé IA" },
    { id: "ninebox", label: "9-Box" },
    { id: "ipi", label: "IPI" },
];

const IPI_DIST_LABELS: Record<keyof RhAnalystIpiResponse["distribution"], string> = {
    top: "Top",
    strong: "Fort",
    average: "Moyen",
    at_risk: "À risque",
};

const IPI_DIST_COLORS: Record<keyof RhAnalystIpiResponse["distribution"], string> = {
    top: "bg-primary-500",
    strong: "bg-emerald-500",
    average: "bg-primary-500",
    at_risk: "bg-rose-500",
};

function DistBars({
    data,
    labels,
    colors,
}: {
    data: Record<string, number>;
    labels: Record<string, string>;
    colors: Record<string, string>;
}) {
    const entries = Object.entries(labels).map(([key, label]) => ({
        key,
        label,
        value: data[key] ?? 0,
        color: colors[key] ?? "bg-slate-400",
    }));
    const max = Math.max(1, ...entries.map((e) => e.value));

    return (
        <div className="space-y-2">
            {entries.map((e) => (
                <div key={e.key} className="flex items-center gap-2">
                    <span className={cx("w-28 truncate text-[11px]", RH_TEXT_SECONDARY)} title={e.label}>
                        {e.label}
                    </span>
                    <div className={cx("h-2 flex-1 overflow-hidden rounded-full", WS_MUTED_SURFACE)}>
                        <div className={cx("h-full rounded-full", e.color)} style={{ width: `${(e.value / max) * 100}%` }} />
                    </div>
                    <span className={cx("w-6 text-right text-[11px] font-semibold tabular-nums", RH_TEXT_MUTED)}>{e.value}</span>
                </div>
            ))}
        </div>
    );
}

function EndpointError({ message }: { message: string }) {
    return (
        <div className={cx("flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30", RH_TEXT_SECONDARY)}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
            <span>{message}</span>
        </div>
    );
}

function IpiPanel({ ipi, ipiError, loaded }: { ipi: RhAnalystIpiResponse | null; ipiError: string | null; loaded: boolean }) {
    if (ipiError) return <EndpointError message={ipiError} />;
    if (!ipi) {
        return loaded ? <p className={cx("text-xs", WS_TEXT_FAINT)}>Aucune donnée IPI.</p> : null;
    }
    return (
        <>
            <div className="mb-4 flex flex-wrap items-end gap-6">
                <div>
                    <div className={cx("text-4xl font-bold tabular-nums tracking-tight text-primary-700 dark:text-primary-300")}>
                        {ipi.avg_ipi.toFixed(1)}
                    </div>
                    <div className={cx("text-[11px]", RH_TEXT_MUTED)}>/ 10 · IPI moyen entreprise</div>
                </div>
                <div className={cx("rounded-lg border border-slate-100 px-4 py-2 dark:border-slate-800", WS_MUTED_SURFACE)}>
                    <div className={cx("flex items-center gap-1 text-[10px] font-semibold uppercase", WS_TEXT_FAINT)}>
                        <Users size={11} aria-hidden />
                        Talents analysés
                    </div>
                    <div className={cx("text-xl font-bold tabular-nums", RH_TEXT_PRIMARY)}>{ipi.total_talents}</div>
                </div>
            </div>
            <DistBars
                data={ipi.distribution as unknown as Record<string, number>}
                labels={IPI_DIST_LABELS}
                colors={IPI_DIST_COLORS}
            />
        </>
    );
}

function NineBoxPanel({
    nineBox,
    nineBoxError,
}: {
    nineBox: RhAnalystNineBoxResponse | null;
    nineBoxError: string | null;
}) {
    if (nineBoxError) return <EndpointError message={nineBoxError} />;
    if (!nineBox) return null;
    return (
        <>
            <p className={cx("mb-3 text-xs tabular-nums", RH_TEXT_MUTED)}>
                <span className={cx("font-bold", RH_TEXT_PRIMARY)}>{nineBox.total_talents}</span> talents positionnés
            </p>
            {nineBox.distribution.length > 0 ? (
                <ul className="mb-4 flex flex-wrap gap-2">
                    {nineBox.distribution.map((item) => (
                        <li
                            key={item.box_label}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] dark:border-slate-700 dark:bg-slate-800"
                        >
                            <span className={RH_TEXT_MUTED}>{item.display_label}:</span>{" "}
                            <span className={cx("font-bold tabular-nums", RH_TEXT_PRIMARY)}>{item.count}</span>
                        </li>
                    ))}
                </ul>
            ) : null}
            <RhNineBoxMatrix matrix={nineBox.matrix} />
        </>
    );
}

export function RhTalentInsightsSection({ enterpriseId, token }: RhTalentInsightsSectionProps) {
    const eid = enterpriseId?.trim() ?? "";
    const [tab, setTab] = useState<InsightTab>("summary");
    const [ipi, setIpi] = useState<RhAnalystIpiResponse | null>(null);
    const [nineBox, setNineBox] = useState<RhAnalystNineBoxResponse | null>(null);
    const [ipiError, setIpiError] = useState<string | null>(null);
    const [nineBoxError, setNineBoxError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const refresh = useCallback(async () => {
        if (!eid) return;
        setLoading(true);
        setIpiError(null);
        setNineBoxError(null);
        const result = await fetchRhAnalystInsights(eid, { token });
        setIpi(result.ipi);
        setNineBox(result.nineBox);
        setIpiError(result.ipiError);
        setNineBoxError(result.nineBoxError);
        setLoaded(true);
        setLoading(false);
    }, [eid, token]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return (
        <DashboardSection
            variant="ai"
            eyebrow="Intelligence"
            title="Talent Intelligence"
            description="Analyse IPI et matrice 9-Box — moteur Analyst n8n."
            action={
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                        <Sparkles size={11} aria-hidden />
                        Analyst
                    </span>
                    <button
                        type="button"
                        onClick={() => void refresh()}
                        disabled={loading || !eid}
                        className={cx(
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-60",
                            loading ? RH_BTN_SECONDARY : RH_BTN_PRIMARY,
                        )}
                    >
                        <RefreshCw size={13} className={loading ? "animate-spin" : ""} aria-hidden />
                        Actualiser
                    </button>
                </div>
            }
        >
            <div className="mb-4 flex gap-1 rounded-lg border border-slate-200/80 bg-slate-50/80 p-1 dark:border-slate-700 dark:bg-slate-800/50">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={cx(
                            "flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold transition",
                            tab === t.id
                                ? "bg-white text-primary-700 shadow-sm dark:bg-slate-900 dark:text-primary-300"
                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading && !loaded ? (
                <div className={cx("flex h-28 items-center justify-center text-sm", RH_TEXT_MUTED)}>
                    <RefreshCw className="mr-2 animate-spin" size={16} aria-hidden />
                    Analyse IA en cours…
                </div>
            ) : null}

            {tab === "summary" && loaded ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className={cx(RH_CARD, "border-primary-100/80 p-4 dark:border-primary-900/30")}>
                        <div className={cx("mb-2 flex items-center gap-2 text-xs font-semibold", RH_TEXT_SECONDARY)}>
                            <Gauge size={14} className="text-primary-600" aria-hidden />
                            IPI — aperçu
                        </div>
                        {ipi ? (
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold tabular-nums text-primary-700 dark:text-primary-300">
                                    {ipi.avg_ipi.toFixed(1)}
                                </span>
                                <span className={cx("text-xs", RH_TEXT_MUTED)}>/10 · {ipi.total_talents} talents</span>
                            </div>
                        ) : (
                            <p className={cx("text-xs", WS_TEXT_FAINT)}>{ipiError || "Indisponible"}</p>
                        )}
                    </div>
                    <div className={cx(RH_CARD, "border-primary-100/80 p-4 dark:border-primary-900/30")}>
                        <div className={cx("mb-2 flex items-center gap-2 text-xs font-semibold", RH_TEXT_SECONDARY)}>
                            <Grid3X3 size={14} className="text-primary-600" aria-hidden />
                            9-Box — aperçu
                        </div>
                        {nineBox ? (
                            <div className="flex flex-wrap gap-2">
                                {nineBox.distribution.slice(0, 4).map((d) => (
                                    <span key={d.box_label} className={cx("text-[11px]", RH_TEXT_MUTED)}>
                                        {d.display_label}: <b className={RH_TEXT_PRIMARY}>{d.count}</b>
                                    </span>
                                ))}
                                {nineBox.distribution.length > 4 ? (
                                    <span className={cx("text-[11px]", WS_TEXT_FAINT)}>+{nineBox.distribution.length - 4}</span>
                                ) : null}
                            </div>
                        ) : (
                            <p className={cx("text-xs", WS_TEXT_FAINT)}>{nineBoxError || "Indisponible"}</p>
                        )}
                    </div>
                    <p className={cx("lg:col-span-2 text-[11px]", RH_TEXT_MUTED)}>
                        Utilisez les onglets <strong>9-Box</strong> et <strong>IPI</strong> pour explorer la matrice complète et la
                        distribution des performances.
                    </p>
                </div>
            ) : null}

            {tab === "ninebox" && (loaded || nineBoxError) ? (
                <NineBoxPanel nineBox={nineBox} nineBoxError={nineBoxError} />
            ) : null}

            {tab === "ipi" && (loaded || ipiError) ? <IpiPanel ipi={ipi} ipiError={ipiError} loaded={loaded} /> : null}

            {ipiError && nineBoxError ? (
                <div className={cx("mt-3 flex items-center gap-2 rounded-lg p-3", RH_ALERT_ERROR)}>
                    <AlertTriangle size={14} aria-hidden />
                    <span className="text-xs">Endpoints Analyst indisponibles — le reste du dashboard reste utilisable.</span>
                </div>
            ) : null}
        </DashboardSection>
    );
}
