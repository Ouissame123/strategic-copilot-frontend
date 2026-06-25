import { Link } from "react-router";
import { Plus } from "lucide-react";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { DashboardSectionCard } from "./DashboardSectionCard";
import type { TalentDashboardDensity } from "./use-talent-dashboard-density";
import { cx } from "@/utils/cx";

type RequestsSummaryProps = {
    summary?: TalentDashboard["requests_summary"];
    density: TalentDashboardDensity;
};

const STAT_ITEMS: Array<{ key: keyof NonNullable<TalentDashboard["requests_summary"]>; label: string }> = [
    { key: "pending", label: "En attente" },
    { key: "accepted", label: "Acceptées" },
    { key: "in_progress", label: "En cours" },
    { key: "done", label: "Terminées" },
    { key: "rejected", label: "Refusées" },
];

export function RequestsSummary({ summary, density }: RequestsSummaryProps) {
    if (summary === undefined) return null;

    const compact = density === "compact";
    const empty = summary.total === 0;

    return (
        <DashboardSectionCard
            title="Mes demandes"
            subtitle="Strategist"
            ctaLabel="Voir tout"
            ctaHref="/workspace/talent/requests"
            density={density}
            accent="action"
        >
            {empty ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className={cx("text-tertiary", compact ? "text-xs" : "text-sm")}>
                        Aucune demande envoyée
                    </p>
                    <Link
                        to="/workspace/talent/requests"
                        className="inline-flex items-center gap-1.5 rounded-md bg-brand-solid px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                    >
                        <Plus className="size-3.5" aria-hidden />
                        Créer une demande
                    </Link>
                </div>
            ) : (
                <>
                    <div className="flex items-baseline gap-2">
                        <p className={cx("font-semibold tabular-nums text-primary", compact ? "text-xl" : "text-2xl")}>
                            {summary.total}
                        </p>
                        <p className="text-xs text-tertiary">demandes au total</p>
                    </div>
                    <div className={cx("mt-2 flex flex-wrap gap-1.5", compact && "mt-1.5")}>
                        {STAT_ITEMS.map(({ key, label }) => (
                            <div
                                key={key}
                                className={cx(
                                    "rounded-md border border-secondary/50 bg-secondary_subtle/30 px-2.5 py-1",
                                )}
                            >
                                <span className="text-sm font-semibold tabular-nums text-primary">{summary[key]}</span>
                                <span className="ml-1.5 text-[10px] text-tertiary">{label}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </DashboardSectionCard>
    );
}
