import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHero } from "@/components/layout/PageHero";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useNotifications, usePatchAlert } from "@/hooks/useNotifications";
import { useToast } from "@/providers/toast-provider";
import type { NotificationItem } from "@/types/api.types";

function formatDetectedLabel(
    item: NotificationItem,
    t: (key: string, opts?: Record<string, string | number>) => string,
): string {
    const hours = item.age_hours;
    if (typeof hours === "number" && Number.isFinite(hours)) {
        return t("managerWorkspace.notifications.detected", { hours: Math.max(0, Math.round(hours)) });
    }
    const iso = item.created_at?.trim();
    if (!iso) return "—";
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts)) return "—";
    const h = Math.max(0, Math.round((Date.now() - ts) / 3_600_000));
    return t("managerWorkspace.notifications.detected", { hours: h });
}

export default function NotificationsPage() {
    const { t } = useTranslation("common");
    const [searchParams] = useSearchParams();
    const severityFilter = searchParams.get("filter")?.replace("severity:", "");

    const { data, isPending, isError, error, refetch } = useNotifications({ limit: 200 });
    const patch = usePatchAlert();
    const { push } = useToast();

    const alerts = useMemo(() => {
        let list = data?.items ?? [];
        if (severityFilter) list = list.filter((a) => a.severity === severityFilter);
        return list;
    }, [data, severityFilter]);

    const counts = useMemo(() => {
        const all = data?.items ?? [];
        return {
            total: all.length,
            critical: all.filter((a) => a.severity === "critical").length,
            high: all.filter((a) => a.severity === "high").length,
            medium: all.filter((a) => a.severity === "medium").length,
        };
    }, [data]);

    const sevLabel = (s: string) => {
        const k = s.toLowerCase();
        if (k === "critical" || k === "high" || k === "medium" || k === "low") {
            return t(`managerWorkspace.commonSeverity.${k as "critical" | "high" | "medium" | "low"}`);
        }
        return s;
    };

    const errorMessage =
        error instanceof Error ? error.message : typeof error === "string" ? error : t("managerWorkspace.notifications.backendError");

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.notifications.pageTitle")}
            description={false}
            omitHeader
        >
            <PageHero
                eyebrow={t("workspaceRoles.manager")}
                title={t("managerWorkspace.notifications.pageTitle")}
                subtitle={t("managerWorkspace.notifications.subtitle")}
                badge={t("workspaceRoles.manager")}
                actions={
                    <Link
                        to="/workspace/manager/dashboard"
                        className="rounded-lg border border-secondary bg-primary_alt px-3 py-2 text-xs font-semibold text-secondary hover:bg-secondary_subtle"
                    >
                        {t("managerWorkspace.notifications.backDashboard")}
                    </Link>
                }
            />

            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <SeverityFilter
                        label={t("managerWorkspace.notifications.filterAll")}
                        count={counts.total}
                        active={!severityFilter}
                        link="/workspace/manager/notifications"
                    />
                    <SeverityFilter
                        label={t("managerWorkspace.notifications.sevCritical")}
                        count={counts.critical}
                        active={severityFilter === "critical"}
                        link="/workspace/manager/notifications?filter=severity:critical"
                        color="red"
                    />
                    <SeverityFilter
                        label={t("managerWorkspace.notifications.sevHigh")}
                        count={counts.high}
                        active={severityFilter === "high"}
                        link="/workspace/manager/notifications?filter=severity:high"
                        color="orange"
                    />
                    <SeverityFilter
                        label={t("managerWorkspace.notifications.sevMedium")}
                        count={counts.medium}
                        active={severityFilter === "medium"}
                        link="/workspace/manager/notifications?filter=severity:medium"
                        color="yellow"
                    />
                </div>

                {isPending ? (
                    <div className="rounded-xl border border-secondary bg-primary p-8 text-center">
                        <p className="text-sm text-tertiary">{t("managerWorkspace.notifications.loading")}</p>
                    </div>
                ) : null}

                {!isPending && isError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
                        <p className="text-sm font-medium text-red-900 dark:text-red-100">{t("managerWorkspace.notifications.loadError")}</p>
                        <p className="mt-1 text-xs text-red-800/90 dark:text-red-200/90">{errorMessage}</p>
                        <button
                            type="button"
                            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-50 dark:hover:bg-red-900/40"
                            onClick={() => void refetch()}
                        >
                            {t("managerWorkspace.notifications.retry")}
                        </button>
                    </div>
                ) : null}

                {!isPending && !isError && alerts.length === 0 ? (
                    <p className="rounded-xl border border-secondary bg-primary p-8 text-center text-sm text-tertiary">
                        {severityFilter
                            ? t("managerWorkspace.notifications.emptyFiltered", { severity: sevLabel(severityFilter) })
                            : t("managerWorkspace.notifications.emptyAll")}
                    </p>
                ) : null}

                {!isPending && !isError
                    ? alerts.map((a) => (
                          <div key={a.id} className="rounded-xl border border-secondary bg-primary p-4">
                              <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                          <SeverityBadge severity={String(a.severity ?? "")} label={sevLabel(String(a.severity ?? ""))} />
                                          <h3 className="font-medium text-primary">{a.project_name || a.title || t("managerWorkspace.notifications.fallbackTitle")}</h3>
                                          {a.risk_type ? <span className="text-xs text-tertiary">· {a.risk_type}</span> : null}
                                      </div>
                                      <p className="mt-1 text-sm text-primary">{a.message || a.title}</p>
                                      <div className="mt-2 text-xs text-tertiary">
                                          {typeof a.risk_score === "number" && Number.isFinite(a.risk_score) ? (
                                              <>
                                                  {t("managerWorkspace.notifications.riskScore")}{" "}
                                                  <strong>{a.risk_score}</strong>/10 ·{" "}
                                              </>
                                          ) : null}
                                          {formatDetectedLabel(a, t)}
                                      </div>
                                  </div>
                                  <div className="flex flex-col gap-2 sm:flex-row">
                                      <button
                                          type="button"
                                          onClick={() =>
                                              patch.mutate(
                                                  { id: String(a.id ?? ""), action: "resolve" },
                                                  {
                                                      onSuccess: () => push(t("managerWorkspace.notifications.toastResolved"), "success"),
                                                      onError: (err) => {
                                                          const msg = err instanceof Error ? err.message : t("managerWorkspace.notifications.backendError");
                                                          push(t("managerWorkspace.notifications.toastResolveFail", { msg }), "error");
                                                      },
                                                  },
                                              )
                                          }
                                          disabled={patch.isPending || !a.id}
                                          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                      >
                                          {t("managerWorkspace.notifications.resolveBtn")}
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() =>
                                              patch.mutate(
                                                  { id: String(a.id ?? ""), action: "dismiss" },
                                                  {
                                                      onSuccess: () => push(t("managerWorkspace.notifications.toastDismissed"), "neutral"),
                                                      onError: (err) => {
                                                          const msg = err instanceof Error ? err.message : t("managerWorkspace.notifications.backendError");
                                                          push(t("managerWorkspace.notifications.toastDismissFail", { msg }), "error");
                                                      },
                                                  },
                                              )
                                          }
                                          disabled={patch.isPending || !a.id}
                                          className="rounded-md border border-secondary px-3 py-1.5 text-xs hover:bg-secondary_subtle disabled:opacity-50"
                                      >
                                          {t("managerWorkspace.notifications.dismissBtn")}
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))
                    : null}
            </div>
        </WorkspacePageShell>
    );
}

function SeverityFilter({
    label,
    count,
    active,
    link,
    color,
}: {
    label: string;
    count: number;
    active: boolean;
    link: string;
    color?: string;
}) {
    const colorClass =
        color === "red"
            ? "border-red-300 text-red-700"
            : color === "orange"
              ? "border-orange-300 text-orange-700"
              : color === "yellow"
                ? "border-yellow-300 text-yellow-700"
                : "border-secondary text-secondary";
    return (
        <Link
            to={link}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
                active ? "border-brand-solid bg-brand-solid text-white" : `${colorClass} hover:bg-secondary_subtle`
            }`}
        >
            {label} <span className="ml-1 font-semibold">{count}</span>
        </Link>
    );
}

function SeverityBadge({ severity, label }: { severity: string; label: string }) {
    const colors: Record<string, string> = {
        critical: "border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100",
        high: "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-950/35 dark:text-orange-100",
        medium: "border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-800 dark:bg-amber-950/30 dark:text-amber-100",
        low: "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-100",
    };
    return (
        <span className={`rounded border px-2 py-0.5 text-xs uppercase ${colors[severity] ?? "border-secondary bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-200"}`}>
            {label}
        </span>
    );
}
