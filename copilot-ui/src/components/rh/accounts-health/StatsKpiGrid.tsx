import type { LucideIcon } from "lucide-react";
import { KeyRound, Shield, TrendingUp, UserCircle2, Users, UserX } from "lucide-react";
import { useAccountsStats } from "@/hooks/use-rh-accounts-audit";
import { cx } from "@/utils/cx";

function KpiCell({
    icon: Icon,
    value,
    label,
    tone = "neutral",
    isLoading,
}: {
    icon: LucideIcon;
    value: string | number;
    label: string;
    tone?: "neutral" | "warning" | "success" | "info";
    isLoading?: boolean;
}) {
    if (isLoading) {
        return <div className="h-24 animate-pulse bg-ws-muted-surface" />;
    }

    const valueCls = {
        neutral: "text-ws-primary",
        warning: "text-amber-700 dark:text-amber-300",
        success: "text-emerald-700 dark:text-emerald-300",
        info: "text-primary-700 dark:text-primary-300",
    }[tone];

    return (
        <div className="bg-ws-card p-4 transition hover:bg-ws-muted-surface/40">
            <div className="mb-1 flex items-center gap-2 text-xs text-ws-muted">
                <Icon className="size-3.5" aria-hidden />
                {label}
            </div>
            <div className={cx("text-2xl font-semibold tabular-nums font-kpi-mono", valueCls)}>{value}</div>
        </div>
    );
}

function ActivityCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
    return (
        <div className="rounded-lg border border-ws-border-subtle bg-ws-card px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-ws-muted">
                <Icon className="size-3.5" aria-hidden />
                {label}
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums text-ws-primary font-kpi-mono">{value}</p>
        </div>
    );
}

type StatsKpiGridProps = {
    dataUpdatedAt?: number;
    isFetching?: boolean;
};

export function StatsKpiGrid({ dataUpdatedAt, isFetching }: StatsKpiGridProps) {
    const { data, isLoading } = useAccountsStats();
    const s = data?.stats;

    const refreshLabel = (() => {
        if (!dataUpdatedAt) return null;
        const sec = Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000));
        return sec < 60 ? `Dernier refresh il y a ${sec}s` : `Dernier refresh il y a ${Math.floor(sec / 60)} min`;
    })();

    const coverage = s?.talents.portal_coverage_pct ?? 0;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ws-border-subtle bg-ws-border lg:grid-cols-6">
                <KpiCell icon={Users} value={s?.users.managers_active ?? 0} label="Managers actifs" isLoading={isLoading} />
                <KpiCell icon={Shield} value={s?.users.rh_active ?? 0} label="RH actifs" isLoading={isLoading} />
                <KpiCell
                    icon={KeyRound}
                    value={s?.users.talent_accounts_active ?? 0}
                    label="Talents portail"
                    tone="info"
                    isLoading={isLoading}
                />
                <KpiCell icon={UserCircle2} value={s?.talents.active ?? 0} label="Talents actifs" isLoading={isLoading} />
                <KpiCell
                    icon={TrendingUp}
                    value={`${coverage}%`}
                    label="Coverage portail"
                    tone={coverage < 50 ? "warning" : "success"}
                    isLoading={isLoading}
                />
                <KpiCell
                    icon={UserX}
                    value={s?.talents.without_manager ?? 0}
                    label="Sans manager"
                    tone="warning"
                    isLoading={isLoading}
                />
            </div>

            <div className="rounded-lg border border-ws-border-subtle bg-ws-card p-4">
                <h3 className="mb-3 text-sm font-medium text-ws-primary">Activité 7 derniers jours</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ActivityCard icon={Users} label="Utilisateurs créés" value={s?.activity_7d.users_created ?? 0} />
                    <ActivityCard icon={UserCircle2} label="Talents créés" value={s?.activity_7d.talents_created ?? 0} />
                </div>
            </div>

            <p className="text-xs text-ws-muted">
                Mise à jour automatique chaque minute
                {refreshLabel ? ` · ${refreshLabel}` : ""}
                {isFetching ? " · Actualisation…" : ""}
            </p>
        </div>
    );
}
