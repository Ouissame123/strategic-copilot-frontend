import { useEffect, useMemo, useState } from "react";
import {
    Check,
    Loader2,
    RefreshCw,
    ShieldCheck,
    Target,
    Trash2,
    User,
} from "lucide-react";
import {
    deleteProjectRisk,
    listProjectRisksFromAlerts,
    patchProjectRisk,
    type ProjectRiskAlert,
    type ProjectRiskAlertStatus,
} from "@/api/manager-project-risks.api";
import { projectRiskSeverityBadgeClass, projectRiskSeverityRank } from "@/lib/project-risks-display";
import { useToast } from "@/providers/toast-provider";
import type { MissionControlRiskAlert } from "@/types/api.types";
import { cx } from "@/utils/cx";

type RisksTabProps = {
    projectId: string;
    token: string;
    initialAlerts?: MissionControlRiskAlert[];
    onRefresh?: () => void;
};

type FilterStatus = "all" | ProjectRiskAlertStatus;

const FILTER_LABELS: Record<FilterStatus, string> = {
    all: "Toutes",
    open: "Ouvertes",
    resolved: "Résolues",
    dismissed: "Ignorées",
};

function severityBorderClass(severity: string): string {
    const v = severity.toLowerCase();
    if (v === "critical") return "border-l-red-700";
    if (v === "high") return "border-l-amber-600";
    if (v === "medium") return "border-l-amber-400";
    return "border-l-slate-300";
}

function statusLabel(status: ProjectRiskAlertStatus): string {
    if (status === "open") return "Ouverte";
    if (status === "resolved") return "Résolue";
    return "Ignorée";
}

function statusColor(status: ProjectRiskAlertStatus): string {
    if (status === "open") return "text-red-600";
    if (status === "resolved") return "text-emerald-600";
    return "text-slate-500";
}

export function RisksTab({ projectId, token, initialAlerts = [], onRefresh }: RisksTabProps) {
    const { push: showToast } = useToast();
    const [risks, setRisks] = useState<ProjectRiskAlert[]>(() => listProjectRisksFromAlerts(initialAlerts).risks);
    const [refreshing, setRefreshing] = useState(false);
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("open");

    useEffect(() => {
        setRisks(listProjectRisksFromAlerts(initialAlerts).risks);
    }, [initialAlerts]);

    async function handleRefresh() {
        if (!onRefresh) return;
        setRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setRefreshing(false);
        }
    }

    const filteredRisks = useMemo(() => {
        const list = filterStatus === "all" ? risks : risks.filter((r) => r.status === filterStatus);
        return [...list].sort((a, b) => projectRiskSeverityRank(b.severity) - projectRiskSeverityRank(a.severity));
    }, [risks, filterStatus]);

    const filterCounts = useMemo(() => {
        return {
            all: risks.length,
            open: risks.filter((r) => r.status === "open").length,
            resolved: risks.filter((r) => r.status === "resolved").length,
            dismissed: risks.filter((r) => r.status === "dismissed").length,
        };
    }, [risks]);

    async function handleAction(riskId: string, action: "resolve" | "dismiss") {
        if (!token.trim()) return;
        setActioningId(riskId);
        try {
            const data = await patchProjectRisk(projectId, riskId, action);
            if (String(data.status).toLowerCase() === "success") {
                setRisks((prev) =>
                    prev.map((r) =>
                        r.id === riskId
                            ? {
                                  ...r,
                                  status: data.new_status ?? (action === "resolve" ? "resolved" : "dismissed"),
                                  resolved_at: data.resolved_at ?? r.resolved_at,
                              }
                            : r,
                    ),
                );
                showToast(action === "resolve" ? "Alerte résolue" : "Alerte ignorée", "success");
                onRefresh?.();
            }
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "Erreur", "error");
        } finally {
            setActioningId(null);
        }
    }

    async function handleDelete(riskId: string) {
        if (!window.confirm("Supprimer cette alerte ?")) return;
        if (!token.trim()) return;
        setActioningId(riskId);
        try {
            await deleteProjectRisk(projectId, riskId);
            setRisks((prev) => prev.filter((r) => r.id !== riskId));
            showToast("Alerte supprimée", "success");
            onRefresh?.();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "Erreur", "error");
        } finally {
            setActioningId(null);
        }
    }

    return (
        <div className="p-5">
            <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                            {(["all", "open", "resolved", "dismissed"] as const).map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setFilterStatus(f)}
                                    className={cx(
                                        "rounded-full border px-3 py-1 text-xs transition",
                                        filterStatus === f
                                            ? "border-primary-400 bg-primary-50 font-medium text-primary-900 dark:bg-primary-950/40 dark:text-primary-200"
                                            : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-300",
                                    )}
                                >
                                    {FILTER_LABELS[f]} ({filterCounts[f]})
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleRefresh()}
                            disabled={refreshing || !onRefresh}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300"
                        >
                            <RefreshCw size={13} className={refreshing ? "animate-spin" : undefined} aria-hidden />
                            Actualiser
                        </button>
                    </div>

                    {filteredRisks.length === 0 ? (
                        <div className="py-10 text-center text-sm text-slate-500">
                            <ShieldCheck className="mx-auto mb-2 size-8 text-emerald-500" aria-hidden />
                            Aucune alerte {filterStatus !== "all" ? filterStatus : ""} pour ce projet.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {filteredRisks.map((risk) => {
                                const isActioning = actioningId === risk.id;
                                const isOpen = risk.status === "open";

                                return (
                                    <article
                                        key={risk.id}
                                        className={cx(
                                            "rounded-[10px] border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900",
                                            "border-l-[3px]",
                                            severityBorderClass(risk.severity),
                                            !isOpen && "opacity-75",
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                                    <span
                                                        className={cx(
                                                            "rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                                            projectRiskSeverityBadgeClass(risk.severity),
                                                        )}
                                                    >
                                                        {risk.severity}
                                                    </span>
                                                    <span
                                                        className={cx(
                                                            "rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] dark:border-slate-600 dark:bg-slate-800",
                                                            statusColor(risk.status),
                                                        )}
                                                    >
                                                        {statusLabel(risk.status)}
                                                    </span>
                                                    {risk.source_agent ? (
                                                        <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] text-primary-900 dark:bg-primary-950/40 dark:text-primary-200">
                                                            {risk.source_agent}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                    {risk.title || risk.message || "Alerte"}
                                                </p>

                                                {risk.description && risk.description !== risk.title ? (
                                                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                                        {risk.description}
                                                    </p>
                                                ) : null}

                                                <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-500">
                                                    {risk.impact_area ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Target size={12} aria-hidden />
                                                            {risk.impact_area}
                                                        </span>
                                                    ) : null}
                                                    {risk.owner_role ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            <User size={12} aria-hidden />
                                                            {risk.owner_role}
                                                        </span>
                                                    ) : null}
                                                    {risk.risk_score != null && Number.isFinite(risk.risk_score) ? (
                                                        <span>
                                                            Score risque :{" "}
                                                            <strong className="text-slate-800 dark:text-slate-200">
                                                                {risk.risk_score}/10
                                                            </strong>
                                                        </span>
                                                    ) : null}
                                                    {risk.detected_at ? (
                                                        <span>
                                                            Détecté le{" "}
                                                            {new Date(risk.detected_at).toLocaleDateString("fr-FR", {
                                                                day: "numeric",
                                                                month: "short",
                                                                year: "numeric",
                                                            })}
                                                        </span>
                                                    ) : null}
                                                    {risk.resolved_at ? (
                                                        <span className="text-emerald-600">
                                                            Résolu le{" "}
                                                            {new Date(risk.resolved_at).toLocaleDateString("fr-FR", {
                                                                day: "numeric",
                                                                month: "short",
                                                            })}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {isOpen ? (
                                                <div className="flex shrink-0 flex-wrap gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleAction(risk.id, "resolve")}
                                                        disabled={!!actioningId}
                                                        title="Marquer comme résolu"
                                                        className={cx(
                                                            "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-white disabled:cursor-not-allowed",
                                                            isActioning ? "bg-emerald-200 text-emerald-900" : "bg-emerald-600 hover:bg-emerald-700",
                                                        )}
                                                    >
                                                        {isActioning ? (
                                                            <Loader2 size={12} className="animate-spin" aria-hidden />
                                                        ) : (
                                                            <Check size={13} aria-hidden />
                                                        )}
                                                        Résoudre
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleAction(risk.id, "dismiss")}
                                                        disabled={!!actioningId}
                                                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed dark:border-slate-600"
                                                    >
                                                        Ignorer
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDelete(risk.id)}
                                                        disabled={!!actioningId}
                                                        title="Supprimer cette alerte"
                                                        className="rounded-md border border-slate-200 px-2 py-1 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed dark:border-slate-600"
                                                    >
                                                        <Trash2 size={14} aria-hidden />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete(risk.id)}
                                                    disabled={!!actioningId}
                                                    title="Supprimer"
                                                    className="shrink-0 rounded p-1 text-slate-400 hover:text-rose-600 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 size={14} aria-hidden />
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
            </>
        </div>
    );
}
