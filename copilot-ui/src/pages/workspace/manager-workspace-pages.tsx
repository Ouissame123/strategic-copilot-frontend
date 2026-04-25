import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import {
    getManagerMonitoring,
    getManagerWorkspaceProjects,
    parseManagerWorkspaceProjectsResponse,
    type ManagerWorkspaceProjectsMeta,
    type ManagerWorkspaceProjectsPagination,
} from "@/api/workspace-manager.api";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Table, TableCard } from "@/components/application/table/table";
import { ProjectStatusBadge } from "@/components/project/project-status-badge";
import { ManagerProjectDetailBody } from "@/components/project/manager-project-detail-body";
import { RequestRhActionModal } from "@/components/project/request-rh-action-modal";
import { ErrorState } from "@/components/ui/ErrorState";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { toUserMessage } from "@/hooks/crud/error-message";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useProjectDetail } from "@/hooks/use-project-detail";
import { usePostRhActionMutation } from "@/hooks/use-rh-actions-query";
import { useAuth } from "@/providers/auth-provider";
import { useWhatIf } from "@/providers/what-if-provider";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { formatRowText, getRowField, isAttentionRow, pickScalarDisplay } from "@/pages/workspace/manager-monitoring-display";
import { getDecisionBadgeColor } from "@/pages/projects/projects-utils";
import { ApiError } from "@/utils/apiClient";
import { cx } from "@/utils/cx";

/** GET `…/api/workspace/manager/projects` uniquement — `VITE_API_BASE_URL`. */
const MANAGER_PROJECTS_PAGE_SIZE = 20;

const API_BASE_FOR_DEBUG = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";

/** Même chemin que `getManagerWorkspaceProjects` + `apiGet` / `buildUrl` — pour logs dev uniquement. */
function resolveManagerProjectsUrlForDebug(params: Parameters<typeof getManagerWorkspaceProjects>[0]): string {
    const qs = new URLSearchParams();
    if (params.enterprise_id?.trim()) qs.set("enterprise_id", params.enterprise_id.trim());
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.status?.trim()) qs.set("status", params.status.trim());
    if (params.search?.trim()) qs.set("search", params.search.trim());
    const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
    const path = `/api/workspace/manager/projects${suffix}`;
    return API_BASE_FOR_DEBUG ? `${API_BASE_FOR_DEBUG}${path}` : path;
}

/** Colonnes tableau manager : clés API items[] + libellés (affichage uniquement, pas de calcul métier). */
const MANAGER_PROJECT_TABLE_COLUMNS: readonly { key: string; label: string }[] = [
    { key: "name", label: "Nom du projet" },
    { key: "status", label: "Statut" },
    { key: "decision", label: "Décision stratégique" },
    { key: "viability_score", label: "Score de viabilité" },
    { key: "risk_level", label: "Niveau de risque" },
    { key: "project_health_score", label: "Santé projet" },
    { key: "last_analysis_at", label: "Dernière analyse" },
];

type ManagerProjectsBundle = {
    summary: ReturnType<typeof parseManagerWorkspaceProjectsResponse>["summary"];
    items: Record<string, unknown>[];
    pagination: ManagerWorkspaceProjectsPagination | null;
    meta: ManagerWorkspaceProjectsMeta;
};

type MonitoringLoadState = "idle" | "loading" | "success" | "error";

type MonitoringBundle = {
    summary: Record<string, unknown>;
    items: Record<string, unknown>[];
};

export function useProjectsMonitoringBundle() {
    const { user } = useAuth();
    const [state, setState] = useState<MonitoringLoadState>("idle");
    const [error, setError] = useState<string | null>(null);
    const [bundle, setBundle] = useState<MonitoringBundle | null>(null);

    const enterpriseId = useMemo(() => {
        const fromUser = user?.enterpriseId?.trim();
        const fromEnv = (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined)?.trim();
        return fromUser || fromEnv || "";
    }, [user?.enterpriseId]);

    const load = useCallback(async () => {
        setState("loading");
        setError(null);
        try {
            const res = await getManagerMonitoring(
                { enterprise_id: enterpriseId },
            );
            setBundle({ summary: res.summary, items: res.items });
            setState("success");
        } catch (e) {
            setBundle(null);
            setError(toUserMessage(e));
            setState("error");
        }
    }, [enterpriseId]);

    useEffect(() => {
        void load();
    }, [load]);

    return { state, error, bundle, reload: load };
}

function ManagerKpiCard({
    title,
    value,
    hint,
    loading,
    valueClassName,
}: {
    title: string;
    value: string;
    hint?: string;
    loading?: boolean;
    valueClassName?: string;
}) {
    return (
        <div
            className={`flex flex-col rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 ${hint ? "min-h-[6.5rem]" : "min-h-[5.5rem] justify-center"}`}
        >
            <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{title}</p>
            <div
                className={cx(
                    "mt-2 min-h-[2.25rem] text-display-xs font-semibold tabular-nums md:text-display-sm md:min-h-[2.5rem]",
                    !loading && (valueClassName ?? "text-primary"),
                )}
            >
                {loading ? (
                    <span className="inline-block h-9 w-16 max-w-[40%] animate-pulse rounded-md bg-secondary" aria-hidden />
                ) : (
                    value
                )}
            </div>
            {hint ? <p className="mt-auto pt-2 text-xs text-tertiary">{hint}</p> : null}
        </div>
    );
}

export function managerProjectDetailHref(row: Record<string, unknown>, projectPath: (id: string) => string): string | null {
    const id = getRowField(row, ["id", "project_id"]);
    if (id == null || String(id).trim() === "") return null;
    return projectPath(String(id));
}

function displayApiValue(v: unknown): string {
    if (v == null || v === "") return "—";
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "—";
    if (typeof v === "object") return "—";
    return String(v);
}

/** Date/heure lisible (locale navigateur) — pas de calcul métier. */
function formatManagerAnalysisDate(value: unknown, localeHint: string): string {
    if (value == null || value === "") return "—";
    const d = new Date(typeof value === "number" || typeof value === "string" ? value : String(value));
    if (Number.isNaN(d.getTime())) return "—";
    const loc = localeHint.startsWith("fr") ? "fr-FR" : localeHint.startsWith("en") ? "en-US" : undefined;
    return new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function riskLevelBadgeColor(raw: unknown): "success" | "warning" | "error" | "gray" {
    const v = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (v === "high" || v === "critical" || v === "elevated") return "error";
    if (v === "medium" || v === "moderate") return "warning";
    if (v === "low" || v === "minimal") return "success";
    return "gray";
}

function renderManagerProjectDataCell(
    row: Record<string, unknown>,
    colKey: string,
    localeHint: string,
): ReactNode {
    const value = row[colKey];

    if (colKey === "status") {
        if (!String(value ?? "").trim()) return <span className="text-sm text-tertiary">—</span>;
        return (
            <div className="max-w-[12rem]">
                <ProjectStatusBadge status={value as string} className="max-w-full" />
            </div>
        );
    }

    if (colKey === "decision") {
        if (!String(value ?? "").trim()) return <span className="text-sm text-tertiary">—</span>;
        const label = String(value).trim();
        return (
            <Badge type="pill-color" size="sm" color={getDecisionBadgeColor(label)}>
                {label}
            </Badge>
        );
    }

    if (colKey === "risk_level") {
        if (!String(value ?? "").trim()) return <span className="text-sm text-tertiary">—</span>;
        const label = String(value).trim();
        return (
            <Badge type="pill-color" size="sm" color={riskLevelBadgeColor(label)}>
                {label}
            </Badge>
        );
    }

    if (colKey === "last_analysis_at") {
        return (
            <span className="break-words text-sm leading-snug text-secondary">{formatManagerAnalysisDate(value, localeHint)}</span>
        );
    }

    if (colKey === "name") {
        return <span className="font-medium text-primary">{displayApiValue(value)}</span>;
    }

    return <span className="whitespace-nowrap text-sm text-secondary">{displayApiValue(value)}</span>;
}

type ManagerWsLoadState = "idle" | "loading" | "success" | "error";

function renderMonitoringLoadCell(loadDisplay: string): ReactNode {
    if (loadDisplay === "—") return <span className="text-sm text-tertiary">—</span>;
    const cleaned = loadDisplay.replace(/,/g, ".").replace(/[^\d.-]/g, "");
    const n = parseFloat(cleaned);
    if (!Number.isFinite(n)) {
        return <span className="text-sm tabular-nums text-secondary">{loadDisplay}</span>;
    }
    let tone: "error" | "warning" | "success" = "success";
    let label = "Normale";
    if (n > 80) {
        tone = "error";
        label = "Surcharge";
    } else if (n > 50) {
        tone = "warning";
        label = "Élevée";
    }
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm tabular-nums text-secondary">{loadDisplay}</span>
            <Badge type="pill-color" size="sm" color={tone}>
                {label}
            </Badge>
        </div>
    );
}

/** Timestamp ISO → libellé relatif (fr). */
function formatAnalysisRelative(iso: string | undefined, nowMs: number): string | null {
    if (!iso?.trim()) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const diffMs = Math.max(0, nowMs - d.getTime());
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "à l’instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 48) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days} j`;
}

function latestAnalysisIsoFromPayload(
    summary: { last_analysis_at?: string } | undefined,
    items: Record<string, unknown>[],
): string | undefined {
    if (summary?.last_analysis_at?.trim()) return summary.last_analysis_at.trim();
    let best = 0;
    let bestIso: string | undefined;
    for (const row of items) {
        const raw = row.last_analysis_at ?? row.updated_at;
        if (typeof raw !== "string" || !raw.trim()) continue;
        const t = new Date(raw).getTime();
        if (!Number.isNaN(t) && t >= best) {
            best = t;
            bestIso = raw.trim();
        }
    }
    return bestIso;
}

/** Moyenne des `viability_score` sur la page courante (affichage uniquement). */
function averageViabilityPercent(items: Record<string, unknown>[]): number | null {
    const nums: number[] = [];
    for (const row of items) {
        const v = row.viability_score;
        if (typeof v === "number" && Number.isFinite(v)) nums.push(v);
    }
    if (nums.length === 0) return null;
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return Math.round((avg / 10) * 1000) / 10;
}

export function ManagerProjectsWorkspacePage() {
    const { t, i18n } = useTranslation(["common", "nav"]);
    const { user } = useAuth();
    const paths = useWorkspacePaths();
    const { open: openWhatIf } = useWhatIf();
    const postRhAction = usePostRhActionMutation();
    useCopilotPage("projects_list", t("workspace.managerWsTitle"));

    const [loadState, setLoadState] = useState<ManagerWsLoadState>("idle");
    const [error, setError] = useState<string | null>(null);
    const [bundle, setBundle] = useState<ManagerProjectsBundle | null>(null);
    const [page, setPage] = useState(1);
    const [rhActionProject, setRhActionProject] = useState<{ id: string; name: string } | null>(null);
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
    const [detailProjectId, setDetailProjectId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const detailQuery = useProjectDetail(detailProjectId ?? "", detailOpen && Boolean(detailProjectId));

    const enterpriseId = useMemo(() => {
        const fromUser = user?.enterpriseId?.trim();
        const fromEnv = (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined)?.trim();
        return fromUser || fromEnv || "";
    }, [user?.enterpriseId]);

    const fetchData = useCallback(async () => {
        setLoadState("loading");
        setError(null);
        const projectParams: Parameters<typeof getManagerWorkspaceProjects>[0] = {
            page,
            limit: MANAGER_PROJECTS_PAGE_SIZE,
            enterprise_id: enterpriseId,
        };
        try {
            const raw = await getManagerWorkspaceProjects(projectParams);

            const parsed = parseManagerWorkspaceProjectsResponse(raw);
            setBundle({
                summary: parsed.summary,
                items: parsed.items,
                pagination: parsed.pagination,
                meta: parsed.meta,
            });
            setLoadState("success");
        } catch (e) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.warn("[ManagerProjects:request failed]", {
                    url: resolveManagerProjectsUrlForDebug(projectParams),
                    error: e,
                    httpStatus: e instanceof ApiError ? e.status : undefined,
                    responseBody: e instanceof ApiError ? e.payload : undefined,
                    isApiError: e instanceof ApiError,
                });
            }
            setBundle(null);
            setError(toUserMessage(e));
            setLoadState("error");
        }
    }, [enterpriseId, page]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    useEffect(() => {
        const id = window.setInterval(() => void fetchData(), 30_000);
        return () => window.clearInterval(id);
    }, [fetchData]);

    const summary = bundle?.summary;
    const pagination = bundle?.pagination;
    const items = bundle?.items ?? [];

    const copilotManagerProjectsPayload = useMemo(
        () => ({
            summary: {
                total_projects: summary?.total_projects,
                active_projects: summary?.active_projects,
                adjust_decisions: summary?.adjust_decisions,
                stop_decisions: summary?.stop_decisions,
                last_analysis_at: summary?.last_analysis_at,
            },
            projects: items.map((row) => ({
                id: String(getRowField(row, ["id", "project_id"]) ?? ""),
                name: formatRowText(getRowField(row, ["name", "project_name", "title"])),
                status: formatRowText(getRowField(row, ["status", "project_status"])),
                viability: typeof row.viability_score === "number" ? row.viability_score : null,
                decision: formatRowText(getRowField(row, ["decision", "strategic_decision", "ai_decision", "viability_decision"])),
                risk: formatRowText(getRowField(row, ["risk", "risk_level"])),
            })),
            pagination: pagination
                ? { page: pagination.page, total_pages: pagination.total_pages, total: pagination.total }
                : null,
        }),
        [summary, items, pagination],
    );
    useCopilotPage("manager_projects", copilotManagerProjectsPayload);

    const kpiLoading = loadState === "loading";
    /** KPI : compteurs issus du `summary` serveur ; jamais « — », 0 par défaut. Moyenne viabilité = page courante uniquement. */
    const kpiTotal = String(summary?.total_projects ?? 0);
    const kpiActive = String(summary?.active_projects ?? 0);
    const kpiAttention = String(summary?.adjust_decisions ?? 0);
    const kpiStop = String(summary?.stop_decisions ?? 0);
    const kpiAvgPct = averageViabilityPercent(items);
    const kpiAvgLabel = kpiAvgPct != null ? `${kpiAvgPct} %` : "0 %";

    const heroDescription = useMemo(() => {
        if (loadState === "loading") {
            return <span className="text-tertiary">Chargement du périmètre…</span>;
        }
        if (loadState !== "success" || !bundle) {
            return <span className="text-tertiary">Pilotage des projets du périmètre.</span>;
        }
        const total = summary?.total_projects ?? 0;
        const active = summary?.active_projects ?? 0;
        const lastIso = latestAnalysisIsoFromPayload(summary, items);
        const rel = formatAnalysisRelative(lastIso, Date.now());
        const main = `${total} projets suivis · ${active} actifs${rel ? ` · dernière analyse ${rel}` : ""}`;
        const ent = bundle.meta.enterprise_name?.trim();
        return (
            <div className="space-y-1.5">
                <p className="text-md font-medium text-secondary">{main}</p>
                {ent ? <p className="text-sm text-tertiary">{ent}</p> : null}
            </div>
        );
    }, [loadState, bundle, summary, items]);

    const rowsWithId = useMemo(
        () =>
            items.map((row, i) => ({
                ...row,
                id: String(row.id ?? row.project_id ?? `ws-${i}`),
            })) as Array<Record<string, unknown> & { id: string }>,
        [items],
    );

    const isEmptySuccess = loadState === "success" && items.length === 0;

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspace.managerWsEyebrow")}
            title={t("workspace.managerWsTitle")}
            description={heroDescription}
        >
            {loadState === "loading" ? (
                <div className="flex min-h-48 items-center justify-center rounded-2xl border border-secondary bg-primary p-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("common:loading")} />
                </div>
            ) : null}

            {loadState === "error" ? (
                <div className="rounded-2xl border border-secondary bg-primary p-6">
                    <EmptyState size="md">
                        <EmptyState.Content>
                            <EmptyState.Title>Données indisponibles</EmptyState.Title>
                            <EmptyState.Description>{error}</EmptyState.Description>
                        </EmptyState.Content>
                        <EmptyState.Footer>
                            <Button color="secondary" size="sm" onClick={() => void fetchData()}>
                                {t("common:retry")}
                            </Button>
                        </EmptyState.Footer>
                    </EmptyState>
                </div>
            ) : null}

            {loadState === "success" && bundle ? (
                <div className="space-y-10">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <ManagerKpiCard title="Projets suivis" value={kpiTotal} loading={kpiLoading} />
                        <ManagerKpiCard title="Projets actifs" value={kpiActive} loading={kpiLoading} />
                        <ManagerKpiCard
                            title="Projets à attention"
                            value={kpiAttention}
                            loading={kpiLoading}
                            valueClassName={
                                !kpiLoading && Number.parseInt(kpiAttention, 10) > 0 ? "text-error-primary" : "text-primary"
                            }
                        />
                        <ManagerKpiCard title="Décisions stop" value={kpiStop} loading={kpiLoading} />
                        <ManagerKpiCard
                            title="Taux d'avancement moyen"
                            value={kpiAvgLabel}
                            loading={kpiLoading}
                        />
                    </div>

                    <section className="space-y-4">
                        <div className="border-b border-secondary pb-1">
                            <h2 className="text-lg font-semibold tracking-tight text-primary">Projets</h2>
                            <p className="mt-1 text-sm text-tertiary">Vue synthétique pour le pilotage.</p>
                        </div>
                        <TableCard.Root size="md" className="overflow-hidden shadow-xs ring-1 ring-secondary/60">
                            <TableCard.Header
                                title="Liste des projets"
                                description="Colonnes métier — valeurs affichées telles qu’issues du serveur."
                            />
                            {isEmptySuccess ? (
                                <div className="px-4 py-10 md:px-6">
                                    <EmptyState size="sm">
                                        <EmptyState.Content>
                                            <EmptyState.Title>Aucun projet dans la liste</EmptyState.Title>
                                            <EmptyState.Description>
                                                Aucun projet dans cette page pour le moment.
                                            </EmptyState.Description>
                                        </EmptyState.Content>
                                    </EmptyState>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table aria-label="Projets workspace manager" className="min-w-0 w-full">
                                        <thead className="bg-secondary">
                                            <tr className="h-11">
                                                {MANAGER_PROJECT_TABLE_COLUMNS.map((col) => (
                                                    <th key={col.key} className="px-6 py-2 text-left text-xs font-semibold whitespace-nowrap text-quaternary">
                                                        {col.label}
                                                    </th>
                                                ))}
                                                <th className="px-6 py-2 text-left text-xs font-semibold whitespace-nowrap text-quaternary">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rowsWithId.map((row) => {
                                                const rowId = String(row.id);
                                                const href = managerProjectDetailHref(row, paths.project);
                                                const pid = String(row.id ?? row.project_id ?? "").trim();
                                                const pname = String(
                                                    (row as Record<string, unknown>).name ??
                                                        (row as Record<string, unknown>).title ??
                                                        (row as Record<string, unknown>).project_name ??
                                                        "",
                                                ).trim();
                                                const isExpanded = expandedProjectId === rowId;
                                                return (
                                                    <Fragment key={rowId}>
                                                        <tr
                                                            className={cx(
                                                                "group cursor-pointer border-b border-secondary/70 transition-colors duration-200",
                                                                isExpanded ? "bg-secondary/60" : "hover:bg-secondary/40",
                                                            )}
                                                            onClick={() => {
                                                                setExpandedProjectId((prev) => (prev === rowId ? null : rowId));
                                                            }}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Enter" || event.key === " ") {
                                                                    event.preventDefault();
                                                                    setExpandedProjectId((prev) => (prev === rowId ? null : rowId));
                                                                }
                                                            }}
                                                            tabIndex={0}
                                                            role="button"
                                                            aria-expanded={isExpanded}
                                                        >
                                                            {MANAGER_PROJECT_TABLE_COLUMNS.map((col) => (
                                                                <td
                                                                    key={col.key}
                                                                    className={
                                                                        col.key === "name"
                                                                            ? "min-w-[10rem] max-w-[18rem] px-6 py-4 align-top text-sm text-tertiary"
                                                                            : col.key === "last_analysis_at"
                                                                              ? "max-w-[13rem] px-6 py-4 align-top text-sm text-tertiary"
                                                                              : col.key === "status" ||
                                                                                  col.key === "decision" ||
                                                                                  col.key === "risk_level"
                                                                                ? "px-6 py-4 align-top text-sm text-tertiary"
                                                                                : "max-w-[12rem] px-6 py-4 align-top text-sm text-tertiary"
                                                                    }
                                                                >
                                                                    {renderManagerProjectDataCell(row, col.key, i18n.language)}
                                                                </td>
                                                            ))}
                                                            <td className="w-[8rem] px-6 py-4 align-top">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-xs text-tertiary opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                                                        Actions
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className={cx(
                                                                            "rounded-md p-1 text-tertiary transition hover:bg-primary hover:text-secondary",
                                                                            isExpanded ? "rotate-180" : "",
                                                                        )}
                                                                        aria-label={`Afficher les actions de ${pname || pid}`}
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            setExpandedProjectId((prev) => (prev === rowId ? null : rowId));
                                                                        }}
                                                                    >
                                                                        <ChevronDown className="size-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr className="border-b border-secondary/70">
                                                            <td colSpan={MANAGER_PROJECT_TABLE_COLUMNS.length + 1} className="px-6 py-0">
                                                                <div
                                                                    className={cx(
                                                                        "grid transition-all duration-220 ease-out",
                                                                        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                                                                    )}
                                                                >
                                                                    <div className="overflow-hidden">
                                                                        <div
                                                                            className={cx(
                                                                                "flex flex-wrap items-center gap-2 py-3 transition-transform duration-220",
                                                                                isExpanded ? "translate-y-0" : "-translate-y-1",
                                                                            )}
                                                                        >
                                                                            {pid ? (
                                                                                <Button
                                                                                    size="sm"
                                                                                    color="secondary"
                                                                                    onClick={(event) => {
                                                                                        event.stopPropagation();
                                                                                        openWhatIf({ projectId: pid, projectName: pname });
                                                                                    }}
                                                                                >
                                                                                    What-if
                                                                                </Button>
                                                                            ) : null}
                                                                            {pid ? (
                                                                                <Button
                                                                                    size="sm"
                                                                                    color="secondary"
                                                                                    onClick={(event) => {
                                                                                        event.stopPropagation();
                                                                                        setRhActionProject({
                                                                                            id: pid,
                                                                                            name: pname || pid,
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    Demande RH
                                                                                </Button>
                                                                            ) : null}
                                                                            {href ? (
                                                                                <Button
                                                                                    size="sm"
                                                                                    color="tertiary"
                                                                                    onClick={(event) => {
                                                                                        event.stopPropagation();
                                                                                        setDetailProjectId(pid);
                                                                                        setDetailOpen(true);
                                                                                    }}
                                                                                >
                                                                                    Voir détail
                                                                                </Button>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {pagination && !isEmptySuccess ? (
                                <div className="flex flex-col gap-3 border-t border-secondary px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
                                    <p className="text-sm text-tertiary">
                                        Page {pagination.page} / {pagination.total_pages} · {pagination.total} projet
                                        {pagination.total !== 1 ? "s" : ""}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            color="secondary"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={pagination.page <= 1}
                                        >
                                            Précédent
                                        </Button>
                                        <Button
                                            color="secondary"
                                            size="sm"
                                            onClick={() =>
                                                setPage((p) => Math.min(pagination.total_pages, p + 1))
                                            }
                                            disabled={pagination.page >= pagination.total_pages}
                                        >
                                            Suivant
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </TableCard.Root>
                    </section>
                </div>
            ) : null}
            <RequestRhActionModal
                open={rhActionProject != null}
                onOpenChange={(open) => !open && setRhActionProject(null)}
                projectId={rhActionProject?.id ?? ""}
                onSubmit={async (body) => {
                    await postRhAction.mutateAsync({
                        ...body,
                        priority: "normal",
                    });
                }}
            />
            <ModalOverlay
                isOpen={detailOpen}
                onOpenChange={(open) => {
                    setDetailOpen(open);
                    if (!open) setDetailProjectId(null);
                }}
                isDismissable
            >
                <Modal>
                    <Dialog className="h-[90vh] w-[min(96vw,1200px)] max-w-[1200px] overflow-hidden rounded-2xl border border-secondary bg-primary shadow-xl">
                        <div className="flex items-center justify-between border-b border-secondary px-5 py-3">
                            <h2 className="text-base font-semibold text-primary">Détail projet</h2>
                            <Button color="secondary" size="sm" onClick={() => setDetailOpen(false)}>
                                Fermer
                            </Button>
                        </div>
                        <div className="h-[calc(90vh-58px)] overflow-y-auto p-5">
                            {detailQuery.isLoading ? (
                                <div className="flex min-h-40 items-center justify-center">
                                    <LoadingIndicator type="line-simple" size="md" label={t("common:loading")} />
                                </div>
                            ) : null}
                            {detailQuery.isError ? (
                                <ErrorState
                                    title="Erreur de chargement"
                                    message="Fiche projet indisponible."
                                    onRetry={() => void detailQuery.refetch()}
                                    retryLabel="Réessayer"
                                />
                            ) : null}
                            {detailQuery.data ? (
                                <ManagerProjectDetailBody
                                    project={detailQuery.data}
                                    onOpenRh={() => {
                                        setRhActionProject({
                                            id: detailQuery.data?.id ?? detailProjectId ?? "",
                                            name: detailQuery.data?.name ?? detailProjectId ?? "",
                                        });
                                    }}
                                />
                            ) : null}
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </WorkspacePageShell>
    );
}

export function ManagerMonitoringWorkspacePage() {
    const { t } = useTranslation("common");
    const paths = useWorkspacePaths();
    const { state, error, bundle, reload } = useProjectsMonitoringBundle();
    useCopilotPage("projects_list", t("workspace.managerMonTitle"));

    useEffect(() => {
        const id = window.setInterval(() => void reload(), 30_000);
        return () => window.clearInterval(id);
    }, [reload]);

    const items = bundle?.items ?? [];
    const summary = bundle?.summary ?? {};

    const monitoringRowsWithId = useMemo(
        () =>
            items.map((row, i) => ({
                ...row,
                id: String(getRowField(row, ["project_id", "id"]) ?? `mon-row-${i}`),
            })),
        [items],
    );

    const kpiMonitored = pickScalarDisplay(summary, ["monitored_projects", "projects_count", "total_projects", "total", "count"]);
    const kpiLoad = pickScalarDisplay(summary, [
        "avg_load",
        "average_load",
        "load_pct",
        "capacity_load_pct",
        "global_load",
        "charge_moyenne",
    ]);
    const kpiAlerts = pickScalarDisplay(summary, [
        "projects_in_alert",
        "alert_count",
        "alerts_count",
        "open_alerts",
        "at_risk_count",
    ]);
    const kpiCritical = pickScalarDisplay(summary, [
        "critical_assignments",
        "overloaded_count",
        "surcharge",
        "critical_count",
    ]);

    const monitoringKpisEmpty = [kpiMonitored, kpiLoad, kpiAlerts, kpiCritical].every((v) => v === "—");

    const alertRows = useMemo(() => {
        return items.filter((row) => {
            const a = getRowField(row, ["alert", "alert_type", "blocking", "milestone_risk"]);
            if (a != null && String(a).trim() !== "") return true;
            return isAttentionRow(row);
        });
    }, [items]);

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspace.managerMonEyebrow")}
            title={t("workspace.managerMonTitle")}
            description="Charge, affectations et alertes projet : suivi opérationnel sur le périmètre suivi."
        >
            {state === "loading" ? (
                <div className="flex min-h-48 items-center justify-center rounded-2xl border border-secondary bg-primary p-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("common:loading")} />
                </div>
            ) : null}

            {state === "error" ? (
                <div className="rounded-2xl border border-secondary bg-primary p-6">
                    <EmptyState size="md">
                        <EmptyState.Content>
                            <EmptyState.Title>Suivi indisponible</EmptyState.Title>
                            <EmptyState.Description>{error}</EmptyState.Description>
                        </EmptyState.Content>
                        <EmptyState.Footer>
                            <Button color="secondary" size="sm" onClick={() => void reload()}>
                                {t("common:retry")}
                            </Button>
                        </EmptyState.Footer>
                    </EmptyState>
                </div>
            ) : null}

            {state === "success" && bundle ? (
                <>
                    {monitoringKpisEmpty ? (
                        <div className="rounded-2xl border border-secondary bg-primary p-8 shadow-xs ring-1 ring-secondary/80 md:p-10">
                            <EmptyState size="md">
                                <EmptyState.Content>
                                    <EmptyState.Title>Pas encore de métriques de monitoring</EmptyState.Title>
                                    <EmptyState.Description>
                                        Le monitoring devient pertinent lorsque les projets ont des affectations actives. Affectez
                                        des ressources depuis la liste des projets pour alimenter ces indicateurs.
                                    </EmptyState.Description>
                                </EmptyState.Content>
                                <EmptyState.Footer>
                                    <Button color="primary" size="sm" href={paths.projects}>
                                        Gérer les affectations
                                    </Button>
                                </EmptyState.Footer>
                            </EmptyState>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <ManagerKpiCard title="Projets monitorés" value={kpiMonitored} />
                            <ManagerKpiCard title="Charge" value={kpiLoad} />
                            <ManagerKpiCard title="Projets en alerte" value={kpiAlerts} />
                            <ManagerKpiCard title="Affectations critiques" value={kpiCritical} />
                        </div>
                    )}

                    <TableCard.Root size="md">
                        <TableCard.Header title="Affectations & monitoring" description="Données renvoyées par l’API de monitoring." />
                        {items.length === 0 ? (
                            <div className="px-4 py-10 md:px-6">
                                <EmptyState size="md">
                                    <EmptyState.Content>
                                        <EmptyState.Title>Aucune donnée de suivi disponible pour ce périmètre manager.</EmptyState.Title>
                                        <EmptyState.Description>
                                            Dès que le backend exposera des lignes, elles s’afficheront ici.
                                        </EmptyState.Description>
                                    </EmptyState.Content>
                                </EmptyState>
                            </div>
                        ) : (
                            <Table aria-label="Monitoring manager" className="min-w-full">
                                <Table.Header>
                                    <Table.Head id="project" label="Projet" />
                                    <Table.Head id="load" label="Charge" />
                                    <Table.Head id="status" label="Statut" />
                                    <Table.Head id="risk" label="Risque / alerte" />
                                    <Table.Head id="due" label="Jalon / échéance" />
                                    <Table.Head id="action" label="" />
                                </Table.Header>
                                <Table.Body items={monitoringRowsWithId}>
                                    {(row) => {
                                        const href = managerProjectDetailHref(row, paths.project);
                                        const project = formatRowText(getRowField(row, ["name", "project_name", "title"]));
                                        const load = formatRowText(
                                            getRowField(row, ["load", "load_pct", "allocation_pct", "capacity_load_pct"]),
                                        );
                                        const statusRaw = getRowField(row, ["status", "project_status"]);
                                        const risk = formatRowText(
                                            getRowField(row, ["risk", "risk_level", "alert", "severity", "alert_type"]),
                                        );
                                        const due = formatRowText(
                                            getRowField(row, ["milestone", "due_at", "deadline", "echeance", "next_milestone"]),
                                        );
                                        return (
                                            <Table.Row id={String(row.id)}>
                                                <Table.Cell>
                                                    <span className="font-medium text-primary">{project}</span>
                                                </Table.Cell>
                                                <Table.Cell>{renderMonitoringLoadCell(load)}</Table.Cell>
                                                <Table.Cell>
                                                    {String(statusRaw ?? "").trim() ? (
                                                        <ProjectStatusBadge status={String(statusRaw)} />
                                                    ) : (
                                                        <span className="text-sm text-tertiary">—</span>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <span className="text-sm text-secondary">{risk}</span>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <span className="text-sm text-tertiary">{due}</span>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {href ? (
                                                        <Button size="sm" color="secondary" href={href}>
                                                            Ouvrir
                                                        </Button>
                                                    ) : (
                                                        <span className="text-tertiary">—</span>
                                                    )}
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    }}
                                </Table.Body>
                            </Table>
                        )}
                    </TableCard.Root>

                    <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                        <h2 className="text-sm font-semibold text-primary">Alertes à traiter</h2>
                        {alertRows.length === 0 ? (
                            <p className="mt-3 text-sm text-tertiary">Aucune alerte remontée sur les lignes actuelles.</p>
                        ) : (
                            <ul className="mt-3 space-y-2">
                                {alertRows.slice(0, 8).map((row, i) => {
                                    const name = formatRowText(getRowField(row, ["name", "project_name", "title"]));
                                    const detail = formatRowText(
                                        getRowField(row, ["alert", "alert_message", "blocking", "milestone_risk", "risk"]),
                                    );
                                    return (
                                        <li
                                            key={`alert-${i}`}
                                            className="flex items-start gap-2 rounded-lg border border-warning-secondary/50 bg-warning-secondary/15 px-3 py-2 text-sm text-secondary"
                                        >
                                            <span className="text-warning-primary" aria-hidden>
                                                ⚠
                                            </span>
                                            <span>
                                                <span className="font-medium text-primary">{name}</span>
                                                {detail !== "—" ? <span> — {detail}</span> : null}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </>
            ) : null}
        </WorkspacePageShell>
    );
}
