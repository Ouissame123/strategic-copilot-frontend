import { Briefcase, Compass, Sparkles, TrendingUp } from "lucide-react";
import { mobilityDriverBadgeLabel, parseMobilityDrivers } from "@/components/talent/mobility-drivers";
import {
    ALLOCATION_STATUS_LABELS,
    ALLOCATION_TONES,
    MOBILITY_TONES,
} from "@/components/talent/dashboard/talent-dashboard-tones";
import type { AnalystBand, TalentDashboard } from "@/types/talent-dashboard";
import { KpiTile, type KpiProgressColor } from "./KpiTile";

type KpiRowProps = {
    kpis: NonNullable<TalentDashboard["kpis"]>;
    opportunitiesCount: number;
};

function ipiBandTone(band: AnalystBand | null): string {
    if (band === "high") return "emerald";
    if (band === "mid") return "amber";
    if (band === "low") return "red";
    return "slate";
}

function scoreProgressColor(score: number | null): KpiProgressColor {
    if (score == null) return "violet";
    if (score >= 7) return "green";
    if (score >= 5) return "yellow";
    return "orange";
}

function mobilityProgressColor(score: number | null): KpiProgressColor {
    if (score == null) return "violet";
    if (score >= 7) return "green";
    if (score >= 5) return "yellow";
    if (score >= 3) return "orange";
    return "red";
}

function allocationProgressColor(pct: number): KpiProgressColor {
    if (pct >= 80) return "red";
    if (pct >= 60) return "orange";
    if (pct >= 30) return "green";
    return "yellow";
}

export function KpiRow({ kpis, opportunitiesCount }: KpiRowProps) {
    const ipi = kpis.ipi;
    const mobility = kpis.mobility;
    const allocation = kpis.allocation;

    const mobilityDrivers = parseMobilityDrivers(mobility.drivers);
    const mobilityDriverHint = mobilityDrivers[0] ? mobilityDriverBadgeLabel(mobilityDrivers[0]) : undefined;
    const allocationStatusLabel = allocation.status ? ALLOCATION_STATUS_LABELS[allocation.status] : undefined;

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
                icon={TrendingUp}
                label="Performance"
                value={ipi.score != null ? ipi.score.toFixed(1) : "—"}
                unit={ipi.score != null ? "/ 10" : undefined}
                badge={
                    ipi.band_label
                        ? { text: ipi.band_label, tone: ipiBandTone(ipi.band) }
                        : ipi.score == null
                          ? { text: "Non évalué", tone: "slate" }
                          : undefined
                }
                description={
                    ipi.score == null
                        ? "Votre profil n'a pas encore été évalué par l'IA."
                        : "Synthèse compétences, exp. et stabilité"
                }
                progress={ipi.score != null ? ipi.score * 10 : undefined}
                progressColor={scoreProgressColor(ipi.score)}
            />
            <KpiTile
                icon={Compass}
                label="Mobilité"
                value={mobility.flag_label ?? "—"}
                badge={
                    mobility.score != null
                        ? { text: `Score ${mobility.score.toFixed(1)}`, tone: mobility.flag ? MOBILITY_TONES[mobility.flag] : "slate" }
                        : mobility.flag_label
                          ? undefined
                          : { text: "Non évalué", tone: "slate" }
                }
                description={
                    mobilityDriverHint ??
                    (mobility.flag_label
                        ? "Probabilité estimée de quitter l'organisation."
                        : "Analyse mobilité non encore disponible.")
                }
                progress={mobility.score != null ? mobility.score * 10 : undefined}
                progressColor={mobilityProgressColor(mobility.score)}
            />
            <KpiTile
                icon={Briefcase}
                label="Allocation"
                value={`${allocation.total_pct}%`}
                badge={
                    allocationStatusLabel
                        ? { text: allocationStatusLabel, tone: ALLOCATION_TONES[allocation.status] }
                        : undefined
                }
                description={`${allocation.active_projects_count} projet${allocation.active_projects_count > 1 ? "s" : ""} actif${allocation.active_projects_count > 1 ? "s" : ""} · ${allocation.available_pct}% de capacité libre`}
                progress={allocation.total_pct}
                progressColor={allocationProgressColor(allocation.total_pct)}
            />
            <KpiTile
                icon={Sparkles}
                label="Opportunités"
                value={opportunitiesCount}
                badge={
                    opportunitiesCount > 0
                        ? { text: "Matches actifs", tone: "violet" }
                        : { text: "Aucun match", tone: "slate" }
                }
                description={
                    opportunitiesCount > 0
                        ? "Projets compatibles avec votre profil, suggérés par l'IA"
                        : "Aucune mission ne correspond pour le moment."
                }
            />
        </div>
    );
}
