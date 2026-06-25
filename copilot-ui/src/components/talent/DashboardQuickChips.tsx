import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { toneClasses } from "@/components/talent/dashboard/talent-dashboard-tones";
import { TALENT_SURFACE } from "@/components/talent/ui/talent-workspace-ui";
import { cx } from "@/utils/cx";

type DashboardQuickChipsProps = {
    opportunitiesCount: number;
    pendingRequestsCount: number;
};

/** Bandeau compact lorsqu'il n'y a pas de recommandation #1 mais des actions en attente. */
export function DashboardQuickChips({ opportunitiesCount, pendingRequestsCount }: DashboardQuickChipsProps) {
    if (opportunitiesCount <= 0 && pendingRequestsCount <= 0) return null;

    const pendingCls = toneClasses("orange");

    return (
        <section className={cx(TALENT_SURFACE, "flex flex-wrap items-center gap-2 p-4")} aria-label="Actions rapides">
            {opportunitiesCount > 0 ? (
                <span className="inline-flex items-center rounded-full bg-secondary_subtle px-2.5 py-1 text-xs font-medium text-secondary ring-1 ring-secondary/50">
                    {opportunitiesCount} opportunité{opportunitiesCount > 1 ? "s" : ""} IA
                </span>
            ) : null}
            {pendingRequestsCount > 0 ? (
                <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", pendingCls.badge)}>
                    {pendingRequestsCount} demande{pendingRequestsCount > 1 ? "s" : ""} en attente
                </span>
            ) : null}
            {opportunitiesCount > 0 ? (
                <Link
                    to="/workspace/talent/opportunities"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                >
                    Voir les opportunités
                    <ArrowRight className="size-3" aria-hidden />
                </Link>
            ) : null}
            {pendingRequestsCount > 0 ? (
                <Link
                    to="/workspace/talent/requests"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                >
                    Voir mes demandes
                    <ArrowRight className="size-3" aria-hidden />
                </Link>
            ) : null}
        </section>
    );
}
