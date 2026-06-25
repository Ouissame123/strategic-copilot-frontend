import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { REQUEST_TYPE_OPTIONS, STATUS_TONES, PRIORITY_TONES, badgeToneClass } from "@/components/talent/requests/talent-request-ui";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import {
    useManagerTalentRequestDecision,
    useManagerTalentRequestsList,
    useManagerTalentRequestsSummary,
} from "@/hooks/useManagerTalentRequests";
import { useTeam } from "@/hooks/useTeam";
import type { TalentListItem } from "@/types/api.types";
import type { TalentRequest, TalentRequestPriority, TalentRequestStatus, TalentRequestType } from "@/types/talent-requests";
import { cx } from "@/utils/cx";

type KpiKey = "pending" | "accepted" | "rejected" | "hr_transfer";
type KpiFilter = "all" | KpiKey;

function managerKpiBucket(status: TalentRequestStatus): KpiKey {
    if (status === "pending") return "pending";
    if (status === "accepted" || status === "done" || status === "closed") return "accepted";
    if (status === "rejected" || status === "cancelled") return "rejected";
    if (status === "in_progress") return "hr_transfer";
    return "pending";
}

function priorityBadge(priority: TalentRequestPriority) {
    if (priority === "urgent") return { label: "Urgent", color: "error" as const };
    if (priority === "high") return { label: "Haute", color: "warning" as const };
    if (priority === "low") return { label: "Faible", color: "gray" as const };
    return { label: "Normale", color: "gray" as const };
}

function statusBadge(status: TalentRequestStatus, statusLabel: string) {
    const bucket = managerKpiBucket(status);
    if (bucket === "pending") return { label: statusLabel || "En attente", color: "warning" as const };
    if (bucket === "accepted") return { label: statusLabel || "Acceptée", color: "success" as const };
    if (bucket === "rejected") return { label: statusLabel || "Refusée", color: "error" as const };
    return { label: statusLabel || "Transférée RH", color: "brand" as const };
}

function formatDate(iso: string, locale: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const loc = locale.startsWith("ar") ? "ar-MA" : locale.startsWith("en") ? "en-GB" : "fr-FR";
    return d.toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" });
}

export default function TalentRequestsPage() {
    const { t, i18n } = useTranslation(["common", "nav"]);
    const tr = useCallback((k: string, o?: Record<string, string>) => t(`managerWorkspace.talentRequests.${k}`, o), [t]);

    useCopilotPage("none", t("nav:managerNavTalentRequests"));

    const teamQuery = useTeam({ scope: "mine", limit: 200 });
    const listQuery = useManagerTalentRequestsList({ limit: 200 });
    const summaryQuery = useManagerTalentRequestsSummary();
    const decision = useManagerTalentRequestDecision();

    const [kpiFilter, setKpiFilter] = useState<KpiFilter>("all");
    const [filterType, setFilterType] = useState<TalentRequestType | "all">("all");
    const [filterPriority, setFilterPriority] = useState<TalentRequestPriority | "all">("all");
    const [filterTalentId, setFilterTalentId] = useState("");
    const [searchInput, setSearchInput] = useState("");

    const requests = listQuery.data ?? [];

    const kpiCounts = useMemo(() => {
        const fromSummary = summaryQuery.data?.by_status;
        if (fromSummary) {
            return {
                pending: fromSummary.pending ?? 0,
                accepted: (fromSummary.accepted ?? 0) + (fromSummary.done ?? 0) + (fromSummary.closed ?? 0),
                rejected: (fromSummary.rejected ?? 0) + (fromSummary.cancelled ?? 0),
                hr_transfer: fromSummary.in_progress ?? 0,
            };
        }
        const c: Record<KpiKey, number> = { pending: 0, accepted: 0, rejected: 0, hr_transfer: 0 };
        for (const row of requests) c[managerKpiBucket(row.status)] += 1;
        return c;
    }, [requests, summaryQuery.data?.by_status]);

    const filtered = useMemo(() => {
        const q = searchInput.trim().toLowerCase();
        return requests.filter((row) => {
            if (kpiFilter !== "all" && managerKpiBucket(row.status) !== kpiFilter) return false;
            if (filterType !== "all" && row.request_type !== filterType) return false;
            if (filterPriority !== "all" && row.priority !== filterPriority) return false;
            if (filterTalentId && row.talent_id !== filterTalentId) return false;
            if (q) {
                const hay = `${row.title} ${row.description ?? ""} ${row.talent_name ?? ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [requests, kpiFilter, filterType, filterPriority, filterTalentId, searchInput]);

    const sorted = useMemo(
        () => [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        [filtered],
    );

    const kpiDefs: { id: KpiKey; labelKey: string }[] = [
        { id: "pending", labelKey: "kpiPending" },
        { id: "accepted", labelKey: "kpiAccepted" },
        { id: "rejected", labelKey: "kpiRejected" },
        { id: "hr_transfer", labelKey: "kpiHrTransfer" },
    ];

    const hasFilters =
        kpiFilter !== "all" || filterType !== "all" || filterPriority !== "all" || filterTalentId !== "" || searchInput.trim() !== "";

    const resetFilters = () => {
        setKpiFilter("all");
        setFilterType("all");
        setFilterPriority("all");
        setFilterTalentId("");
        setSearchInput("");
    };

    const onDecision = (id: string, action: "accept" | "reject" | "transfer_rh", reason?: string) => {
        decision.mutate({ id, body: { action, decision_reason: reason } });
    };

    const teamTalents = teamQuery.data?.talents ?? [];

    return (
        <WorkspacePageShell role="manager" eyebrow="" title="" omitHeader>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {kpiDefs.map(({ id, labelKey }) => {
                        const count = kpiCounts[id];
                        const active = kpiFilter === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setKpiFilter((prev) => (prev === id ? "all" : id))}
                                className={cx(
                                    "flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors",
                                    active
                                        ? "border-brand-secondary bg-brand-secondary/10 ring-1 ring-brand-secondary/30"
                                        : "border-secondary bg-secondary_subtle/40 hover:border-secondary_hover",
                                )}
                            >
                                <span className="text-2xl font-bold tabular-nums text-primary">{count}</span>
                                <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                                    {tr(labelKey)}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {listQuery.isError ? (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                        <p className="font-semibold">{tr("endpointBannerTitle")}</p>
                        <p className="mt-1 text-xs opacity-90">{tr("endpointBannerBody")}</p>
                        <div className="mt-3">
                            <Button color="secondary" size="sm" onClick={() => void listQuery.refetch()} isLoading={listQuery.isFetching}>
                                {tr("refresh")}
                            </Button>
                        </div>
                    </section>
                ) : null}

                {requests.length > 0 ? (
                    <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80 sm:p-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <NativeSelect
                                label={tr("filterType")}
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as TalentRequestType | "all")}
                                options={REQUEST_TYPE_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
                            />
                            <NativeSelect
                                label={tr("filterStatus")}
                                value={kpiFilter}
                                onChange={(e) => setKpiFilter(e.target.value as KpiFilter)}
                                options={[
                                    { label: tr("filterAll"), value: "all" },
                                    ...kpiDefs.map(({ id, labelKey }) => ({ label: tr(labelKey), value: id })),
                                ]}
                            />
                            <NativeSelect
                                label={tr("filterPriority")}
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value as TalentRequestPriority | "all")}
                                options={[
                                    { label: tr("filterAll"), value: "all" },
                                    { label: tr("priorityUrgent"), value: "urgent" },
                                    { label: tr("priorityNormal"), value: "normal" },
                                    { label: tr("priorityLow"), value: "low" },
                                ]}
                            />
                            <NativeSelect
                                label={tr("filterTalent")}
                                value={filterTalentId}
                                onChange={(e) => setFilterTalentId(e.target.value)}
                                options={[
                                    { label: tr("filterAll"), value: "" },
                                    ...teamTalents
                                        .map((tal: TalentListItem) => {
                                            const id = String(tal.talent_id ?? tal.id ?? "").trim();
                                            const label = String(tal.full_name ?? tal.email ?? id).trim() || id;
                                            return { label, value: id };
                                        })
                                        .filter((o) => o.value.length > 0),
                                ]}
                            />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <input
                                type="search"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder={`${tr("filterType")}…`}
                                className="min-w-[220px] flex-1 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none focus:border-brand-secondary"
                            />
                            {hasFilters ? (
                                <Button color="secondary" size="sm" onClick={resetFilters}>
                                    {tr("resetFilters")}
                                </Button>
                            ) : null}
                            <Button color="secondary" size="sm" onClick={() => void listQuery.refetch()} isLoading={listQuery.isFetching}>
                                {tr("refresh")}
                            </Button>
                        </div>
                    </section>
                ) : null}

                {listQuery.isLoading ? <p className="text-sm text-tertiary">{tr("loading")}</p> : null}

                {!listQuery.isLoading && !listQuery.isError && sorted.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-secondary bg-secondary_subtle/30 p-10 text-center shadow-xs">
                        <p className="text-sm font-medium text-primary">{tr("emptyTitle")}</p>
                    </section>
                ) : null}

                {!listQuery.isLoading && sorted.length > 0 ? (
                    <ul className="grid gap-4 sm:grid-cols-2">
                        {sorted.map((row) => {
                            const pb = priorityBadge(row.priority);
                            const sb = statusBadge(row.status, row.status_label);
                            const canAct = row.status === "pending";
                            const dateStr = formatDate(row.created_at, i18n.language);
                            return (
                                <li
                                    key={row.id}
                                    className="rounded-xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/60"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-base font-semibold text-primary">
                                                {row.talent_name ?? tr("unknownTalent")}
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-primary">{row.title}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className={badgeToneClass(PRIORITY_TONES[row.priority])}>
                                                {pb.label}
                                            </span>
                                            <span className={badgeToneClass(STATUS_TONES[row.status])}>{sb.label}</span>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-secondary">
                                        <span className="font-medium text-primary">{tr("typePrefix")}</span>{" "}
                                        {row.request_type_label || row.request_type}
                                    </p>
                                    {row.description ? (
                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-secondary">{row.description}</p>
                                    ) : null}
                                    {dateStr ? (
                                        <p className="mt-2 text-xs text-tertiary">
                                            {tr("datePrefix")} {dateStr}
                                        </p>
                                    ) : null}
                                    {canAct ? (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <Button
                                                color="primary"
                                                size="sm"
                                                isDisabled={decision.isPending}
                                                onClick={() => onDecision(row.id, "accept")}
                                            >
                                                {tr("actionAccept")}
                                            </Button>
                                            <Button
                                                color="secondary"
                                                size="sm"
                                                isDisabled={decision.isPending}
                                                onClick={() => onDecision(row.id, "reject")}
                                            >
                                                {tr("actionReject")}
                                            </Button>
                                            <Button
                                                color="secondary"
                                                size="sm"
                                                isDisabled={decision.isPending}
                                                onClick={() => onDecision(row.id, "transfer_rh", tr("transferRhNote"))}
                                            >
                                                {tr("actionTransferRh")}
                                            </Button>
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                ) : null}
            </div>
        </WorkspacePageShell>
    );
}
