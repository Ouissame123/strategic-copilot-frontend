/**
 * Section « Disponibilité & charge » — drawer talent RH (React Query, fallback overview).
 */
import { useMemo } from "react";
import {
    AlertTriangle,
    Briefcase,
    CalendarClock,
    Gauge,
    Lightbulb,
    RefreshCw,
    TrendingUp,
} from "lucide-react";
import { useTalentAvailability } from "@/hooks/useTalentAvailability";
import { mapRhAvailabilityError, RhAvailabilityApiError } from "@/services/rh-availability.api";
import {
    formatAvailabilityPct,
    formatPlannedLoadPct,
    hasAvailabilityPct,
    resolveAvailabilityBadgeMeta,
} from "@/lib/rh-availability-display";
import type { RhTalentAvailabilitySummary } from "@/types/rh-availability.types";
import {
    RH_ALERT_ERROR,
    RH_BTN_SECONDARY,
    RH_CARD,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TEXT_SECONDARY,
    WS_MUTED_SURFACE,
    WS_SUBTLE,
    WS_TEXT_FAINT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type TalentAvailabilitySectionProps = {
    talentId: string;
    apiBase?: string;
    token?: string;
    listSummary?: RhTalentAvailabilitySummary | null;
};

function fmtDate(d?: string | null): string {
    if (!d) return "—";
    const t = new Date(d);
    return Number.isNaN(t.getTime())
        ? "—"
        : t.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function KpiTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className={cx(RH_CARD, "p-3")}>
            <div className={cx("text-[10px] uppercase tracking-wide", WS_TEXT_FAINT)}>{label}</div>
            <div
                className={cx(
                    "mt-1 text-lg font-semibold tabular-nums",
                    accent ? "text-emerald-600 dark:text-emerald-400" : RH_TEXT_PRIMARY,
                )}
            >
                {value}
            </div>
        </div>
    );
}

function loadBarColor(pct: number): string {
    if (pct >= 100) return "bg-rose-500";
    if (pct >= 80) return "bg-amber-400";
    if (pct > 0) return "bg-emerald-400";
    return "bg-slate-300 dark:bg-slate-600";
}

export function TalentAvailabilitySection({
    talentId,
    apiBase,
    token,
    listSummary,
}: TalentAvailabilitySectionProps) {
    const id = talentId?.trim() ?? "";
    const summaryFromProps = useMemo(() => {
        if (!listSummary?.talent_id && !id) return null;
        if (listSummary?.talent_id && listSummary.talent_id !== id) return null;
        return listSummary?.talent_id
            ? listSummary
            : id
              ? ({ talent_id: id, ...listSummary } as RhTalentAvailabilitySummary)
              : null;
    }, [listSummary, id]);

    const { data, isLoading, isError, error, refetch, isFetching } = useTalentAvailability(id, { token, apiBase }, {
        listSummary: summaryFromProps,
    });

    const errorStatus = error instanceof RhAvailabilityApiError ? error.httpStatus : 0;
    const softFail = errorStatus === 404;
    const displayError = isError && !softFail && !data ? mapRhAvailabilityError(error) : null;

    const availableRaw = data?.available_pct ?? summaryFromProps?.available_pct;
    const hasAvailability = hasAvailabilityPct(availableRaw);
    const availablePct = hasAvailability ? Number(availableRaw) : 0;
    const activeLoad = data?.active_load_pct ?? summaryFromProps?.active_load_pct ?? 0;
    const plannedLoad = data?.planned_load_pct ?? summaryFromProps?.planned_load_pct ?? 0;
    const projectsCount =
        data?.active_projects?.length ?? summaryFromProps?.active_projects_count ?? 0;

    const badge = resolveAvailabilityBadgeMeta({
        availabilityStatus: data?.availability_status ?? summaryFromProps?.availability_status,
        currentLoadPct: activeLoad,
        availablePct: hasAvailability ? availablePct : summaryFromProps?.available_pct,
        preferApiStatus: Boolean(data?.availability_status ?? summaryFromProps?.availability_status),
    });

    const plannedDisplay = formatPlannedLoadPct(plannedLoad, hasAvailability || Boolean(summaryFromProps));
    const fromOverviewOnly = Boolean(summaryFromProps) && !data?.current_assignments?.length;

    return (
        <div className={cx(RH_CARD, "overflow-hidden p-0")}>
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Gauge size={14} className="text-ws-accent" aria-hidden />
                    <h3 className={cx("text-[11px] font-bold uppercase tracking-wider", RH_TEXT_SECONDARY)}>
                        Disponibilité & charge
                    </h3>
                    <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold", badge.cls)}>
                        {badge.label}
                    </span>
                    {isFetching && !isLoading ? (
                        <RefreshCw size={12} className={cx("animate-spin", RH_TEXT_MUTED)} aria-hidden />
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() => void refetch()}
                    disabled={isLoading}
                    className={cx(
                        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium",
                        RH_BTN_SECONDARY,
                    )}
                >
                    <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} aria-hidden />
                    Actualiser
                </button>
            </div>

            <div className="space-y-3 p-3">
                {isLoading && !data && !summaryFromProps ? (
                    <div className="grid animate-pulse grid-cols-2 gap-2 sm:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className={cx("h-14 rounded-lg", WS_MUTED_SURFACE)} />
                        ))}
                    </div>
                ) : null}

                {displayError ? (
                    <div className={cx("rounded-lg px-3 py-2 text-xs", RH_ALERT_ERROR)} role="alert">
                        {displayError}
                    </div>
                ) : null}

                {fromOverviewOnly ? (
                    <p className={cx("text-[10px]", RH_TEXT_MUTED)}>
                        Synthèse depuis la vue globale — le détail par talent n&apos;est pas exposé sur n8n.
                    </p>
                ) : null}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <KpiTile
                        label="Disponibilité"
                        value={formatAvailabilityPct(availableRaw, hasAvailability)}
                        accent={hasAvailability && availablePct >= 50}
                    />
                    <KpiTile label="Charge active" value={`${Math.round(activeLoad)} %`} />
                    <KpiTile label="Charge planifiée" value={plannedDisplay} />
                    <KpiTile label="Projets actifs" value={String(projectsCount)} />
                </div>

                <div>
                    <div className={cx("mb-1 flex justify-between text-[10px]", WS_TEXT_FAINT)}>
                        <span>Charge active</span>
                        <span>{Math.round(activeLoad)} %</span>
                    </div>
                    <div className={cx("h-2 overflow-hidden rounded-full", WS_SUBTLE)}>
                        <div
                            className={cx("h-full rounded-full transition-all", loadBarColor(activeLoad))}
                            style={{ width: `${Math.min(100, Math.max(0, activeLoad))}%` }}
                        />
                    </div>
                </div>

                {data?.recommended_action ? (
                    <div className="flex items-start gap-2 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-xs dark:border-sky-900 dark:bg-sky-950/30">
                        <Lightbulb size={14} className="mt-0.5 shrink-0 text-sky-600" aria-hidden />
                        <p className={RH_TEXT_PRIMARY}>{data.recommended_action}</p>
                    </div>
                ) : null}

                {data?.upcoming_releases && data.upcoming_releases.length > 0 ? (
                    <div>
                        <h4 className={cx("mb-2 flex items-center gap-1 text-[10px] font-bold uppercase", WS_TEXT_FAINT)}>
                            <CalendarClock size={12} aria-hidden />
                            Libérations à venir
                        </h4>
                        <ul className="space-y-1.5">
                            {data.upcoming_releases.map((r, i) => (
                                <li
                                    key={`${r.project_id ?? i}`}
                                    className="flex justify-between rounded-lg border border-slate-100 px-2 py-1.5 text-xs dark:border-slate-800"
                                >
                                    <span className={RH_TEXT_PRIMARY}>{r.project_name ?? "Projet"}</span>
                                    <span className={RH_TEXT_MUTED}>{fmtDate(r.release_date)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {data?.current_assignments && data.current_assignments.length > 0 ? (
                    <div>
                        <h4 className={cx("mb-2 flex items-center gap-1 text-[10px] font-bold uppercase", WS_TEXT_FAINT)}>
                            <Briefcase size={12} aria-hidden />
                            Affectations en cours
                        </h4>
                        <ul className="space-y-1.5">
                            {data.current_assignments.map((a, i) => (
                                <li
                                    key={a.id ?? `${a.project_id}-${i}`}
                                    className="rounded-lg border border-slate-100 px-2 py-1.5 text-xs dark:border-slate-800"
                                >
                                    <div className="flex justify-between gap-2">
                                        <span className="font-medium text-slate-800 dark:text-slate-100">
                                            {a.project_name ?? "Projet"}
                                        </span>
                                        <span className="tabular-nums text-slate-500">
                                            {a.allocation_pct != null ? `${a.allocation_pct} %` : "—"}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {activeLoad >= 100 ? (
                    <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                        <AlertTriangle size={14} aria-hidden />
                        Surcharge détectée — arbitrage recommandé.
                    </div>
                ) : null}
            </div>
        </div>
    );
}
