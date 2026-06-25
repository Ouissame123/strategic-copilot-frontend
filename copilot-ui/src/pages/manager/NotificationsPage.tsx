import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { AlertCard } from "@/components/notifications/AlertCard";
import { AlertDetailsDrawer } from "@/components/notifications/AlertDetailsDrawer";
import { AlertSeveritySection } from "@/components/notifications/AlertSeveritySection";
import { AlertsFilters } from "@/components/notifications/AlertsFilters";
import { NotificationKpiCards } from "@/components/notifications/NotificationKpiCards";
import { NotificationsEmptyState } from "@/components/notifications/NotificationsEmptyState";
import { NotificationsHero } from "@/components/notifications/NotificationsHero";
import { NotificationsSkeleton } from "@/components/notifications/NotificationsSkeleton";
import {
    filterAlerts,
    groupAlertsBySeverity,
    isClosedAlertStatus,
    normalizeAlertSeverity,
    readNotificationRowId,
    readRiskAlertPatchId,
    SEVERITY_ORDER,
    type AlertFiltersState,
    type AlertQuickFilter,
    type AlertSeverity,
} from "@/components/notifications/notification-alert-utils";
import { TALENT_PAGE_BG } from "@/components/talent/talent-detail-shared";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { invalidateManagerRiskQueries } from "@/hooks/use-manager-risk-data";
import { useNotifications } from "@/hooks/useNotifications";
import { useWatchdogScan } from "@/hooks/useTeam";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { buildManagerListSearchParams, readUrlPagination } from "@/lib/manager-url-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination-utils";
import { readUserFacingApiErrorMessage } from "@/lib/user-facing-api-error";
import { useToast } from "@/providers/toast-provider";
import type { ManagerRiskAlertPatchAction } from "@/services/notifications.api";
import { notificationsApi, notificationsService } from "@/services/notifications.api";
import type { NotificationItem } from "@/types/api.types";

const NOT_LINKABLE_MSG = "Identifiant de notification introuvable.";

const QUICK_FILTER_LABELS: Record<AlertQuickFilter, string> = {
    today: "Aujourd'hui",
    week: "7 jours",
    overload: "Overload",
    contract: "Contrat < 90j",
    dependency: "Dépendance critique",
};

const SEVERITY_SECTION_TITLE: Record<AlertSeverity, string> = {
    critical: "Critiques",
    high: "Élevées",
    medium: "Moyennes",
    low: "Faibles",
    unknown: "Autres",
};

const DEFAULT_EXPANDED: Record<AlertSeverity, boolean> = {
    critical: true,
    high: true,
    medium: true,
    low: false,
    unknown: false,
};

export default function NotificationsPage() {
    const { t } = useTranslation("common");
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const urlSeverity = searchParams.get("severity") ?? searchParams.get("filter")?.replace("severity:", "") ?? "";
    const urlStatus = searchParams.get("status") ?? "";
    const { page, limit } = readUrlPagination(searchParams);

    const { data, isPending, isError, error, refetch, isFetching } = useNotifications({
        page,
        limit,
        severity: urlSeverity || undefined,
        status: urlStatus || undefined,
    });
    const { push } = useToast();
    const watchdogScan = useWatchdogScan();

    const [actingKey, setActingKey] = useState<string | null>(null);
    const [drawerAlert, setDrawerAlert] = useState<NotificationItem | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<AlertSeverity, boolean>>(DEFAULT_EXPANDED);

    const [filters, setFilters] = useState<AlertFiltersState>({
        search: "",
        severity: urlSeverity,
        type: "",
        projectId: "",
        talentId: "",
        status: urlStatus,
        showIgnored: false,
        quickFilters: new Set(),
    });

    const updateListParams = useCallback(
        (next: Partial<{ page: number; limit: number; severity?: string; status?: string }>) => {
            const merged = {
                page: next.page ?? page,
                limit: next.limit ?? limit,
                severity: next.severity !== undefined ? next.severity : filters.severity || urlSeverity,
                status: next.status !== undefined ? next.status : filters.status || urlStatus,
            };
            const resetPage =
                next.severity !== undefined || next.status !== undefined || next.limit !== undefined;
            setSearchParams(
                buildManagerListSearchParams(
                    {
                        severity: merged.severity || undefined,
                        status: merged.status || undefined,
                    },
                    { page: resetPage && next.page === undefined ? 1 : merged.page, limit: merged.limit },
                ),
            );
        },
        [filters.severity, filters.status, limit, page, setSearchParams, urlSeverity, urlStatus],
    );

    const allItems = data?.items ?? [];

    const openItems = useMemo(() => allItems.filter((a) => !isClosedAlertStatus(a.status)), [allItems]);

    const counts = useMemo(() => {
        if (data?.counts) {
            return {
                total: data.pagination?.total ?? data.total ?? openItems.length,
                critical: data.counts.critical ?? 0,
                high: data.counts.high ?? 0,
                medium: data.counts.medium ?? 0,
                low: data.counts.low ?? 0,
                resolved: data.counts.ack ?? 0,
                talents: new Set(openItems.map((a) => a.talent_id).filter(Boolean)).size,
                projects: new Set(openItems.map((a) => a.project_id).filter(Boolean)).size,
            };
        }
        const talentIds = new Set<string>();
        const projectIds = new Set<string>();
        for (const a of openItems) {
            const tid = String(a.talent_id ?? "").trim();
            const pid = String(a.project_id ?? "").trim();
            if (tid) talentIds.add(tid);
            if (pid) projectIds.add(pid);
        }
        return {
            total: openItems.length,
            critical: openItems.filter((a) => normalizeAlertSeverity(a.severity) === "critical").length,
            high: openItems.filter((a) => normalizeAlertSeverity(a.severity) === "high").length,
            medium: openItems.filter((a) => normalizeAlertSeverity(a.severity) === "medium").length,
            low: openItems.filter((a) => normalizeAlertSeverity(a.severity) === "low").length,
            resolved: allItems.filter((a) => isClosedAlertStatus(a.status)).length,
            talents: talentIds.size,
            projects: projectIds.size,
        };
    }, [allItems, data?.counts, data?.pagination?.total, data?.total, openItems]);

    const filteredAlerts = useMemo(() => filterAlerts(allItems, filters), [allItems, filters]);

    const grouped = useMemo(() => groupAlertsBySeverity(filteredAlerts), [filteredAlerts]);

    const projectOptions = useMemo(() => {
        const map = new Map<string, string>();
        for (const a of allItems) {
            const id = String(a.project_id ?? "").trim();
            const name = String(a.project_name ?? "").trim() || id.slice(0, 8);
            if (id) map.set(id, name);
        }
        return [...map.entries()].map(([value, label]) => ({ value, label }));
    }, [allItems]);

    const talentOptions = useMemo(() => {
        const map = new Map<string, string>();
        for (const a of allItems) {
            const id = String(a.talent_id ?? "").trim();
            const name = String(a.talent_name ?? "").trim() || id.slice(0, 8);
            if (id) map.set(id, name);
        }
        return [...map.entries()].map(([value, label]) => ({ value, label }));
    }, [allItems]);

    const typeOptions = useMemo(() => {
        const set = new Set<string>();
        for (const a of allItems) {
            const rt = String(a.risk_type ?? "").trim();
            if (rt) set.add(rt);
        }
        return [...set].sort().map((value) => ({ value, label: value }));
    }, [allItems]);

    const statusOptions = useMemo(() => {
        const set = new Set<string>();
        for (const a of allItems) {
            const st = String(a.status ?? "").trim();
            if (st) set.add(st);
        }
        return [...set].sort().map((value) => ({ value, label: value }));
    }, [allItems]);

    const heroSeverity = filters.severity || urlSeverity || "";

    const sevLabel = (s: string) => {
        const k = s.toLowerCase();
        if (k === "critical" || k === "high" || k === "medium" || k === "low") {
            return t(`managerWorkspace.commonSeverity.${k as "critical" | "high" | "medium" | "low"}`);
        }
        return s;
    };

    const severityOptions = useMemo(
        () =>
            (["critical", "high", "medium", "low"] as const).map((value) => ({
                value,
                label: sevLabel(value),
            })),
        [t],
    );

    const invalidateNotifications = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ["manager-notifications"] });
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
        await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        await invalidateManagerRiskQueries(queryClient);
        await refetch();
    }, [queryClient, refetch]);

    const ackNotification = useCallback(
        async (alert: NotificationItem, options?: { successMessage?: string; navigateToProject?: boolean }) => {
            const notificationId = readNotificationRowId(alert);
            if (!notificationId) {
                push(NOT_LINKABLE_MSG, "error");
                return;
            }
            setActingKey(`ack:${notificationId}`);
            try {
                await notificationsApi.ack(notificationId);
                push(options?.successMessage ?? t("managerWorkspace.notifications.toastDismissed"), "success");
                await invalidateNotifications();
                setDrawerAlert(null);
                if (options?.navigateToProject) {
                    const projectId = String(alert.project_id ?? "").trim();
                    if (projectId) {
                        navigate(`/workspace/manager/projects?project_id=${encodeURIComponent(projectId)}&tab=simulation`);
                    }
                }
            } catch (err) {
                const msg = readUserFacingApiErrorMessage(err, t("managerWorkspace.notifications.backendError"));
                push(t("managerWorkspace.notifications.toastDismissFail", { msg }), "error");
            } finally {
                setActingKey(null);
            }
        },
        [invalidateNotifications, navigate, push, t],
    );

    const patchRiskAlert = useCallback(
        async (
            alert: NotificationItem,
            action: ManagerRiskAlertPatchAction,
            options?: { successMessage: string; errorMessageKey?: "resolve" | "ignore" | "reopen"; navigateToProject?: boolean },
        ) => {
            const alertId = readRiskAlertPatchId(alert);
            if (!alertId) {
                push("Cette notification n'est pas liée à une alerte risque (risk_alert_id manquant).", "error");
                return;
            }
            setActingKey(`risk:${alertId}`);
            try {
                await notificationsService.patchAlert(alertId, action);
                push(options?.successMessage ?? t("managerWorkspace.notifications.toastResolved"), "success");
                await queryClient.invalidateQueries({ queryKey: ["manager-notifications"] });
                await invalidateNotifications();
                setDrawerAlert(null);
                if (options?.navigateToProject) {
                    const projectId = String(alert.project_id ?? "").trim();
                    if (projectId) {
                        navigate(`/workspace/manager/projects?project_id=${encodeURIComponent(projectId)}&tab=simulation`);
                    }
                }
            } catch (err) {
                const msg = readUserFacingApiErrorMessage(err, t("managerWorkspace.notifications.backendError"));
                const isAlertNotFound =
                    isAxiosError(err) &&
                    (err.response?.status === 404 ||
                        /introuvable|not found|ALERT_NOT_FOUND/i.test(msg) ||
                        /introuvable|ALERT_NOT_FOUND/i.test(
                            String((err.response?.data as Record<string, unknown> | undefined)?.message ?? ""),
                        ));
                if (isAlertNotFound && readNotificationRowId(alert)) {
                    await ackNotification(alert, {
                        successMessage:
                            options?.errorMessageKey === "ignore"
                                ? t("managerWorkspace.notifications.toastDismissed")
                                : "Notification acquittée.",
                        navigateToProject: options?.navigateToProject,
                    });
                    return;
                }
                if (options?.errorMessageKey === "reopen") {
                    push(`Échec de la réouverture : ${msg}`, "error");
                } else {
                    const failKey =
                        options?.errorMessageKey === "ignore"
                            ? "managerWorkspace.notifications.toastDismissFail"
                            : "managerWorkspace.notifications.toastResolveFail";
                    push(t(failKey, { msg }), "error");
                }
            } finally {
                setActingKey(null);
            }
        },
        [ackNotification, invalidateNotifications, navigate, push, queryClient, t],
    );

    const handleResolveAlert = useCallback(
        (alert: NotificationItem) => {
            if (readRiskAlertPatchId(alert)) {
                void patchRiskAlert(alert, "resolve", {
                    successMessage: t("managerWorkspace.notifications.toastResolved"),
                    errorMessageKey: "resolve",
                    navigateToProject: true,
                });
                return;
            }
            void ackNotification(alert, {
                successMessage: "Notification acquittée (aucune alerte risque liée).",
                navigateToProject: true,
            });
        },
        [ackNotification, patchRiskAlert, t],
    );

    const handleIgnoreAlert = useCallback(
        (alert: NotificationItem) => {
            if (readRiskAlertPatchId(alert)) {
                void patchRiskAlert(alert, "ignore", {
                    successMessage: t("managerWorkspace.notifications.toastDismissed"),
                    errorMessageKey: "ignore",
                });
                return;
            }
            void ackNotification(alert, { successMessage: t("managerWorkspace.notifications.toastDismissed") });
        },
        [ackNotification, patchRiskAlert, t],
    );

    const handleReopenAlert = useCallback(
        (alert: NotificationItem) =>
            void patchRiskAlert(alert, "reopen", {
                successMessage: "Alerte réouverte.",
                errorMessageKey: "reopen",
            }),
        [patchRiskAlert],
    );

    const setHeroSeverity = (id: string) => {
        const severity = id === "all" ? "" : id;
        setFilters((f) => ({ ...f, severity }));
        updateListParams({ severity, page: 1 });
    };

    const resetFilters = () => {
        setFilters({
            search: "",
            severity: "",
            type: "",
            projectId: "",
            talentId: "",
            status: "",
            showIgnored: false,
            quickFilters: new Set(),
        });
        setSearchParams(buildManagerListSearchParams({}, { page: 1, limit }));
    };

    const toggleQuickFilter = (id: AlertQuickFilter) => {
        setFilters((f) => {
            const next = new Set(f.quickFilters);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return { ...f, quickFilters: next };
        });
    };

    const errorMessage =
        error instanceof Error ? error.message : typeof error === "string" ? error : t("managerWorkspace.notifications.backendError");

    useWorkspaceTopbarMeta(t("managerWorkspace.notifications.pageTitle"), t("managerWorkspace.notifications.subtitle"));

    const cardLabels = {
        resolve: t("managerWorkspace.notifications.resolveBtn"),
        ignore: t("managerWorkspace.notifications.dismissBtn"),
        reopen: "Réouvrir",
        viewTalent: "Voir talent",
        viewProject: "Voir projet",
    };

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.notifications.pageTitle")}
            description={false}
            omitHeader
        >
            <div className={`min-h-screen ${TALENT_PAGE_BG}`}>
                <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
                    <NotificationsHero
                        title={t("managerWorkspace.notifications.pageTitle")}
                        subtitle={t("managerWorkspace.notifications.subtitle")}
                        totalCount={counts.total}
                        severityChips={[
                            { id: "all", label: t("managerWorkspace.notifications.filterAll"), count: counts.total },
                            { id: "critical", label: t("managerWorkspace.notifications.sevCritical"), count: counts.critical },
                            { id: "high", label: t("managerWorkspace.notifications.sevHigh"), count: counts.high },
                            { id: "medium", label: t("managerWorkspace.notifications.sevMedium"), count: counts.medium },
                            { id: "resolved", label: "Résolues", count: counts.resolved },
                        ]}
                        activeSeverity={filters.showIgnored ? "resolved" : heroSeverity || "all"}
                        onSeverityChange={(id) => {
                            if (id === "resolved") {
                                setFilters((f) => ({ ...f, showIgnored: true, severity: "" }));
                                setSearchParams({});
                                return;
                            }
                            setFilters((f) => ({ ...f, showIgnored: false }));
                            setHeroSeverity(id);
                        }}
                        onWatchdog={() =>
                            watchdogScan.mutate(
                                { use_ai: true },
                                {
                                    onSuccess: () => {
                                        push("Scan Watchdog global lancé.", "success");
                                        void invalidateNotifications();
                                    },
                                    onError: () => push("Échec du scan Watchdog global.", "error"),
                                },
                            )
                        }
                        watchdogPending={watchdogScan.isPending}
                    />

                    <NotificationKpiCards
                        items={[
                            { id: "critical", label: "Critiques", value: counts.critical, tone: "critical" },
                            { id: "high", label: "Élevées", value: counts.high, tone: "high" },
                            { id: "talents", label: "Talents impactés", value: counts.talents },
                            { id: "projects", label: "Projets impactés", value: counts.projects },
                        ]}
                    />

                    <AlertsFilters
                        filters={filters}
                        onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
                        onSeverityChange={(severity) => {
                            setFilters((f) => ({ ...f, severity }));
                            updateListParams({ severity, page: 1 });
                        }}
                        onTypeChange={(type) => setFilters((f) => ({ ...f, type }))}
                        onProjectChange={(projectId) => setFilters((f) => ({ ...f, projectId }))}
                        onTalentChange={(talentId) => setFilters((f) => ({ ...f, talentId }))}
                        onStatusChange={(status) => {
                            setFilters((f) => ({ ...f, status }));
                            updateListParams({ status, page: 1 });
                        }}
                        onShowIgnoredChange={(showIgnored) => setFilters((f) => ({ ...f, showIgnored }))}
                        onToggleQuickFilter={toggleQuickFilter}
                        onReset={resetFilters}
                        severityOptions={severityOptions}
                        typeOptions={typeOptions}
                        projectOptions={projectOptions}
                        talentOptions={talentOptions}
                        statusOptions={statusOptions}
                        quickFilterLabels={QUICK_FILTER_LABELS}
                    />

                    {isPending ? <NotificationsSkeleton /> : null}

                    {!isPending && isError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
                            <p className="text-sm font-medium text-red-900 dark:text-red-100">{t("managerWorkspace.notifications.loadError")}</p>
                            <p className="mt-1 text-xs text-red-800/90 dark:text-red-200/90">{errorMessage}</p>
                            <button
                                type="button"
                                className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50"
                                onClick={() => void refetch()}
                            >
                                {t("managerWorkspace.notifications.retry")}
                            </button>
                        </div>
                    ) : null}

                    {!isPending && !isError && filteredAlerts.length === 0 ? (
                        <NotificationsEmptyState
                            title="Excellente nouvelle"
                            subtitle={
                                filters.showIgnored
                                    ? "Aucune alerte ignorée ou résolue à afficher."
                                    : "Aucune alerte active. Tout est sous contrôle."
                            }
                        />
                    ) : null}

                    {!isPending && !isError && filteredAlerts.length > 0 ? (
                        <div className="space-y-6">
                            {SEVERITY_ORDER.map((sev) => {
                                const items = grouped[sev];
                                if (!items.length) return null;
                                return (
                                    <AlertSeveritySection
                                        key={sev}
                                        severity={sev}
                                        title={SEVERITY_SECTION_TITLE[sev]}
                                        count={items.length}
                                        expanded={expandedSections[sev]}
                                        onToggle={() =>
                                            setExpandedSections((s) => ({ ...s, [sev]: !s[sev] }))
                                        }
                                    >
                                        {items.map((alert, index) => {
                                            const patchId = readRiskAlertPatchId(alert);
                                            const notifId = readNotificationRowId(alert);
                                            const actingKeyForRow = patchId
                                                ? `risk:${patchId}`
                                                : notifId
                                                  ? `ack:${notifId}`
                                                  : "";
                                            const talentId = String(alert.talent_id ?? "").trim();
                                            const projectId = String(alert.project_id ?? "").trim();
                                            return (
                                                <AlertCard
                                                    key={`${alert.id}-${index}`}
                                                    alert={alert}
                                                    sevLabel={sevLabel}
                                                    fallbackTitle={t("managerWorkspace.notifications.fallbackTitle")}
                                                    t={t}
                                                    onOpen={() => setDrawerAlert(alert)}
                                                    onResolve={() => handleResolveAlert(alert)}
                                                    onIgnore={() => handleIgnoreAlert(alert)}
                                                    onReopen={() => handleReopenAlert(alert)}
                                                    onOpenTalent={
                                                        talentId
                                                            ? () => navigate(`/workspace/manager/team/${encodeURIComponent(talentId)}`)
                                                            : undefined
                                                    }
                                                    onOpenProject={
                                                        projectId
                                                            ? () =>
                                                                  navigate(
                                                                      `/workspace/manager/projects?project_id=${encodeURIComponent(projectId)}`,
                                                                  )
                                                            : undefined
                                                    }
                                                    acting={actingKey === actingKeyForRow}
                                                    canPatch={Boolean(patchId || notifId)}
                                                    labels={cardLabels}
                                                />
                                            );
                                        })}
                                    </AlertSeveritySection>
                                );
                            })}
                            <PaginationFooter
                                pagination={data?.pagination}
                                onPageChange={(p) => updateListParams({ page: p })}
                                onPageSizeChange={(size) => updateListParams({ limit: size, page: 1 })}
                                itemLabel="notifications"
                                loading={isFetching}
                            />
                        </div>
                    ) : null}
                </div>
            </div>

            <AlertDetailsDrawer
                alert={drawerAlert}
                open={Boolean(drawerAlert)}
                onClose={() => setDrawerAlert(null)}
                sevLabel={sevLabel}
                fallbackTitle={t("managerWorkspace.notifications.fallbackTitle")}
                t={t}
                onResolve={() => drawerAlert && handleResolveAlert(drawerAlert)}
                onIgnore={() => drawerAlert && handleIgnoreAlert(drawerAlert)}
                onReopen={() => drawerAlert && handleReopenAlert(drawerAlert)}
                isActing={
                    drawerAlert
                        ? actingKey ===
                          (readRiskAlertPatchId(drawerAlert)
                              ? `risk:${readRiskAlertPatchId(drawerAlert)}`
                              : readNotificationRowId(drawerAlert)
                                ? `ack:${readNotificationRowId(drawerAlert)}`
                                : "")
                        : false
                }
                labels={{
                    summary: "Résumé",
                    project: "Projet concerné",
                    talent: "Talent concerné",
                    context: "Contexte technique",
                    history: "Historique",
                    actions: "Actions rapides",
                    resolve: t("managerWorkspace.notifications.resolveBtn"),
                    ignore: t("managerWorkspace.notifications.dismissBtn"),
                    reopen: "Réouvrir",
                    openTalent: "Ouvrir Talent",
                    openProject: "Ouvrir Projet",
                    createRh: "Créer Demande RH",
                    close: "Fermer",
                }}
            />
        </WorkspacePageShell>
    );
}
