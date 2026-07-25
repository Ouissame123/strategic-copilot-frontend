import { Activity, AlertTriangle, Briefcase, Gauge, RefreshCw, Users, Zap } from "lucide-react";
import type { RhAnalytics } from "@/types/rh-dashboard.types";
import { CompactKpi, DashboardSection, MiniScoreRing } from "@/components/rh/dashboard/rh-dashboard-shared";
import { RH_BTN_SECONDARY, RH_TEXT_MUTED, RH_TEXT_SECONDARY } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

type Props = {
    analytics: RhAnalytics;
    onRefresh?: () => void;
    refreshing?: boolean;
};

export function RhDashboardExecutiveOverview({ analytics, onRefresh, refreshing }: Props) {
    const { kpis, rh_score, alerts } = analytics;
    const riskCount = kpis.projects.critical_rh_alerts + alerts.length;

    return (
        <DashboardSection
            eyebrow="Vue exécutive"
            title="Executive Overview"
            description="Synthèse instantanée de la santé RH et de la capacité workforce."
            action={
                onRefresh ? (
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={refreshing}
                        className={cx(
                            "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold shadow-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900",
                            RH_BTN_SECONDARY,
                        )}
                    >
                        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} aria-hidden />
                        Actualiser
                    </button>
                ) : null
            }
        >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <div
                    className={cx(
                        "flex items-center gap-4 rounded-lg border border-primary-200/60 bg-gradient-to-br from-primary-50/50 via-white to-white p-3 lg:col-span-3 dark:border-primary-900/40 dark:from-primary-950/20 dark:via-slate-900 dark:to-slate-900",
                    )}
                >
                    <MiniScoreRing score={rh_score} size={64} />
                    <div className="min-w-0">
                        <div className={cx("flex items-center gap-1.5 text-[11px] font-semibold", RH_TEXT_SECONDARY)}>
                            <Gauge size={12} className="text-primary-600" aria-hidden />
                            Score RH global
                        </div>
                        <p className={cx("mt-1 text-[10px] leading-snug", RH_TEXT_MUTED)}>
                            {kpis.load.overloaded} surchargé(s) · {kpis.projects.projects_without_team} projet(s) sans équipe
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-9 lg:grid-cols-5">
                    <CompactKpi
                        icon={<Users size={16} aria-hidden />}
                        tone="violet"
                        label="Talents"
                        value={kpis.talents.total}
                        hint={`${kpis.talents.active} actifs · ${kpis.talents.on_leave} congé`}
                    />
                    <CompactKpi
                        icon={<Activity size={16} aria-hidden />}
                        tone="amber"
                        label="Charge moyenne"
                        value={`${kpis.load.avg_load_pct}%`}
                        hint="Répartition workforce"
                    />
                    <CompactKpi
                        icon={<Zap size={16} aria-hidden />}
                        tone="sky"
                        label="Dispo. moyenne"
                        value={`${kpis.load.avg_available_pct}%`}
                        hint={`${kpis.load.most_available.length} profils libres`}
                    />
                    <CompactKpi
                        icon={<Briefcase size={16} aria-hidden />}
                        tone="emerald"
                        label="Projets actifs"
                        value={kpis.projects.active_projects}
                        hint={`${kpis.projects.talents_assigned} assignés`}
                    />
                    <CompactKpi
                        icon={<AlertTriangle size={16} aria-hidden />}
                        tone="rose"
                        label="Risques"
                        value={riskCount}
                        hint={`${kpis.projects.critical_rh_alerts} critiques projet`}
                    />
                </div>
            </div>
        </DashboardSection>
    );
}
