import { Link } from "react-router";
import { Plus } from "lucide-react";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { DashboardSectionCard } from "./DashboardSectionCard";

type RequestsSummaryProps = {
    summary?: TalentDashboard["requests_summary"];
};

const STAT_ITEMS: Array<{ key: keyof NonNullable<TalentDashboard["requests_summary"]>; label: string }> = [
    { key: "pending", label: "En attente" },
    { key: "accepted", label: "Acceptées" },
    { key: "in_progress", label: "En cours" },
    { key: "done", label: "Terminées" },
    { key: "rejected", label: "Refusées" },
];

export function RequestsSummary({ summary }: RequestsSummaryProps) {
    if (summary === undefined) return null;

    const empty = summary.total === 0;

    return (
        <DashboardSectionCard
            title="Mes demandes"
            subtitle="Strategist"
            ctaLabel="Voir tout"
            ctaHref="/workspace/talent/requests"
            accent="action"
        >
            {empty ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-tertiary">Aucune demande envoyée</p>
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
                        <p className="text-2xl font-semibold tabular-nums text-primary">{summary.total}</p>
                        <p className="text-xs text-tertiary">demandes au total</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {STAT_ITEMS.map(({ key, label }) => (
                            <div
                                key={key}
                                className="rounded-md border border-secondary/50 bg-secondary_subtle/30 px-2.5 py-1"
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
