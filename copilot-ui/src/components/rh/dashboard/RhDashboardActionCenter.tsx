import type { ReactNode } from "react";
import { AlertCircle, ArrowRight, Briefcase, UserCheck, Users } from "lucide-react";
import type { RhAnalytics, RhAnalyticsAlert } from "@/types/rh-dashboard.types";
import { DashboardSection, SEV_META } from "@/components/rh/dashboard/rh-dashboard-shared";
import { RH_TEXT_MUTED, RH_TEXT_PRIMARY, RH_TEXT_SECONDARY } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

type Props = {
    analytics: RhAnalytics;
    onOpenTalents?: () => void;
};

type ActionItem = {
    id: string;
    icon: ReactNode;
    title: string;
    detail: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    actionLabel?: string;
    onAction?: () => void;
};

function buildActionItems(analytics: RhAnalytics, onOpenTalents?: () => void): ActionItem[] {
    const { kpis, alerts } = analytics;
    const items: ActionItem[] = [];

    if (kpis.load.overloaded > 0) {
        items.push({
            id: "overload",
            icon: <Users size={15} aria-hidden />,
            title: "Surcharge détectée",
            detail: `${kpis.load.overloaded} talent(s) en surcharge — rééquilibrer les affectations.`,
            severity: "high",
            actionLabel: "Voir les talents",
            onAction: onOpenTalents,
        });
    }

    if (kpis.projects.projects_without_team > 0) {
        items.push({
            id: "no-team",
            icon: <Briefcase size={15} aria-hidden />,
            title: "Projets sans équipe",
            detail: `${kpis.projects.projects_without_team} projet(s) actif(s) sans équipe constituée.`,
            severity: "medium",
        });
    }

    const availableCount = kpis.load.most_available.length;
    if (availableCount > 0) {
        items.push({
            id: "available",
            icon: <UserCheck size={15} aria-hidden />,
            title: "Capacité mobilisable",
            detail: `${availableCount} talent(s) les plus disponibles identifiés pour staffing.`,
            severity: "info",
            actionLabel: "Staffing",
            onAction: onOpenTalents,
        });
    }

    if (kpis.load.unassigned > 0) {
        items.push({
            id: "unassigned",
            icon: <AlertCircle size={15} aria-hidden />,
            title: "Sans mission",
            detail: `${kpis.load.unassigned} talent(s) sans mission assignée.`,
            severity: "medium",
            onAction: onOpenTalents,
            actionLabel: "Affecter",
        });
    }

    alerts.forEach((a: RhAnalyticsAlert, i) => {
        items.push({
            id: `alert-${i}`,
            icon: <AlertCircle size={15} aria-hidden />,
            title: a.message.slice(0, 72) + (a.message.length > 72 ? "…" : ""),
            detail: a.action || "Action recommandée par l'analytics RH.",
            severity: a.level,
        });
    });

    return items;
}

export function RhDashboardActionCenter({ analytics, onOpenTalents }: Props) {
    const items = buildActionItems(analytics, onOpenTalents);

    return (
        <DashboardSection
            eyebrow="Priorités"
            title="Action Center"
            description="Alertes et leviers opérationnels issus des analytics RH."
        >
            {items.length === 0 ? (
                <p className={cx("rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs", RH_TEXT_MUTED)}>
                    Aucune action prioritaire — situation stable.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {items.map((item) => {
                        const m = SEV_META[item.severity] ?? SEV_META.info;
                        return (
                            <div
                                key={item.id}
                                className={cx(
                                    "flex gap-3 rounded-lg border p-3 transition hover:shadow-sm",
                                    m.bg,
                                    m.border,
                                )}
                            >
                                <div className={cx("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-slate-900/50", m.text)}>
                                    {item.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={cx("text-xs font-semibold leading-snug", RH_TEXT_PRIMARY)}>{item.title}</p>
                                    <p className={cx("mt-0.5 text-[11px] leading-snug", RH_TEXT_MUTED)}>{item.detail}</p>
                                    {item.actionLabel && item.onAction ? (
                                        <button
                                            type="button"
                                            onClick={item.onAction}
                                            className={cx(
                                                "mt-2 inline-flex items-center gap-1 text-[11px] font-semibold hover:underline",
                                                m.text,
                                            )}
                                        >
                                            {item.actionLabel}
                                            <ArrowRight size={12} aria-hidden />
                                        </button>
                                    ) : null}
                                </div>
                                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${m.dot}`} aria-hidden />
                            </div>
                        );
                    })}
                </div>
            )}
        </DashboardSection>
    );
}
