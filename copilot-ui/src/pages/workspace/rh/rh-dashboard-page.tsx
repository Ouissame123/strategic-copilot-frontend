import { useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useRhDashboardQuery, useRhOrganizationalAlertsQuery } from "@/hooks/use-rh-workspace-queries";
import { rowsFromRhPayload, pickCell } from "@/utils/rh-api-parse";
import { firstScalar, unwrapDataPayload } from "@/utils/unwrap-api-payload";

export default function RhDashboardPage() {
    const { t } = useTranslation(["common", "nav"]);
    useCopilotPage("dashboard", t("nav:rhNavDashboard"));

    const dashQ = useRhDashboardQuery();
    const alertsQ = useRhOrganizationalAlertsQuery();

    const summary = useMemo(() => unwrapDataPayload(dashQ.data ?? {}), [dashQ.data]);
    const alertPreview = useMemo(() => rowsFromRhPayload(alertsQ.data ?? {}).slice(0, 5), [alertsQ.data]);

    const copilotRhDashboardPayload = useMemo(
        () => ({
            pool: {
                total: firstScalar(summary, ["total_employees", "employees_count", "total_staff", "talents_count"]),
                available: firstScalar(summary, ["available_talents", "available_count"]),
                overloaded: firstScalar(summary, ["overloaded_count", "overload_count"]),
            },
            summaryRaw: summary,
            alertsPreview: alertPreview,
        }),
        [summary, alertPreview],
    );
    useCopilotPage("rh_dashboard", copilotRhDashboardPayload);

    /** Synthèse limitée : détails métier sur les pages dédiées (écarts, formations, effectifs, demandes, alertes). */
    const kpi = [
        { label: t("common:rhDash.kpiTotalEmployees"), value: firstScalar(summary, ["total_employees", "employees_count", "total_staff"]) },
        { label: t("common:rhDash.kpiAvailable"), value: firstScalar(summary, ["available_talents", "available_count"]) },
    ];

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH"
            title={t("nav:rhNavDashboard")}
            description={t("common:rhDash.description")}
        >
            {dashQ.isLoading || alertsQ.isLoading ? (
                <p className="text-sm text-tertiary">{t("common:loading")}</p>
            ) : null}

            {!dashQ.isLoading && dashQ.isError ? (
                <div className="rounded-2xl border border-secondary bg-primary p-6 text-sm text-error-primary">
                    {dashQ.error instanceof Error ? dashQ.error.message : String(dashQ.error)}
                    <Button color="secondary" size="sm" className="mt-3" onClick={() => void dashQ.refetch()}>
                        {t("common:retry")}
                    </Button>
                </div>
            ) : null}

            {!dashQ.isLoading && dashQ.isSuccess ? (
                <div className="space-y-8">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {kpi.map((c) => (
                            <div
                                key={c.label}
                                className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80"
                            >
                                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{c.label}</p>
                                <p className="mt-2 text-display-xs font-semibold tabular-nums text-primary">{String(c.value ?? "—")}</p>
                            </div>
                        ))}
                    </div>

                    <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-primary">{t("common:rhDash.topAlerts")}</h2>
                            <Link to="/workspace/rh/org-alerts" className="text-sm font-semibold text-brand-secondary underline">
                                {t("common:rhDash.seeAll")}
                            </Link>
                        </div>
                        {alertsQ.isError ? (
                            <p className="mt-3 text-sm text-tertiary">{t("common:rhDash.alertsUnavailable")}</p>
                        ) : alertPreview.length === 0 ? (
                            <p className="mt-3 text-sm text-tertiary">{t("common:rhDash.noAlerts")}</p>
                        ) : (
                            <ul className="mt-3 space-y-2 text-sm text-secondary">
                                {alertPreview.map((row, i) => (
                                    <li key={`a-${i}`} className="rounded-lg border border-secondary/80 bg-secondary/15 px-3 py-2">
                                        <span className="font-medium text-primary">{pickCell(row, ["title", "type", "label"])}</span>
                                        <span className="text-tertiary"> — </span>
                                        {pickCell(row, ["message", "description", "detail"])}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            ) : null}
        </WorkspacePageShell>
    );
}
