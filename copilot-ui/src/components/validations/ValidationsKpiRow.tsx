import { AlertTriangle, Clock, Inbox, TrendingUp } from "lucide-react";
import { cx } from "@/utils/cx";
import { validationCardClass } from "./validation-ui";
import type { ValidationsKpiStats } from "./validations-page-data";

type ValidationsKpiRowProps = {
    stats?: ValidationsKpiStats;
};

export function ValidationsKpiRow({ stats }: ValidationsKpiRowProps) {
    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className={validationCardClass + " p-5"}>
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-tertiary">À traiter</p>
                        <p className="mt-1 text-3xl font-semibold tabular-nums text-primary">{stats.total}</p>
                    </div>
                    <Inbox className="size-4 text-tertiary" aria-hidden />
                </div>
                <p className="mt-3 text-xs text-tertiary">items en attente</p>
            </article>

            <article
                className={cx(
                    validationCardClass,
                    "p-5",
                    stats.blocking > 0 && "border-red-500/30 bg-red-500/[0.02]",
                )}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-tertiary">Bloquant</p>
                        <p
                            className={cx(
                                "mt-1 text-3xl font-semibold tabular-nums",
                                stats.blocking > 0 ? "text-red-600 dark:text-red-400" : "text-primary",
                            )}
                        >
                            {stats.blocking}
                        </p>
                    </div>
                    {stats.blocking > 0 ? <AlertTriangle className="size-4 text-red-500" aria-hidden /> : null}
                </div>
                <p className="mt-3 text-xs text-tertiary">action urgente requise</p>
            </article>

            <article className={validationCardClass + " p-5"}>
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-tertiary">30 derniers jours</p>
                        <p className="mt-1 text-3xl font-semibold tabular-nums text-primary">{stats.period_30d}</p>
                    </div>
                    <Clock className="size-4 text-tertiary" aria-hidden />
                </div>
                <p className="mt-3 text-xs text-tertiary">activité du mois</p>
            </article>

            <article className={validationCardClass + " p-5"}>
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-tertiary">Nouveaux (7j)</p>
                        <p className="mt-1 text-3xl font-semibold tabular-nums text-primary">{stats.new_7d}</p>
                    </div>
                    <TrendingUp className="size-4 text-tertiary" aria-hidden />
                </div>
                {stats.new_7d_delta != null ? (
                    <p className="mt-3 text-xs">
                        <span
                            className={cx(
                                "font-medium tabular-nums",
                                stats.new_7d_delta >= 0 ? "text-emerald-600" : "text-red-600",
                            )}
                        >
                            {stats.new_7d_delta > 0 ? "+" : ""}
                            {stats.new_7d_delta}
                        </span>
                        <span className="text-tertiary"> vs 7j préc.</span>
                    </p>
                ) : (
                    <p className="mt-3 text-xs text-tertiary">—</p>
                )}
            </article>
        </div>
    );
}
