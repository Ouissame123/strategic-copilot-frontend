import { ArrowRight, CheckCircle2, Clock, PlayCircle, XCircle } from "lucide-react";
import { Link } from "react-router";
import { toneClasses } from "@/components/talent/dashboard/talent-dashboard-tones";
import { TALENT_SURFACE, TALENT_SURFACE_ACCENT } from "@/components/talent/ui/talent-workspace-ui";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { cx } from "@/utils/cx";

type RequestsSummary = NonNullable<TalentDashboard["requests_summary"]>;

type MyRequestsCardProps = {
    summary?: TalentDashboard["requests_summary"];
};

const STAT_CONFIG = [
    { key: "pending" as const, label: "En attente", icon: Clock, tone: "orange" },
    { key: "accepted" as const, label: "Acceptées", icon: CheckCircle2, tone: "emerald" },
    { key: "in_progress" as const, label: "En cours", icon: PlayCircle, tone: "blue" },
    { key: "done" as const, label: "Terminées", icon: CheckCircle2, tone: "violet" },
    { key: "rejected" as const, label: "Refusées", icon: XCircle, tone: "red" },
];

export function MyRequestsCard({ summary }: MyRequestsCardProps) {
    if (summary === undefined) return null;

    const empty = summary.total === 0;

    return (
        <section className={cx(TALENT_SURFACE, TALENT_SURFACE_ACCENT.action, "flex h-full flex-col p-5")} aria-labelledby="talent-requests-title">
            <header className="mb-4 flex items-start justify-between gap-2">
                <div>
                    <h2 id="talent-requests-title" className="text-base font-semibold text-primary">
                        Mes demandes
                    </h2>
                    <p className="mt-1 text-xs text-tertiary">
                        {summary.total} demande{summary.total > 1 ? "s" : ""} au total
                    </p>
                </div>
                <Link
                    to="/workspace/talent/requests"
                    className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                    aria-label="Voir toutes mes demandes"
                >
                    Voir tout
                    <ArrowRight className="size-3" aria-hidden />
                </Link>
            </header>

            {empty ? (
                <div className="py-6 text-center">
                    <p className="text-sm text-tertiary">Aucune demande pour l&apos;instant.</p>
                    <Link
                        to="/workspace/talent/requests"
                        className="mt-2 inline-block text-sm font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                    >
                        Créer une demande
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {STAT_CONFIG.map(({ key, label, icon: Icon, tone }) => {
                        const value = summary[key as keyof RequestsSummary] as number;
                        const cls = toneClasses(tone);
                        return (
                            <div key={key} className="rounded-lg border border-secondary/50 bg-secondary_subtle/30 p-3 text-center">
                                <Icon className={cx("mx-auto mb-1 size-4", cls.text)} aria-hidden />
                                <div className="text-lg font-bold tabular-nums text-primary">{value}</div>
                                <div className="text-[10px] font-medium uppercase tracking-wide text-tertiary">{label}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
