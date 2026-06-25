import type { ReactNode } from "react";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { mobilityDriverBadgeLabel, parseMobilityDrivers } from "@/components/talent/mobility-drivers";
import { TalentKpiStrip, type TalentKpiStripItem } from "@/components/talent/ui/TalentKpiStrip";
import { ALLOCATION_TONES, MOBILITY_TONES, toneClasses } from "./talent-dashboard-tones";
import { cx } from "@/utils/cx";

type KpiCardsRowProps = {
    kpis?: TalentDashboard["kpis"];
    opportunitiesCount?: number;
    density?: "compact" | "comfortable";
    className?: string;
};

function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
    const cls = toneClasses(tone);
    return (
        <span className={cx("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", cls.badge)}>{children}</span>
    );
}

export function KpiCardsRow({ kpis, opportunitiesCount, className }: KpiCardsRowProps) {
    if (!kpis) return null;

    const ipi = kpis.ipi;
    const mobility = kpis.mobility;
    const allocation = kpis.allocation;

    const mobilityDrivers = parseMobilityDrivers(mobility.drivers);
    const mobilityDriverHint = mobilityDrivers[0] ? mobilityDriverBadgeLabel(mobilityDrivers[0]) : undefined;
    const mobilityDriverTooltip =
        mobilityDrivers.length > 0
            ? mobilityDrivers.map(mobilityDriverBadgeLabel).join(" · ")
            : "Calculé par Agent Analyst";

    const items: TalentKpiStripItem[] = [
        {
            key: "ipi",
            label: "IPI Score",
            value: ipi.score != null ? `${ipi.score}/10` : "—",
            badge: ipi.band_label ? (
                <Badge tone={ipi.band === "high" ? "emerald" : ipi.band === "mid" ? "amber" : ipi.band === "low" ? "red" : "slate"}>
                    {ipi.band_label}
                </Badge>
            ) : undefined,
            hint: ipi.score == null ? "Pas encore évalué" : undefined,
            tone: "violet",
            tooltip:
                ipi.tech_score != null || ipi.exp_score != null || ipi.stability_score != null
                    ? `Tech ${ipi.tech_score ?? "—"} · Exp ${ipi.exp_score ?? "—"} · Stabilité ${ipi.stability_score ?? "—"}`
                    : "Tech, Exp, Stability breakdown",
        },
        {
            key: "mobility",
            label: "Mobilité",
            value: mobility.flag_label ?? "—",
            badge:
                mobility.score != null ? (
                    <Badge tone={mobility.flag ? MOBILITY_TONES[mobility.flag] : "slate"}>{mobility.score}</Badge>
                ) : undefined,
            hint: mobilityDriverHint ?? (mobility.flag_label ? undefined : "Pas encore évalué"),
            tone: "brand",
            tooltip: mobilityDriverTooltip,
        },
        {
            key: "allocation",
            label: "Allocation",
            value: `${allocation.total_pct}%`,
            badge: allocation.status ? (
                <Badge tone={ALLOCATION_TONES[allocation.status] ?? "slate"}>{allocation.status}</Badge>
            ) : undefined,
            hint: `${allocation.active_projects_count} projet(s) · dispo ${allocation.available_pct}%`,
            tone: allocation.status === "saturated" ? "red" : "default",
            tooltip: `Disponible ${allocation.available_pct}%`,
        },
        {
            key: "opportunities",
            label: "Opportunités",
            value: opportunitiesCount != null ? String(opportunitiesCount) : "—",
            tone: "violet",
            hint: opportunitiesCount != null && opportunitiesCount > 0 ? "Matches IA actifs" : "Aucun match",
        },
    ];

    return <TalentKpiStrip items={items} className="min-w-0 flex-1" />;
}
