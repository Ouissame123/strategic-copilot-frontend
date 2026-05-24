import { Building2, TrendingUp, UserMinus, UserPlus } from "lucide-react";
import type { RhAnalyticsKpis } from "@/types/rh-dashboard.types";
import {
    DashboardSection,
    LoadBar,
    MiniDist,
    TalentMicroList,
} from "@/components/rh/dashboard/rh-dashboard-shared";
import { RH_CARD, RH_TEXT_SECONDARY } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

type Props = { kpis: RhAnalyticsKpis };

export function RhDashboardWorkforceAnalytics({ kpis }: Props) {
    return (
        <DashboardSection
            eyebrow="Capacité"
            title="Workforce Analytics"
            description="Charge, répartition organisationnelle et profils extrêmes."
        >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className={cx(RH_CARD, "border-0 bg-slate-50/50 p-3 shadow-none dark:bg-slate-800/30")}>
                    <div className={cx("mb-3 flex items-center gap-2 text-[11px] font-semibold", RH_TEXT_SECONDARY)}>
                        <TrendingUp size={14} aria-hidden />
                        Distribution de la charge
                    </div>
                    <LoadBar data={kpis.load} />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className={cx(RH_CARD, "border-0 bg-slate-50/50 p-3 shadow-none dark:bg-slate-800/30")}>
                        <div className={cx("mb-2 flex items-center gap-1.5 text-[11px] font-semibold", RH_TEXT_SECONDARY)}>
                            <Building2 size={13} aria-hidden />
                            Départements
                        </div>
                        <MiniDist
                            title=""
                            data={kpis.talents.by_department}
                            hint="Brancher talents.by_department dans WF_RH_Analytics."
                        />
                    </div>
                    <div className={cx(RH_CARD, "border-0 bg-slate-50/50 p-3 shadow-none dark:bg-slate-800/30")}>
                        <div className={cx("mb-2 flex items-center gap-1.5 text-[11px] font-semibold", RH_TEXT_SECONDARY)}>
                            <Building2 size={13} aria-hidden />
                            Séniorité
                        </div>
                        <MiniDist
                            title=""
                            data={kpis.talents.by_seniority}
                            hint="Brancher talents.by_seniority dans WF_RH_Analytics."
                        />
                    </div>
                </div>

                <div className={cx(RH_CARD, "border-0 bg-slate-50/50 p-3 shadow-none dark:bg-slate-800/30")}>
                    <div className={cx("mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300")}>
                        <UserMinus size={13} aria-hidden />
                        Talents surchargés
                    </div>
                    <TalentMicroList
                        title=""
                        items={kpis.load.most_loaded}
                        valueKey="load_pct"
                        valueClassName="text-rose-600 dark:text-rose-400"
                    />
                </div>

                <div className={cx(RH_CARD, "border-0 bg-slate-50/50 p-3 shadow-none dark:bg-slate-800/30")}>
                    <div className={cx("mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300")}>
                        <UserPlus size={13} aria-hidden />
                        Talents disponibles
                    </div>
                    <TalentMicroList
                        title=""
                        items={kpis.load.most_available}
                        valueKey="available_pct"
                        valueClassName="text-emerald-600 dark:text-emerald-400"
                    />
                </div>
            </div>
        </DashboardSection>
    );
}
