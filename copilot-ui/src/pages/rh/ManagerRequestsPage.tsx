import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { PageHero } from "@/components/layout/PageHero";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { usePatchRhAction, useRhActions } from "@/hooks/useNotifications";
import { stripTechnicalScoringSegments } from "@/lib/business-explanation";
import { rowsFromRhActionsPayload } from "@/utils/rh-actions-list";
import { cx } from "@/utils/cx";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";

type RhActionType = "accept" | "reject" | "progress" | "done" | "cancel";

type StatusBucket = "pending" | "accepted" | "in_progress" | "done" | "rejected";

const STATUS_ORDER: StatusBucket[] = ["pending", "accepted", "in_progress", "done", "rejected"];

function readString(row: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = row[k];
        if (v != null && String(v).trim()) return String(v).trim();
    }
    return "";
}

function normalizeStatusBucket(raw: string): StatusBucket | null {
    const s = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
    if (s === "pending" || s === "open" || s === "new") return "pending";
    if (s === "accepted" || s === "approve" || s === "approved") return "accepted";
    if (s === "in_progress" || s === "inprogress" || s === "progress") return "in_progress";
    if (s === "done" || s === "completed" || s === "closed") return "done";
    if (s === "rejected" || s === "refused" || s === "declined" || s === "cancelled" || s === "canceled") return "rejected";
    return null;
}

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
        skill_gap: "Skill gap",
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

function statusKpiLabel(bucket: StatusBucket): string {
    const m: Record<StatusBucket, string> = {
        pending: "En attente",
        accepted: "Acceptées",
        in_progress: "En cours",
        done: "Terminées",
        rejected: "Rejetées",
    };
    return m[bucket];
}

function statusTicketPillLabel(bucket: StatusBucket): string {
    const m: Record<StatusBucket, string> = {
        pending: "En attente",
        accepted: "Acceptée",
        in_progress: "En cours",
        done: "Terminée",
        rejected: "Rejetée",
    };
    return m[bucket];
}

function statusPillClass(bucket: StatusBucket): string {
    const map: Record<StatusBucket, string> = {
        pending: "border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
        accepted: "border-sky-200/90 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/35 dark:text-sky-100",
        in_progress: "border-violet-200/90 bg-violet-50 text-violet-950 dark:border-violet-800 dark:bg-violet-950/35 dark:text-violet-100",
        done: "border-emerald-200/90 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100",
        rejected: "border-rose-200/90 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/35 dark:text-rose-100",
    };
    return map[bucket];
}

function kpiCardSurface(bucket: StatusBucket, active: boolean): string {
    const base: Record<StatusBucket, string> = {
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

export default function ManagerRequestsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [statusFilter, setStatusFilter] = useState<StatusBucket | "all">("pending");
    const [search, setSearch] = useState("");
    const [filterPriority, setFilterPriority] = useState<"all" | "urgent" | "normal" | "low">("all");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterProject, setFilterProject] = useState<string>("all");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerId, setDrawerId] = useState<string | null>(null);
    const [note, setNote] = useState("");

    const { data, isLoading, isError, refetch } = useRhActions({ limit: 500 });
    const patch = usePatchRhAction();

    const rows = useMemo(() => {
        const payload = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
        const viaRhActions = payload?.rh_actions;
        const normalized =
            Array.isArray(viaRhActions) && viaRhActions.length > 0 ? { items: viaRhActions } : data;
        return rowsFromRhActionsPayload(normalized).filter((r) => r.id);
    }, [data]);

    const payload = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    const byStatusApi = payload.by_status as Record<string, number> | undefined;

    const counts = useMemo(() => {
        const base: Record<StatusBucket, number> = {
            pending: 0,
            accepted: 0,
            in_progress: 0,
            done: 0,
            rejected: 0,
        };
        if (byStatusApi && typeof byStatusApi === "object") {
            let any = false;
            for (const k of STATUS_ORDER) {
                const v = byStatusApi[k];
                if (typeof v === "number" && !Number.isNaN(v)) {
                    base[k] = v;
                    any = true;
                }
            }
            if (any) return base;
        }
        for (const row of rows) {
            const b = normalizeStatusBucket(String(row.status ?? row.state ?? ""));
            if (b) base[b] += 1;
        }
        return base;
    }, [byStatusApi, rows]);

    const projectOptions = useMemo(() => {
        const names = new Set<string>();
        for (const row of rows) {
            const n = readString(row, ["project_name", "projectName", "project"]);
            if (n) names.add(n);
        }
        return [...names].sort((a, b) => a.localeCompare(b, "fr"));
    }, [rows]);

    const typeOptions = useMemo(() => {
        const types = new Set<string>();
        for (const row of rows) {
            const t = String(row.type ?? "").trim();
            if (t) types.add(t);
        }
        return [...types].sort((a, b) => a.localeCompare(b, "fr"));
    }, [rows]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            const bucket = normalizeStatusBucket(String(row.status ?? row.state ?? ""));
            if (statusFilter !== "all" && bucket !== statusFilter) return false;
            if (filterPriority !== "all") {
                const pr = String(row.priority ?? "").toLowerCase();
                if (pr !== filterPriority) return false;
            }
            if (filterType !== "all" && String(row.type ?? "").toLowerCase() !== filterType.toLowerCase()) return false;
            if (filterProject !== "all") {
                const pn = readString(row, ["project_name", "projectName", "project"]);
                if (pn !== filterProject) return false;
            }
            if (!q) return true;
            const msg = stripTechnicalScoringSegments(String(row.message ?? row.title ?? "")).toLowerCase();
            const pn = readString(row, ["project_name", "projectName", "project"]).toLowerCase();
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
        setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        setDrawerId(null);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("action");
            return next;
        });
    }, [setSearchParams]);

    useEffect(() => {
        const id = searchParams.get("action")?.trim();
        if (!id) return;
        const found = rows.some((r) => r.id === id);
        if (found) {
            setDrawerId(id);
            setDrawerOpen(true);
        }
    }, [searchParams, rows]);

    const submit = (id: string, action: RhActionType) => {
        patch.mutate(
            { id, body: { action, response_message: note.trim() || undefined } },
            {
                onSuccess: () => {
                    closeDrawer();
                    setNote("");
                },
            },
        );
    };

    const addNoteOnly = (id: string) => {
        if (!note.trim()) return;
        patch.mutate(
            { id, body: { action: "progress", response_message: note.trim() } },
            {
                onSuccess: () => {
                    closeDrawer();
                    setNote("");
                },
            },
        );
    };

    return (
        <WorkspacePageShell role="manager" eyebrow="RH / Manager" title="Actions RH du Copilot" omitHeader>
            <div className="space-y-4">
                <PageHero
                    eyebrow="RH / Manager"
                    title="Actions RH du Copilot"
                    subtitle="Traitez les demandes de réaffectation, formation et recrutement proposées par l’IA."
                    badge="Manager"
                    status="info"
                    actions={
                        <Link
                            to="/workspace/manager/notifications"
                            className="inline-flex items-center justify-center rounded-lg border border-brand-secondary/40 bg-brand-primary/10 px-3 py-2 text-xs font-semibold text-brand-secondary transition hover:bg-brand-primary/20"
                        >
                            Retour aux alertes manager
                        </Link>
                    }
                />

                <section aria-label="Indicateurs par statut" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {STATUS_ORDER.map((key) => (
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
                                onChange={(e) => setStatusFilter(e.target.value as StatusBucket | "all")}
                                className="rounded-lg border border-secondary bg-primary px-2.5 py-2 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25"
                            >
                                <option value="all">Tous</option>
                                {STATUS_ORDER.map((s) => (
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
                                {typeOptions.map((t) => (
                                    <option key={t} value={t}>
                                        {typeLabelFr(t)}
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

                <section aria-label="File d’actions RH" className="space-y-2">
                    {isLoading ? <p className="py-6 text-center text-sm text-tertiary">Chargement…</p> : null}
                    {isError ? (
                        <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
                            Impossible de charger les actions.{" "}
                            <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
                                Réessayer
                            </button>
                        </div>
                    ) : null}
                    {!isLoading && !isError && filteredRows.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-secondary/80 bg-secondary_subtle/40 py-10 text-center text-sm text-tertiary">
                            Aucune action ne correspond aux filtres.
                        </p>
                    ) : null}

                    <ul className="space-y-2">
                        {filteredRows.map((rh) => {
                            const id = String(rh.id);
                            const bucket = normalizeStatusBucket(String(rh.status ?? rh.state ?? "")) ?? "pending";
                            const type = String(rh.type ?? "");
                            const msg = humanizeField(String(rh.message ?? rh.title ?? ""));
                            const project = readString(rh, ["project_name", "projectName", "project"]);
                            const pr = String(rh.priority ?? "");
                            const pri = priorityLabelFr(pr);
                            const created = String(rh.created_at ?? rh.createdAt ?? "");
                            const urgentVisual = pr.toLowerCase() === "urgent";

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
                                                    {statusTicketPillLabel(bucket)}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-semibold leading-snug text-primary">{msg}</h3>
                                            <p className="text-xs text-secondary">
                                                <span className="font-medium text-tertiary">Projet :</span>{" "}
                                                {project ? <span className="text-primary">{project}</span> : <span className="italic">Non disponible</span>}
                                            </p>
                                            <p className="text-[11px] text-tertiary">{formatRelativeFr(created)}</p>
                                            <p className="rounded-lg border border-dashed border-secondary/70 bg-secondary_subtle/40 px-2.5 py-2 text-xs leading-relaxed text-secondary">
                                                <span className="font-semibold text-primary">Action recommandée :</span> {recommendedAction(type)}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col gap-2 sm:w-40">
                                            <Button size="sm" color="primary" onPress={() => openDrawer(id)}>
                                                Répondre
                                            </Button>
                                            <Button size="sm" color="secondary" onPress={() => openDrawer(id)}>
                                                Voir contexte
                                            </Button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            </div>

            <RhActionDrawer
                open={drawerOpen}
                row={drawerRow}
                note={note}
                onNoteChange={setNote}
                onClose={closeDrawer}
                isPending={patch.isPending}
                onSubmit={submit}
                onAddNote={addNoteOnly}
            />
        </WorkspacePageShell>
    );
}

type DrawerChoice = "accept" | "reject" | "progress" | "note";

function RhActionDrawer({
    open,
    row,
    note,
    onNoteChange,
    onClose,
    isPending,
    onSubmit,
    onAddNote,
}: {
    open: boolean;
    row: (Record<string, unknown> & { id: string }) | null;
    note: string;
    onNoteChange: (v: string) => void;
    onClose: () => void;
    isPending: boolean;
    onSubmit: (id: string, action: RhActionType) => void;
    onAddNote: (id: string) => void;
}) {
    const [choice, setChoice] = useState<DrawerChoice>("accept");

    useEffect(() => {
        if (row?.id) setChoice("accept");
    }, [row?.id]);

    if (!open || !row) return null;

    const id = String(row.id);
    const bucket = normalizeStatusBucket(String(row.status ?? row.state ?? "")) ?? "pending";
    const pending = bucket === "pending";
    const type = String(row.type ?? "");
    const msg = humanizeField(String(row.message ?? row.title ?? ""));
    const project = readString(row, ["project_name", "projectName", "project"]);
    const pid = readString(row, ["project_id", "projectId"]);
    const aiReason = readString(row, ["ai_reason", "reason", "rationale", "copilot_reason", "explanation", "description"]);
    const impact = readString(row, ["expected_impact", "impact", "business_impact", "outcome"]);

    const confirmDisabled =
        isPending || (choice === "note" && !note.trim()) || (choice === "reject" && !note.trim());

    const onConfirm = () => {
        if (choice === "note") {
            onAddNote(id);
            return;
        }
        onSubmit(id, choice);
    };

    return (
        <ModalOverlay isOpen={open} onOpenChange={(v) => !v && onClose()} isDismissable>
            <Modal className="items-stretch justify-end p-0 sm:p-4 sm:pl-0">
                <Dialog
                    className={cx(
                        "flex h-dvh w-full max-w-full flex-col border-secondary bg-primary shadow-2xl outline-hidden sm:max-w-md sm:border-l sm:border-t-0",
                        "sm:h-[min(100dvh,880px)] sm:rounded-l-2xl sm:border-l sm:border-secondary",
                    )}
                >
                    <header className="flex shrink-0 items-start justify-between gap-2 border-b border-secondary px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">Action RH</p>
                            <h2 className="mt-0.5 line-clamp-2 text-base font-semibold text-primary">{msg}</h2>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <span className={cx("rounded-md border px-2 py-0.5 text-[10px] font-semibold", statusPillClass(bucket))}>
                                    {statusTicketPillLabel(bucket)}
                                </span>
                                <span className="rounded-md border border-secondary/80 bg-secondary_subtle px-2 py-0.5 text-[10px] font-semibold text-secondary">
                                    {typeLabelFr(type)}
                                </span>
                            </div>
                        </div>
                        <Button size="sm" color="tertiary" onPress={onClose}>
                            Fermer
                        </Button>
                    </header>

                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                        <section className="space-y-1 rounded-xl border border-secondary/70 bg-secondary_subtle/30 p-3 text-sm">
                            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Demande</h3>
                            <p className="leading-relaxed text-secondary">{msg}</p>
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
                            <div>
                                <dt className="text-[11px] font-semibold uppercase text-tertiary">Raison (IA)</dt>
                                <dd className="mt-0.5 leading-relaxed text-secondary">{humanizeField(aiReason)}</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-semibold uppercase text-tertiary">Impact attendu</dt>
                                <dd className="mt-0.5 leading-relaxed text-secondary">{humanizeField(impact)}</dd>
                            </div>
                        </dl>

                        {readString(row, ["response_message", "responseMessage"]) ? (
                            <div className="rounded-lg border border-secondary/80 bg-primary p-3 text-xs text-secondary">
                                <span className="font-semibold text-primary">Commentaire enregistré :</span>{" "}
                                {humanizeField(readString(row, ["response_message", "responseMessage"]))}
                            </div>
                        ) : null}

                        {pending ? (
                            <section className="space-y-3">
                                <h3 className="text-[11px] font-semibold uppercase text-tertiary">Décision</h3>
                                <fieldset className="space-y-2">
                                    <legend className="sr-only">Choisir une décision</legend>
                                    {(
                                        [
                                            { value: "accept" as const, label: "Accepter", hint: "Valider la proposition du Copilot." },
                                            { value: "reject" as const, label: "Rejeter", hint: "Refuser avec un motif (commentaire obligatoire)." },
                                            { value: "progress" as const, label: "Mettre en cours", hint: "La demande est prise en charge côté métier." },
                                            { value: "note" as const, label: "Ajouter une note", hint: "Enregistrer un commentaire et passer en traitement." },
                                        ] as const
                                    ).map((opt) => (
                                        <label
                                            key={opt.value}
                                            className={cx(
                                                "flex cursor-pointer gap-3 rounded-xl border p-3 transition",
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
                                                className="mt-1 size-4 shrink-0 accent-brand-solid"
                                            />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-primary">{opt.label}</span>
                                                <span className="mt-0.5 block text-xs text-tertiary">{opt.hint}</span>
                                            </span>
                                        </label>
                                    ))}
                                </fieldset>
                                <div>
                                    <label htmlFor="rh-drawer-note" className="text-[11px] font-semibold uppercase text-tertiary">
                                        Commentaire
                                    </label>
                                    <textarea
                                        id="rh-drawer-note"
                                        value={note}
                                        onChange={(e) => onNoteChange(e.target.value)}
                                        placeholder={
                                            choice === "reject"
                                                ? "Motif du refus (obligatoire)"
                                                : "Précisions pour le suivi RH (optionnel selon le choix)"
                                        }
                                        rows={3}
                                        className="mt-1 w-full resize-y rounded-lg border border-secondary bg-primary p-2.5 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25"
                                    />
                                </div>
                            </section>
                        ) : (
                            <p className="rounded-lg border border-secondary/60 bg-secondary_subtle/40 p-3 text-xs text-secondary">
                                Cette action n’est plus en attente. Les décisions rapides ne sont disponibles que pour les demandes en attente.
                            </p>
                        )}
                    </div>

                    {pending ? (
                        <footer className="shrink-0 space-y-2 border-t border-secondary px-4 py-3">
                            <Button className="w-full" color="primary" isDisabled={confirmDisabled} isLoading={isPending} onPress={onConfirm}>
                                Confirmer
                            </Button>
                            <p className="text-center text-[10px] text-tertiary">
                                Le commentaire est transmis avec votre décision lorsque vous le renseignez.
                            </p>
                        </footer>
                    ) : (
                        <footer className="shrink-0 border-t border-secondary px-4 py-3">
                            <Button className="w-full" color="secondary" onPress={onClose}>
                                Fermer
                            </Button>
                        </footer>
                    )}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
