/**
 * Dashboard RH — GET /rh/analytics (WF n8n). Notifications : topbar globale.
 * Présentation modulaire — données et endpoints inchangés.
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { fetchRhAnalytics, RH_DASHBOARD_WEBHOOK_BASE, toRhDashboardUserMessage } from "@/api/rh-dashboard.api";
import type { RhAnalytics } from "@/types/rh-dashboard.types";
import { RhDashboardActionCenter } from "@/components/rh/dashboard/RhDashboardActionCenter";
import { RhDashboardExecutiveOverview } from "@/components/rh/dashboard/RhDashboardExecutiveOverview";
import { RhDashboardSkillsCapacity } from "@/components/rh/dashboard/RhDashboardSkillsCapacity";
import { RhDashboardWorkforceAnalytics } from "@/components/rh/dashboard/RhDashboardWorkforceAnalytics";
import { RhTalentInsightsSection } from "@/components/rh/dashboard/RhTalentInsightsSection";
import {
    RH_ALERT_ERROR,
    RH_ALERT_WARN,
    RH_BTN_SECONDARY,
    RH_CARD,
    RH_TEXT_MUTED,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export const DEFAULT_RH_WEBHOOK_BASE = RH_DASHBOARD_WEBHOOK_BASE;

export type DashboardRHProps = {
    enterpriseId: string;
    apiBase?: string;
    token?: string;
    onOpenTalents?: () => void;
};

export function DashboardRH({ enterpriseId, apiBase, token, onOpenTalents }: DashboardRHProps) {
    const eid = enterpriseId?.trim() ?? "";
    const [analytics, setAnalytics] = useState<RhAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(
        async (mode: "initial" | "refresh" = "initial") => {
            if (!eid) {
                setError("Identifiant entreprise manquant");
                setLoading(false);
                return;
            }
            if (mode === "refresh") setRefreshing(true);
            else setLoading(true);
            setError(null);
            try {
                const data = await fetchRhAnalytics(eid, { token, apiBase: apiBase?.trim() || undefined });
                setAnalytics(data);
            } catch (e: unknown) {
                setError(toRhDashboardUserMessage(e));
                setAnalytics(null);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [eid, token, apiBase],
    );

    useEffect(() => {
        void fetchAll("initial");
    }, [fetchAll]);

    if (!eid) {
        return <div className={cx("p-4", RH_ALERT_WARN)}>Identifiant entreprise requis.</div>;
    }

    if (loading) {
        return (
            <div className={cx("flex h-52 items-center justify-center", RH_TEXT_MUTED)}>
                <RefreshCw className="mr-2 animate-spin opacity-50" size={18} aria-hidden />
                Chargement du dashboard RH…
            </div>
        );
    }

    if (error) {
        return (
            <div className={cx("flex items-start gap-2 p-4", RH_ALERT_ERROR)}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span className="flex-1">{error}</span>
                <button
                    type="button"
                    onClick={() => void fetchAll("initial")}
                    className={cx("rounded border border-rose-200 px-2.5 py-1 text-xs dark:border-rose-800", RH_BTN_SECONDARY)}
                >
                    Réessayer
                </button>
            </div>
        );
    }

    if (!analytics) return null;

    const { kpis, alerts, rh_score } = analytics;
    const isEmpty = kpis.talents.total === 0 && rh_score === 0 && alerts.length === 0;

    if (isEmpty) {
        return (
            <p className={cx(RH_CARD, "border-dashed py-12 text-center text-sm", RH_TEXT_MUTED)}>
                Aucune donnée pour cette entreprise. Vérifiez le JWT (rôle rh + enterprise_id) et les workflows n8n
                publiés.
            </p>
        );
    }

    return (
        <div className="space-y-3 pb-4">
            <RhDashboardExecutiveOverview
                analytics={analytics}
                onRefresh={() => void fetchAll("refresh")}
                refreshing={refreshing}
            />

            <RhDashboardActionCenter analytics={analytics} onOpenTalents={onOpenTalents} />

            <RhTalentInsightsSection enterpriseId={eid} token={token} />

            <RhDashboardWorkforceAnalytics kpis={kpis} />

            <RhDashboardSkillsCapacity kpis={kpis} onOpenTalents={onOpenTalents} />
        </div>
    );
}

export default DashboardRH;
