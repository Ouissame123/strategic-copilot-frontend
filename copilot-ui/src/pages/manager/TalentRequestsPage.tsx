import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ArrowLeftRight,
    ArrowRight,
    CalendarDays,
    Check,
    ChevronRight,
    GraduationCap,
    HelpCircle,
    Loader2,
    MessageSquare,
    Search,
    X,
} from "lucide-react";
import {
    REQUEST_TYPE_OPTIONS,
    STATUS_TONES,
    TYPE_TONES,
    badgeToneClass,
    isAcceptedStatus,
    isDoneStatus,
    isPendingStatus,
    isRejectedStatus,
    isTransferredStatus,
    normalizeRequestStatusKey,
} from "@/components/talent/requests/talent-request-ui";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import {
    useManagerTalentRequestsList,
    useManagerTalentRequestsSummary,
    useManagerTalentRequestPatchStatus,
} from "@/hooks/useManagerTalentRequests";
import { formatRelativeShort } from "@/lib/format-relative-short";
import type {
    ManagerTalentRequestStatusPatch,
    TalentRequest,
    TalentRequestPriority,
    TalentRequestStatus,
    TalentRequestType,
} from "@/types/talent-requests";
import { cx } from "@/utils/cx";

type StatusBucket = "pending" | "accepted" | "rejected" | "hr_transfer";
type StatusFilter = "all" | StatusBucket;

const PRIORITY_RANK: Record<TalentRequestPriority, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
};

const PRIORITY_DOT: Record<TalentRequestPriority, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    normal: "bg-slate-400",
    low: "bg-slate-300",
};

const PRIORITY_LABEL: Record<TalentRequestPriority, string> = {
    urgent: "Urgent",
    high: "Haute",
    normal: "Normale",
    low: "Faible",
};

const AVATAR_PALETTE = [
    "bg-sky-600",
    "bg-emerald-600",
    "bg-violet-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-teal-600",
    "bg-indigo-600",
    "bg-cyan-700",
] as const;

function managerStatusBucket(status: TalentRequestStatus | string): StatusBucket {
    const s = normalizeRequestStatusKey(status);
    if (isPendingStatus(s)) return "pending";
    if (isRejectedStatus(s) || s === "cancelled") return "rejected";
    if (isAcceptedStatus(s) || s === "done" || s === "closed") return "accepted";
    if (isTransferredStatus(s)) return "hr_transfer";
    return "pending";
}

function statusDisplay(status: TalentRequestStatus | string, statusLabel: string) {
    const bucket = managerStatusBucket(status);
    if (bucket === "pending") return { label: statusLabel || "En attente", tone: STATUS_TONES.pending };
    if (bucket === "accepted") return { label: statusLabel || "Acceptée", tone: STATUS_TONES.accepted };
    if (bucket === "rejected") return { label: statusLabel || "Refusée", tone: STATUS_TONES.rejected };
    return { label: statusLabel || "Transférée RH", tone: STATUS_TONES.transferred_to_hr };
}

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function avatarColorClass(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

function TypeIcon({ type, className }: { type: TalentRequestType; className?: string }) {
    const props = { size: 12, className, "aria-hidden": true as const };
    if (type === "formation") return <GraduationCap {...props} />;
    if (type === "conge") return <CalendarDays {...props} />;
    if (type === "mobilite") return <ArrowLeftRight {...props} />;
    if (type === "feedback") return <MessageSquare {...props} />;
    return <HelpCircle {...props} />;
}

function typeLabel(type: TalentRequestType, fallback?: string): string {
    if (fallback?.trim()) return fallback;
    const opt = REQUEST_TYPE_OPTIONS.find((o) => o.value === type);
    return opt?.label ?? type;
}

function emptyMessageForFilter(filter: StatusFilter): string {
    if (filter === "pending") return "Aucune demande en attente.";
    if (filter === "accepted") return "Aucune demande acceptée.";
    if (filter === "rejected") return "Aucune demande refusée.";
    if (filter === "hr_transfer") return "Aucune demande transférée aux RH.";
    return "Aucune demande talent pour le moment.";
}

function ListSkeleton() {
    return (
        <ul className="divide-y divide-secondary overflow-hidden rounded-xl border border-secondary bg-primary" aria-busy="true" aria-label="Chargement">
            {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                    <span className="size-2 shrink-0 animate-pulse rounded-full bg-secondary" />
                    <span className="size-8 shrink-0 animate-pulse rounded-full bg-secondary" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3.5 w-2/5 max-w-[180px] animate-pulse rounded bg-secondary" />
                        <div className="h-3 w-3/5 max-w-[260px] animate-pulse rounded bg-secondary" />
                    </div>
                    <span className="hidden h-5 w-16 animate-pulse rounded-full bg-secondary sm:block" />
                    <span className="h-3 w-12 animate-pulse rounded bg-secondary" />
                </li>
            ))}
        </ul>
    );
}

export default function TalentRequestsPage() {
    const { t } = useTranslation("common");
    const tr = useCallback((k: string, o?: Record<string, string>) => t(`managerWorkspace.talentRequests.${k}`, o), [t]);

    useCopilotPage();

    const listQuery = useManagerTalentRequestsList({ limit: 200 });
    const summaryQuery = useManagerTalentRequestsSummary();
    const patchStatus = useManagerTalentRequestPatchStatus();

    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [filterType, setFilterType] = useState<TalentRequestType | "all">("all");
    const [searchInput, setSearchInput] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const requests = listQuery.data ?? [];

    const selected = useMemo(
        () => (selectedId ? (requests.find((r) => r.id === selectedId) ?? null) : null),
        [requests, selectedId],
    );

    useEffect(() => {
        if (!selectedId) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedId(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedId]);

    useEffect(() => {
        if (selectedId && !listQuery.isLoading && !requests.some((r) => r.id === selectedId)) {
            setSelectedId(null);
        }
    }, [selectedId, requests, listQuery.isLoading]);

    const statusCounts = useMemo(() => {
        const fromSummary = summaryQuery.data?.by_status;
        if (fromSummary) {
            return {
                pending: fromSummary.pending ?? 0,
                accepted: (fromSummary.accepted ?? 0) + (fromSummary.done ?? 0) + (fromSummary.closed ?? 0),
                rejected: (fromSummary.rejected ?? 0) + (fromSummary.refused ?? 0) + (fromSummary.cancelled ?? 0),
                hr_transfer: (fromSummary.in_progress ?? 0) + (fromSummary.transferred_to_hr ?? 0),
            };
        }
        const c: Record<StatusBucket, number> = { pending: 0, accepted: 0, rejected: 0, hr_transfer: 0 };
        for (const row of requests) c[managerStatusBucket(row.status)] += 1;
        return c;
    }, [requests, summaryQuery.data?.by_status]);

    const totalCount = summaryQuery.data?.total ?? requests.length;

    const filtered = useMemo(() => {
        const q = searchInput.trim().toLowerCase();
        return requests.filter((row) => {
            if (statusFilter !== "all" && managerStatusBucket(row.status) !== statusFilter) return false;
            if (filterType !== "all" && row.request_type !== filterType) return false;
            if (q) {
                const hay = `${row.talent_name ?? ""} ${row.title} ${row.description ?? ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [requests, statusFilter, filterType, searchInput]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const aPending = isPendingStatus(a.status) ? 0 : 1;
            const bPending = isPendingStatus(b.status) ? 0 : 1;
            if (aPending !== bPending) return aPending - bPending;
            const pr = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
            if (pr !== 0) return pr;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [filtered]);

    const actioningId = patchStatus.isPending ? (patchStatus.variables?.id ?? null) : null;

    const runAction = useCallback(
        (id: string, status: ManagerTalentRequestStatusPatch) => {
            patchStatus.mutate({ id, status });
        },
        [patchStatus],
    );

    const segments: { id: StatusFilter; label: string; count: number }[] = [
        { id: "all", label: "Toutes", count: totalCount },
        { id: "pending", label: tr("kpiPending"), count: statusCounts.pending },
        { id: "accepted", label: tr("kpiAccepted"), count: statusCounts.accepted },
        { id: "rejected", label: tr("kpiRejected"), count: statusCounts.rejected },
        { id: "hr_transfer", label: tr("kpiHrTransfer"), count: statusCounts.hr_transfer },
    ];

    const typePills: { value: TalentRequestType | "all"; label: string }[] = [
        { value: "all", label: "Tous" },
        { value: "formation", label: "Formation" },
        { value: "conge", label: "Congé" },
        { value: "mobilite", label: "Réaffectation" },
        { value: "feedback", label: "Feedback" },
        { value: "autre", label: "Autre" },
    ];

    return (
        <WorkspacePageShell role="manager" eyebrow="" title="" omitHeader>
            <div className="space-y-4">
                {/* Segmented control statut */}
                <div
                    role="tablist"
                    aria-label="Filtrer par statut"
                    className="flex flex-wrap gap-1 rounded-xl border border-secondary bg-secondary_subtle/40 p-1"
                >
                    {segments.map((seg) => {
                        const active = statusFilter === seg.id;
                        return (
                            <button
                                key={seg.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setStatusFilter(seg.id)}
                                className={cx(
                                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                                    active
                                        ? "bg-primary text-primary shadow-xs ring-1 ring-secondary"
                                        : "text-secondary hover:bg-primary/60 hover:text-primary",
                                )}
                            >
                                <span>{seg.label}</span>
                                <span
                                    className={cx(
                                        "tabular-nums rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                                        active ? "bg-brand-secondary/15 text-brand-secondary" : "bg-secondary text-tertiary",
                                    )}
                                >
                                    {seg.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Recherche + pills type */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="relative block min-w-0 flex-1 sm:max-w-sm">
                        <span className="sr-only">Rechercher</span>
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
                            aria-hidden
                        />
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Rechercher par nom, objet ou description…"
                            className="w-full rounded-lg border border-secondary bg-primary py-2 pl-9 pr-3 text-sm text-primary outline-none placeholder:text-tertiary focus-visible:border-brand-secondary focus-visible:ring-2 focus-visible:ring-brand/30"
                        />
                    </label>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par type">
                        {typePills.map((pill) => {
                            const active = filterType === pill.value;
                            return (
                                <button
                                    key={pill.value}
                                    type="button"
                                    onClick={() => setFilterType(pill.value)}
                                    className={cx(
                                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                                        active
                                            ? "bg-brand-secondary text-white"
                                            : "bg-secondary_subtle text-secondary ring-1 ring-secondary hover:text-primary",
                                    )}
                                >
                                    {pill.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {listQuery.isError ? (
                    <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                        <p className="font-semibold">{tr("endpointBannerTitle")}</p>
                        <p className="mt-1 text-xs opacity-90">{tr("endpointBannerBody")}</p>
                        <button
                            type="button"
                            onClick={() => void listQuery.refetch()}
                            disabled={listQuery.isFetching}
                            className="mt-3 inline-flex items-center rounded-lg border border-amber-300 bg-white/70 px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                        >
                            {listQuery.isFetching ? <Loader2 size={13} className="mr-1.5 animate-spin" aria-hidden /> : null}
                            {tr("refresh")}
                        </button>
                    </section>
                ) : null}

                {listQuery.isLoading ? <ListSkeleton /> : null}

                {!listQuery.isLoading && !listQuery.isError && sorted.length === 0 ? (
                    <section className="rounded-xl border border-dashed border-secondary bg-secondary_subtle/30 px-6 py-12 text-center">
                        <p className="text-sm font-medium text-primary">{emptyMessageForFilter(statusFilter)}</p>
                        {(statusFilter !== "all" || filterType !== "all" || searchInput.trim()) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setStatusFilter("all");
                                    setFilterType("all");
                                    setSearchInput("");
                                }}
                                className="mt-3 text-xs font-semibold text-brand-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                                {tr("resetFilters")}
                            </button>
                        )}
                    </section>
                ) : null}

                {!listQuery.isLoading && sorted.length > 0 ? (
                    <ul className="divide-y divide-secondary overflow-hidden rounded-xl border border-secondary bg-primary">
                        {sorted.map((row) => {
                            const name = row.talent_name?.trim() || tr("unknownTalent");
                            const sb = statusDisplay(row.status, row.status_label);
                            const relative = formatRelativeShort(row.created_at);
                            const isSelected = selectedId === row.id;
                            return (
                                <li key={row.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedId(row.id)}
                                        className={cx(
                                            "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:gap-3 sm:px-4",
                                            isSelected ? "bg-brand-secondary/8" : "hover:bg-secondary_subtle/50",
                                        )}
                                    >
                                        <span
                                            className={cx("size-2 shrink-0 rounded-full", PRIORITY_DOT[row.priority] ?? PRIORITY_DOT.normal)}
                                            title={PRIORITY_LABEL[row.priority] ?? "Normale"}
                                            aria-label={`Priorité ${PRIORITY_LABEL[row.priority] ?? "normale"}`}
                                        />
                                        <span
                                            className={cx(
                                                "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                                                avatarColorClass(name),
                                            )}
                                            aria-hidden
                                        >
                                            {initialsFromName(name)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex min-w-0 items-baseline gap-2">
                                                <span className="truncate text-sm font-semibold text-primary">{name}</span>
                                                <span className="hidden truncate text-xs text-tertiary sm:inline">{row.title}</span>
                                            </div>
                                            <p className="mt-0.5 truncate text-xs text-secondary sm:hidden">{row.title}</p>
                                        </div>
                                        <span
                                            className={cx(
                                                "hidden shrink-0 items-center gap-1 sm:inline-flex",
                                                badgeToneClass(TYPE_TONES[row.request_type] ?? "slate"),
                                            )}
                                        >
                                            <TypeIcon type={row.request_type} />
                                            {typeLabel(row.request_type, row.request_type_label)}
                                        </span>
                                        <span className="hidden shrink-0 text-xs tabular-nums text-tertiary md:inline">{relative}</span>
                                        <span className={cx("hidden shrink-0 sm:inline-flex", badgeToneClass(sb.tone))}>{sb.label}</span>
                                        <ChevronRight size={16} className="shrink-0 text-tertiary" aria-hidden />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}
            </div>

            {/* Slide-over détail */}
            {selected ? (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <button
                        type="button"
                        aria-label="Fermer"
                        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
                        onClick={() => setSelectedId(null)}
                    />
                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="talent-request-slide-title"
                        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-secondary bg-primary shadow-xl"
                    >
                        <header className="flex items-start justify-between gap-3 border-b border-secondary px-4 py-3.5">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                                    Demande talent
                                </p>
                                <h2 id="talent-request-slide-title" className="mt-0.5 truncate text-base font-semibold text-primary">
                                    {selected.title}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedId(null)}
                                className="rounded-lg p-1.5 text-tertiary transition hover:bg-secondary_subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                aria-label="Fermer le panneau"
                            >
                                <X size={18} aria-hidden />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            <SlideOverBody
                                row={selected}
                                actioningId={actioningId}
                                onAction={runAction}
                                labels={{
                                    accept: tr("actionAccept"),
                                    reject: tr("actionReject"),
                                    transferRh: tr("actionTransferRh"),
                                    reconsider: tr("actionReconsider"),
                                    unknownTalent: tr("unknownTalent"),
                                    noDescription: tr("noDescription"),
                                    typePrefix: tr("typePrefix"),
                                    datePrefix: tr("datePrefix"),
                                    transferredRh: tr("labelTransferredRh"),
                                }}
                            />
                        </div>
                    </aside>
                </div>
            ) : null}
        </WorkspacePageShell>
    );
}

type SlideLabels = {
    accept: string;
    reject: string;
    transferRh: string;
    reconsider: string;
    unknownTalent: string;
    noDescription: string;
    typePrefix: string;
    datePrefix: string;
    transferredRh: string;
};

function SlideOverBody({
    row,
    actioningId,
    onAction,
    labels,
}: {
    row: TalentRequest;
    actioningId: string | null;
    onAction: (id: string, status: ManagerTalentRequestStatusPatch) => void;
    labels: SlideLabels;
}) {
    const name = row.talent_name?.trim() || labels.unknownTalent;
    const sb = statusDisplay(row.status, row.status_label);
    const normalized = normalizeRequestStatusKey(row.status);
    const isActioning = actioningId === row.id;
    const disabled = Boolean(actioningId);
    const relative = formatRelativeShort(row.created_at);
    const absoluteDate = (() => {
        const d = new Date(row.created_at);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    })();

    const showAccept = isPendingStatus(normalized);
    const showReject = isPendingStatus(normalized) || isAcceptedStatus(normalized);
    const showReconsider = isRejectedStatus(normalized);
    const showTransfer = isPendingStatus(normalized);
    const isTransferred = isTransferredStatus(normalized);
    const isDone = isDoneStatus(normalized);
    const readOnly = isTransferred || isDone;

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <span
                    className={cx(
                        "flex size-11 items-center justify-center rounded-full text-sm font-bold text-white",
                        avatarColorClass(name),
                    )}
                    aria-hidden
                >
                    {initialsFromName(name)}
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">{name}</p>
                    {row.talent_email ? <p className="truncate text-xs text-tertiary">{row.talent_email}</p> : null}
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
                <span className={cx("inline-flex items-center gap-1", badgeToneClass(TYPE_TONES[row.request_type] ?? "slate"))}>
                    <TypeIcon type={row.request_type} />
                    {typeLabel(row.request_type, row.request_type_label)}
                </span>
                <span className={badgeToneClass(sb.tone)}>{sb.label}</span>
                <span
                    className={cx(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-secondary bg-secondary_subtle text-secondary",
                    )}
                >
                    <span className={cx("size-1.5 rounded-full", PRIORITY_DOT[row.priority] ?? PRIORITY_DOT.normal)} aria-hidden />
                    {PRIORITY_LABEL[row.priority] ?? "Normale"}
                </span>
            </div>

            <dl className="grid gap-3 text-sm">
                <div>
                    <dt className="text-xs font-medium text-tertiary">{labels.typePrefix}</dt>
                    <dd className="mt-0.5 text-primary">{typeLabel(row.request_type, row.request_type_label)}</dd>
                </div>
                <div>
                    <dt className="text-xs font-medium text-tertiary">{labels.datePrefix}</dt>
                    <dd className="mt-0.5 text-primary">
                        {relative}
                        {absoluteDate ? <span className="text-tertiary"> · {absoluteDate}</span> : null}
                    </dd>
                </div>
                {row.decision_reason ? (
                    <div>
                        <dt className="text-xs font-medium text-tertiary">Motif de décision</dt>
                        <dd className="mt-0.5 whitespace-pre-wrap text-secondary">{row.decision_reason}</dd>
                    </div>
                ) : null}
            </dl>

            <div>
                <p className="text-xs font-medium text-tertiary">Description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-secondary">
                    {row.description?.trim() || labels.noDescription}
                </p>
            </div>

            {!readOnly ? (
                <div className="flex flex-wrap gap-2 border-t border-secondary pt-4">
                    {showAccept ? (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onAction(row.id, "accepted")}
                            className={cx(
                                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60",
                                isActioning ? "bg-emerald-100 text-emerald-900" : "bg-emerald-600 text-white hover:bg-emerald-700",
                            )}
                        >
                            {isActioning ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Check size={14} aria-hidden />}
                            {labels.accept}
                        </button>
                    ) : null}

                    {showReject ? (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onAction(row.id, "rejected")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-rose-950/30"
                        >
                            <X size={14} aria-hidden />
                            {labels.reject}
                        </button>
                    ) : null}

                    {showReconsider ? (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onAction(row.id, "pending")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60 dark:text-violet-300 dark:hover:bg-violet-950/30"
                        >
                            {labels.reconsider}
                        </button>
                    ) : null}

                    {showTransfer ? (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onAction(row.id, "transferred_to_hr")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-secondary px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary_subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <ArrowRight size={14} aria-hidden />
                            {labels.transferRh}
                        </button>
                    ) : null}
                </div>
            ) : isTransferred ? (
                <p className="flex items-center gap-1.5 border-t border-secondary pt-4 text-xs text-tertiary">
                    <ArrowRight size={13} aria-hidden />
                    {labels.transferredRh}
                </p>
            ) : null}
        </div>
    );
}
