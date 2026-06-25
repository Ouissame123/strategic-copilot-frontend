import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { formatRhRequestMessage } from "@/components/rh-requests/formatRhRequestMessage";
import {
    displayTitleFromRow,
    primaryMessage,
    stripLeadingSubjectPrefix,
} from "@/components/manager/rh-requests/rh-requests-utils";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import {
    mapRhRequestsDecisionError,
    useRhRequestsDecision,
    useRhRequestsListQuery,
} from "@/hooks/use-rh-requests-decision";
import { stripTechnicalScoringSegments } from "@/lib/business-explanation";
import {
    labelRhRequestStatus,
    readRhRequestField,
    rhActionItemToRow,
    rhRequestStatusToBucket,
    type RhRequestStatusBucket,
    RH_REQUEST_STATUS_BUCKETS,
} from "@/utils/rh-requests-decision";
import { cx } from "@/utils/cx";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";

type RhDecisionChoice = "accept" | "reject" | "progress" | "done";

function formatRelativeFr(iso: string): string {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "Non disponible";
    const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (sec < 45) return "À l’instant";
    const min = Math.floor(sec / 60);
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Il y a ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `Il y a ${d} j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function typeLabelFr(type: string): string {
    const t = type.toLowerCase();
    const map: Record<string, string> = {
        skill_gap: "Écart de compétences",
        reallocation: "Réaffectation",
        training: "Formation",
        overload: "Surcharge",
        recruitment: "Recrutement",
    };
    return map[t] ?? (type ? type.replace(/_/g, " ") : "Non disponible");
}

function priorityLabelFr(priority: string): "Urgent" | "Normal" | "Faible" | "Non disponible" {
    const p = priority.toLowerCase();
    if (p === "urgent") return "Urgent";
    if (p === "normal") return "Normal";
    if (p === "low") return "Faible";
    return "Non disponible";
}

function recommendedAction(type: string): string {
    const t = type.toLowerCase();
    if (t === "skill_gap") return "Renforcer les compétences ciblées sur le projet.";
    if (t === "recruitment") return "Valider ou ajuster une piste de recrutement.";
    if (t === "training") return "Planifier une montée en compétences.";
    if (t === "reallocation") return "Réorganiser l’affectation des talents.";
    if (t === "overload") return "Alléger la charge ou répartir le travail.";
    return "Examiner la demande et décider avec le métier.";
}

function statusKpiLabel(bucket: RhRequestStatusBucket): string {
    const m: Record<RhRequestStatusBucket, string> = {
        pending: "En attente",
        accepted: "Acceptées",
        in_progress: "En cours",
        done: "Terminées",
        rejected: "Rejetées",
    };
    return m[bucket];
}

function statusPillClass(bucket: RhRequestStatusBucket): string {
    const map: Record<RhRequestStatusBucket, string> = {
        pending: "border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
        accepted: "border-sky-200/90 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/35 dark:text-sky-100",
        in_progress: "border-violet-200/90 bg-violet-50 text-violet-950 dark:border-violet-800 dark:bg-violet-950/35 dark:text-violet-100",
        done: "border-emerald-200/90 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100",
        rejected: "border-rose-200/90 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/35 dark:text-rose-100",
    };
    return map[bucket];
}

function kpiCardSurface(bucket: RhRequestStatusBucket, active: boolean): string {
    const base: Record<RhRequestStatusBucket, string> = {
        pending: "border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-primary dark:from-amber-950/25 dark:to-primary",
        accepted: "border-sky-200/70 bg-gradient-to-br from-sky-50/90 to-primary dark:from-sky-950/25 dark:to-primary",
        in_progress: "border-violet-200/70 bg-gradient-to-br from-violet-50/90 to-primary dark:from-violet-950/25 dark:to-primary",
        done: "border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 to-primary dark:from-emerald-950/25 dark:to-primary",
        rejected: "border-rose-200/70 bg-gradient-to-br from-rose-50/90 to-primary dark:from-rose-950/25 dark:to-primary",
    };
    return cx(
        "rounded-xl border px-3 py-2 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/30",
        base[bucket],
        active ? "ring-2 ring-brand-secondary/50" : "hover:border-secondary hover:shadow-md",
    );
}

function humanizeField(value: string): string {
    const t = stripTechnicalScoringSegments(value).replace(/\s+/g, " ").trim();
    return t || "Non disponible";
}

function requestTitle(row: Record<string, unknown>, tr: (k: string) => string): string {
    return displayTitleFromRow(row, tr);
}

function requestMessageRaw(row: Record<string, unknown>): string {
    return stripLeadingSubjectPrefix(primaryMessage(row));
}

export default function ManagerRequestsPage({ embedded = false }: { embedded?: boolean }) {
    const { t } = useTranslation("common");
    const [searchParams, setSearchParams] = useSearchParams();
    const [statusFilter, setStatusFilter] = useState<RhRequestStatusBucket | "all">("pending");
    const [search, setSearch] = useState("");
    const [filterPriority, setFilterPriority] = useState<"all" | "urgent" | "normal" | "low">("all");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterProject, setFilterProject] = useState<string>("all");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerId, setDrawerId] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [patchError, setPatchError] = useState<string | null>(null);

    /** Liste complète (KPI + filtres locaux) — le filtre statut reste côté UI. */
    const listFilters = useMemo(
        () => ({
            type: filterType === "all" ? undefined : filterType,
            priority: filterPriority === "all" ? undefined : filterPriority,
        }),
        [filterType, filterPriority],
    );

    const listQuery = useRhRequestsListQuery(listFilters);
    const decision = useRhRequestsDecision();

    const rows = useMemo(
        () => (listQuery.data?.items ?? []).map(rhActionItemToRow).filter((r) => r.id),
        [listQuery.data?.items],
    );

    const counts = useMemo(() => {
        const base: Record<RhRequestStatusBucket, number> = {
            pending: 0,
            accepted: 0,
            in_progress: 0,
            done: 0,
            rejected: 0,
        };
        for (const row of rows) {
            const b = rhRequestStatusToBucket(String(row.status ?? row.state ?? ""));
            if (b) base[b] += 1;
        }
        return base;
    }, [rows]);

    const projectOptions = useMemo(() => {
        const names = new Set<string>();
        for (const row of rows) {
            const n = readRhRequestField(row, ["project_name", "projectName", "project"]);
            if (n) names.add(n);
        }
        return [...names].sort((a, b) => a.localeCompare(b, "fr"));
    }, [rows]);

    const typeOptions = useMemo(() => {
        const types = new Set<string>();
        for (const row of rows) {
            const ty = String(row.type ?? "").trim();
            if (ty) types.add(ty);
        }
        return [...types].sort((a, b) => a.localeCompare(b, "fr"));
    }, [rows]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            const bucket = rhRequestStatusToBucket(String(row.status ?? row.state ?? ""));
            if (statusFilter !== "all" && bucket !== statusFilter) return false;
            if (filterPriority !== "all") {
                const pr = String(row.priority ?? "").toLowerCase();
                if (pr !== filterPriority) return false;
            }
            if (filterType !== "all" && String(row.type ?? "").toLowerCase() !== filterType.toLowerCase()) return false;
            if (filterProject !== "all") {
                const pn = readRhRequestField(row, ["project_name", "projectName", "project"]);
                if (pn !== filterProject) return false;
            }
            if (!q) return true;
            const msg = stripTechnicalScoringSegments(String(row.message ?? row.title ?? "")).toLowerCase();
            const pn = readRhRequestField(row, ["project_name", "projectName", "project"]).toLowerCase();
            return msg.includes(q) || pn.includes(q);
        });
    }, [rows, statusFilter, search, filterPriority, filterType, filterProject]);

    const drawerRow = useMemo(
        () => (drawerId ? (rows.find((r) => r.id === drawerId) ?? null) : null),
        [drawerId, rows],
    );

    const openDrawer = useCallback((id: string) => {
        setDrawerId(id);
        setNote("");
        setPatchError(null);
        setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        setDrawerId(null);
        setPatchError(null);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("action");
            return next;
        });
    }, [setSearchParams]);

    useEffect(() => {
        const id = searchParams.get("action")?.trim();
        if (!id) return;
        if (rows.some((r) => r.id === id)) {
            setDrawerId(id);
            setDrawerOpen(true);
        }
    }, [searchParams, rows]);

    const runDecision = async (id: string, choice: RhDecisionChoice) => {
        setPatchError(null);
        try {
            const msg = note.trim() || undefined;
            if (choice === "accept") await decision.acceptRequest(id, msg);
            else if (choice === "reject") {
                if (!note.trim()) {
                    setPatchError("Le motif de refus est obligatoire.");
                    return;
                }
                await decision.rejectRequest(id, note.trim());
            } else if (choice === "progress") await decision.setInProgress(id, msg);
            else if (choice === "done") await decision.markDone(id, msg);
            closeDrawer();
            setNote("");
            await listQuery.refetch();
        } catch (err) {
            setPatchError(mapRhRequestsDecisionError(err));
        }
    };

    const listErrorMessage = listQuery.error ? mapRhRequestsDecisionError(listQuery.error) : null;

    useWorkspaceTopbarMeta(
        embedded ? "" : t("managerWorkspace.pendingRh.listPageTitle"),
        embedded ? null : t("managerWorkspace.pendingRh.listPageSubtitle"),
    );

    const body = (
        <>
            <div className="space-y-4">
                {!embedded ? (
                <div className="flex flex-wrap justify-end gap-2">
                    <Link
                        to="/workspace/rh/dashboard"
                        className="inline-flex items-center justify-center rounded-lg border border-brand-secondary/40 bg-brand-primary/10 px-3 py-2 text-xs font-semibold text-brand-secondary transition hover:bg-brand-primary/20"
                    >
                        Tableau de bord RH
                    </Link>
                </div>
                ) : null}

                <section aria-label="Indicateurs par statut" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {RH_REQUEST_STATUS_BUCKETS.map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setStatusFilter((prev) => (prev === key ? "all" : key))}
                            className={kpiCardSurface(key, statusFilter === key)}
                        >
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-secondary">{statusKpiLabel(key)}</div>
                            <div className="mt-0.5 text-lg font-bold tabular-nums text-primary">{counts[key]}</div>
                        </button>
                    ))}
                </section>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-tertiary">
                    <button
                        type="button"
                        className="font-semibold text-brand-secondary underline-offset-2 hover:underline"
                        onClick={() => {
                            setStatusFilter("all");
                            setSearch("");
                            setFilterPriority("all");
                            setFilterType("all");
                            setFilterProject("all");
                        }}
                    >
                        Réinitialiser les filtres
                    </button>
                    {statusFilter !== "all" ? (
                        <span>
                            Filtre statut : <strong className="text-secondary">{statusKpiLabel(statusFilter)}</strong>
                        </span>
                    ) : null}
                </div>

                <div className="rounded-xl border border-secondary/80 bg-primary p-3 shadow-sm ring-1 ring-secondary/40 sm:p-4">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                            Recherche
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Message, projet…"
                                className="rounded-lg border border-secondary bg-primary px-2.5 py-2 text-sm font-normal text-primary outline-none transition placeholder:text-tertiary focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25"
                            />
                        </label>
                        <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                            Statut (liste)
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as RhRequestStatusBucket | "all")}
                                className="rounded-lg border border-secondary bg-primary px-2.5 py-2 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25"
                            >
                                <option value="all">Tous</option>
                                {RH_REQUEST_STATUS_BUCKETS.map((s) => (
                                    <option key={s} value={s}>
                                        {statusKpiLabel(s)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                            Priorité
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value as typeof filterPriority)}
                                className="rounded-lg border border-secondary bg-primary px-2.5 py-2 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25"
                            >
                                <option value="all">Toutes</option>
                                <option value="urgent">Urgent</option>
                                <option value="normal">Normal</option>
                                <option value="low">Faible</option>
                            </select>
                        </label>
                        <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                            Type
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="rounded-lg border border-secondary bg-primary px-2.5 py-2 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25"
                            >
                                <option value="all">Tous</option>
                                {typeOptions.map((ty) => (
                                    <option key={ty} value={ty}>
                                        {typeLabelFr(ty)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                            Projet
                            <select
                                value={filterProject}
                                onChange={(e) => setFilterProject(e.target.value)}
                                className="rounded-lg border border-secondary bg-primary px-2.5 py-2 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25"
                            >
                                <option value="all">Tous</option>
                                {projectOptions.map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                <section aria-label="Demandes RH" className="space-y-2">
                    {listQuery.isPending ? <p className="py-6 text-center text-sm text-tertiary">Chargement…</p> : null}
                    {listErrorMessage ? (
                        <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
                            {listErrorMessage}{" "}
                            <button type="button" className="font-semibold underline" onClick={() => void listQuery.refetch()}>
                                Réessayer
                            </button>
                        </div>
                    ) : null}
                    {!listQuery.isPending && !listErrorMessage && filteredRows.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-secondary/80 bg-secondary_subtle/40 py-10 text-center text-sm text-tertiary">
                            Aucune demande ne correspond aux filtres.
                        </p>
                    ) : null}

                    <ul className="space-y-2">
                        {filteredRows.map((rh) => {
                            const id = String(rh.id);
                            const bucket = rhRequestStatusToBucket(String(rh.status ?? rh.state ?? "")) ?? "pending";
                            const type = String(rh.type ?? "");
                            const title = requestTitle(rh, t);
                            const msgPreview = requestMessageRaw(rh);
                            const project = readRhRequestField(rh, ["project_name", "projectName", "project"]);
                            const pr = String(rh.priority ?? "");
                            const pri = priorityLabelFr(pr);
                            const created = String(rh.created_at ?? rh.createdAt ?? "");
                            const urgentVisual = pr.toLowerCase() === "urgent";
                            const statusLabel = labelRhRequestStatus(rh.status ?? rh.state);

                            return (
                                <li
                                    key={id}
                                    className={cx(
                                        "rounded-xl border bg-primary p-3 shadow-sm ring-1 ring-secondary/35 transition sm:p-4",
                                        urgentVisual ? "border-rose-200/80 ring-rose-200/50 dark:border-rose-900/40" : "border-secondary/80",
                                    )}
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={cx(
                                                        "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                                        urgentVisual
                                                            ? "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100"
                                                            : "border-secondary bg-secondary_subtle text-secondary",
                                                    )}
                                                >
                                                    {pri}
                                                </span>
                                                <span className="rounded-md border border-secondary/80 bg-secondary_subtle/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                                                    {typeLabelFr(type)}
                                                </span>
                                                <span className={cx("rounded-md border px-2 py-0.5 text-[10px] font-semibold", statusPillClass(bucket))}>
                                                    {statusLabel}
                                                </span>
                                            </div>
                                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-primary">{title}</h3>
                                            {msgPreview && msgPreview !== title ? (
                                                <p className="line-clamp-2 text-xs text-tertiary">{humanizeField(msgPreview.slice(0, 200))}</p>
                                            ) : null}
                                            <p className="text-xs text-secondary">
                                                <span className="font-medium text-tertiary">Projet :</span>{" "}
                                                {project ? <span className="text-primary">{project}</span> : <span className="italic">Non disponible</span>}
                                            </p>
                                            <p className="text-[11px] text-tertiary">{formatRelativeFr(created)}</p>
                                            <p className="rounded-lg border border-dashed border-secondary/70 bg-secondary_subtle/40 px-2.5 py-2 text-xs leading-relaxed text-secondary">
                                                <span className="font-semibold text-primary">Action recommandée :</span> {recommendedAction(type)}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                                            <Button size="sm" color="primary" onPress={() => openDrawer(id)}>
                                                Traiter
                                            </Button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            </div>

            <RhRequestDecisionDrawer
                open={drawerOpen}
                row={drawerRow}
                note={note}
                onNoteChange={setNote}
                onClose={closeDrawer}
                isPending={decision.isPending}
                patchError={patchError}
                onDecision={runDecision}
                tr={t}
            />
        </>
    );

    if (embedded) return body;

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow={t("workspaceRoles.rh")}
            title={t("managerWorkspace.pendingRh.listPageTitle")}
            omitHeader
        >
            {body}
        </WorkspacePageShell>
    );
}

function RhRequestDecisionDrawer({
    open,
    row,
    note,
    onNoteChange,
    onClose,
    isPending,
    patchError,
    onDecision,
    tr,
}: {
    open: boolean;
    row: (Record<string, unknown> & { id: string }) | null;
    note: string;
    onNoteChange: (v: string) => void;
    onClose: () => void;
    isPending: boolean;
    patchError: string | null;
    onDecision: (id: string, choice: RhDecisionChoice) => void;
    tr: (k: string) => string;
}) {
    const [choice, setChoice] = useState<RhDecisionChoice>("accept");

    useEffect(() => {
        if (row?.id) setChoice("accept");
    }, [row?.id]);

    if (!open || !row) return null;

    const id = String(row.id);
    const bucket = rhRequestStatusToBucket(String(row.status ?? row.state ?? "")) ?? "pending";
    const canAcceptReject = bucket === "pending";
    const canProgress = bucket === "pending" || bucket === "accepted";
    const canDone = bucket === "pending" || bucket === "accepted" || bucket === "in_progress";
    const type = String(row.type ?? "");
    const title = requestTitle(row, tr);
    const messageRaw = requestMessageRaw(row);
    const project = readRhRequestField(row, ["project_name", "projectName", "project"]);
    const pid = readRhRequestField(row, ["project_id", "projectId"]);
    const responseText = readRhRequestField(row, ["response_message", "responseMessage", "reason"]);

    const decisionOptions: { value: RhDecisionChoice; label: string; hint: string; show: boolean }[] = [
        { value: "accept", label: "Accepter", hint: "Valider la demande.", show: canAcceptReject },
        { value: "reject", label: "Rejeter", hint: "Refuser avec un motif obligatoire.", show: canAcceptReject },
        { value: "progress", label: "Mettre en cours", hint: "Prise en charge par les RH.", show: canProgress },
        { value: "done", label: "Terminer", hint: "Clôturer le traitement RH.", show: canDone },
    ];

    const visibleOptions = decisionOptions.filter((o) => o.show);
    const confirmDisabled = isPending || (choice === "reject" && !note.trim());

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px]"
                aria-label="Fermer"
                onClick={onClose}
            />
            <aside
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-secondary bg-primary shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="rh-decision-drawer-title"
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">Demande RH</p>
                        <h2 id="rh-decision-drawer-title" className="mt-0.5 line-clamp-3 text-base font-semibold text-primary">
                            {title}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span className={cx("rounded-md border px-2 py-0.5 text-[10px] font-semibold", statusPillClass(bucket))}>
                                {labelRhRequestStatus(row.status ?? row.state)}
                            </span>
                            <span className="rounded-md border border-secondary/80 bg-secondary_subtle px-2 py-0.5 text-[10px] font-semibold text-secondary">
                                {typeLabelFr(type)}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-tertiary transition hover:bg-secondary_subtle hover:text-primary"
                        aria-label="Fermer"
                    >
                        <X className="size-5" aria-hidden />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5">
                    <div className="space-y-4">
                        <section className="min-w-0 rounded-xl border border-secondary/70 bg-secondary_subtle/30 p-3">
                            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Message</h3>
                            <div className="mt-2 text-sm leading-relaxed text-secondary">{formatRhRequestMessage(messageRaw)}</div>
                        </section>

                        <dl className="grid gap-3 text-sm">
                            <div>
                                <dt className="text-[11px] font-semibold uppercase text-tertiary">Projet</dt>
                                <dd className="mt-0.5 text-secondary">
                                    {project ? (
                                        <>
                                            {project}
                                            {pid ? (
                                                <div className="mt-1">
                                                    <Link
                                                        to={managerProjectsOpenModalPath(pid)}
                                                        className="text-xs font-semibold text-brand-secondary underline-offset-2 hover:underline"
                                                    >
                                                        Ouvrir la fiche projet
                                                    </Link>
                                                </div>
                                            ) : null}
                                        </>
                                    ) : (
                                        <span className="italic text-tertiary">Non disponible</span>
                                    )}
                                </dd>
                            </div>
                        </dl>

                        {responseText ? (
                            <div className="rounded-lg border border-secondary/80 bg-primary p-3 text-xs text-secondary">
                                <span className="font-semibold text-primary">Réponse RH :</span> {humanizeField(responseText)}
                            </div>
                        ) : null}

                        {visibleOptions.length > 0 ? (
                            <section className="space-y-3">
                                <h3 className="text-[11px] font-semibold uppercase text-tertiary">Décision</h3>
                                <fieldset className="space-y-2">
                                    <legend className="sr-only">Choisir une décision</legend>
                                    {visibleOptions.map((opt) => (
                                        <label
                                            key={opt.value}
                                            className={cx(
                                                "flex w-full cursor-pointer gap-3 rounded-xl border p-3 transition",
                                                choice === opt.value
                                                    ? "border-brand-secondary/60 bg-brand-primary/10 ring-1 ring-brand-secondary/30"
                                                    : "border-secondary/70 bg-primary hover:border-secondary",
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="rh-decision"
                                                value={opt.value}
                                                checked={choice === opt.value}
                                                onChange={() => setChoice(opt.value)}
                                                className="mt-0.5 size-4 shrink-0 accent-brand-solid"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-semibold text-primary">{opt.label}</span>
                                                <span className="mt-0.5 block text-xs text-tertiary">{opt.hint}</span>
                                            </span>
                                        </label>
                                    ))}
                                </fieldset>
                                <div className="min-w-0">
                                    <label htmlFor="rh-drawer-note" className="text-[11px] font-semibold uppercase text-tertiary">
                                        {choice === "reject" ? "Motif de refus" : "Commentaire (optionnel)"}
                                    </label>
                                    <textarea
                                        id="rh-drawer-note"
                                        value={note}
                                        onChange={(e) => onNoteChange(e.target.value)}
                                        placeholder={choice === "reject" ? "Ex. Budget insuffisant" : "Précisions pour le suivi RH"}
                                        rows={3}
                                        className="mt-1 w-full max-w-full resize-y rounded-lg border border-secondary bg-primary p-2.5 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25"
                                    />
                                </div>
                                {patchError ? (
                                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                                        {patchError}
                                    </p>
                                ) : null}
                            </section>
                        ) : (
                            <p className="rounded-lg border border-secondary/60 bg-secondary_subtle/40 p-3 text-xs text-secondary">
                                Cette demande est en statut final.
                            </p>
                        )}
                    </div>
                </div>

                {visibleOptions.length > 0 ? (
                    <footer className="shrink-0 border-t border-secondary bg-primary px-4 py-3 sm:px-5">
                        <Button
                            className="w-full"
                            color="primary"
                            isDisabled={confirmDisabled}
                            isLoading={isPending}
                            onPress={() => void onDecision(id, choice)}
                        >
                            Confirmer
                        </Button>
                    </footer>
                ) : (
                    <footer className="shrink-0 border-t border-secondary bg-primary px-4 py-3 sm:px-5">
                        <Button className="w-full" color="secondary" onPress={onClose}>
                            Fermer
                        </Button>
                    </footer>
                )}
            </aside>
        </>
    );
}
