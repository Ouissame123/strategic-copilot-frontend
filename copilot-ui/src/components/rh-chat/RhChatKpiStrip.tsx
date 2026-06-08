import { useQuery } from "@tanstack/react-query";
import { Bell, Briefcase, Loader2, UserSquare2, Users } from "lucide-react";
import { memo, useMemo } from "react";
import { fetchRhManagersList } from "@/api/rh-managers.api";
import { useRhAnalyticsQuery, useRhNotificationsQuery } from "@/hooks/use-rh-workspace-queries";
import { useRhRequestsListQuery } from "@/hooks/use-rh-requests-decision";
import { RH_DASHBOARD_WEBHOOK_BASE } from "@/api/rh-dashboard.api";
import { rhRequestStatusToBucket } from "@/utils/rh-requests-decision";
import { cx } from "@/utils/cx";

type RhChatKpiStripProps = {
    enterpriseId?: string;
    className?: string;
};

type KpiCardProps = {
    label: string;
    value: string | number;
    icon: typeof Users;
    loading?: boolean;
    accent: string;
};

function KpiCard({ label, value, icon: Icon, loading, accent }: KpiCardProps) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {label}
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                        {loading ? "—" : value}
                    </p>
                </div>
                <div className={cx("flex size-10 items-center justify-center rounded-xl text-white shadow-sm", accent)}>
                    {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Icon className="size-4" aria-hidden />}
                </div>
            </div>
        </div>
    );
}

export const RhChatKpiStrip = memo(function RhChatKpiStrip({ enterpriseId, className }: RhChatKpiStripProps) {
    const eid = enterpriseId?.trim() ?? "";
    const enabled = Boolean(eid);

    const analyticsQuery = useRhAnalyticsQuery(eid);
    const notificationsQuery = useRhNotificationsQuery(eid, 50);
    const requestsQuery = useRhRequestsListQuery({}, { enabled });

    const managersQuery = useQuery({
        queryKey: ["rh", "chat", "kpi", "managers"],
        queryFn: ({ signal }) =>
            fetchRhManagersList({
                signal,
                apiBase:
                    (import.meta.env.VITE_RH_DASHBOARD_API_BASE as string | undefined)?.trim() ||
                    RH_DASHBOARD_WEBHOOK_BASE,
            }),
        enabled,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });

    const pendingRequests = useMemo(() => {
        const items = requestsQuery.data?.items ?? [];
        return items.filter((item) => rhRequestStatusToBucket(item.status) === "pending").length;
    }, [requestsQuery.data?.items]);

    const talentsTotal = analyticsQuery.data?.kpis.talents.total;
    const managersCount = managersQuery.data?.managers?.length ?? 0;
    const notificationsCount =
        notificationsQuery.data?.summary.unread_count ?? notificationsQuery.data?.count ?? 0;

    const anyLoading =
        enabled &&
        (analyticsQuery.isPending ||
            notificationsQuery.isPending ||
            requestsQuery.isPending ||
            managersQuery.isPending);

    if (!enabled) {
        return (
            <div className={cx("rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40", className)}>
                Connectez-vous pour afficher les indicateurs RH en temps réel.
            </div>
        );
    }

    return (
        <div className={cx("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
            <KpiCard
                label="Talents"
                value={talentsTotal ?? 0}
                icon={Users}
                loading={analyticsQuery.isPending}
                accent="bg-gradient-to-br from-violet-600 to-indigo-600"
            />
            <KpiCard
                label="Managers"
                value={managersCount ?? 0}
                icon={UserSquare2}
                loading={managersQuery.isPending}
                accent="bg-gradient-to-br from-indigo-600 to-violet-700"
            />
            <KpiCard
                label="Notifications"
                value={notificationsCount}
                icon={Bell}
                loading={notificationsQuery.isPending}
                accent="bg-gradient-to-br from-violet-500 to-purple-600"
            />
            <KpiCard
                label="Demandes RH"
                value={pendingRequests}
                icon={Briefcase}
                loading={requestsQuery.isPending || anyLoading}
                accent="bg-gradient-to-br from-indigo-500 to-violet-600"
            />
        </div>
    );
});
