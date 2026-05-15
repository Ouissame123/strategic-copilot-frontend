import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePatchRhAction, useRhActions } from "@/hooks/useNotifications";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/providers/toast-provider";
import type { TalentListItem } from "@/types/api.types";
import { rowsFromRhActionsPayload } from "@/utils/rh-actions-list";
import { cx } from "@/utils/cx";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type KpiKey = "pending" | "accepted" | "rejected" | "hr_transfer";
type KpiFilter = "all" | KpiKey;

function readString(row: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = row[k];
        if (v != null && String(v).trim()) return String(v).trim();
    }
    return "";
}

function looksLikeUuid(s: string): boolean {
    return UUID_RE.test(s.trim());
}

/** Heuristique : la charge utile GET /webhook/manager/rh-actions doit exposer au moins un de ces signaux. */
function isTalentSourcedRow(row: Record<string, unknown>): boolean {
    const src = String(row.source ?? row.origin ?? row.request_source ?? "").toLowerCase();
    if (src.includes("talent") || src.includes("employee")) return true;
    const rt = String(row.requester_type ?? row.created_by_type ?? row.author_role ?? "").toLowerCase();
    if (rt.includes("talent") || rt === "employee" || rt === "contributor") return true;
    if (row.from_talent === true || row.is_talent_request === true) return true;
    const tName = readString(row, ["talent_name", "talent_full_name", "requester_name", "employee_name"]);
    if (tName && !looksLikeUuid(tName)) return true;
    const tid = String(row.talent_id ?? row.requester_talent_id ?? "").trim();
    return Boolean(tid && UUID_RE.test(tid));
}

function managerFourBucket(row: Record<string, unknown>): KpiKey {
    const s = String(row.status ?? row.state ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
    if (s.includes("reject") || s.includes("refus") || s.includes("declin") || s === "cancelled" || s === "canceled")
        return "rejected";
    if (s.includes("accept") || s === "done" || s === "completed" || s === "closed") return "accepted";
    if (s.includes("progress") || s === "in_progress" || s.includes("transf") || s.includes("routed") || s.includes("_rh"))
        return "hr_transfer";
    if (!s || s === "pending" || s === "open" || s === "new" || s === "submitted" || s === "draft") return "pending";
    return "pending";
}

function priorityBucket(row: Record<string, unknown>): "" | "urgent" | "normal" | "low" {
    const p = String(row.priority ?? "")
        .trim()
        .toLowerCase();
    if (p.includes("urgent") || p === "high") return "urgent";
    if (p.includes("low") || p.includes("faible")) return "low";
    if (p.includes("normal") || p === "medium" || p === "moyen") return "normal";
    if (!p) return "";
    return "normal";
}

function talentRowId(row: Record<string, unknown> & { id: string }): string {
    const id = String(row.id ?? row.action_id ?? "").trim();
    return id;
}

function talentName(row: Record<string, unknown>, tr: (k: string) => string): string {
    const n = readString(row, ["talent_name", "talent_full_name", "requester_name", "employee_name", "full_name"]);
    if (n && !looksLikeUuid(n)) return n;
    return tr("unknownTalent");
}

function projectLine(row: Record<string, unknown>, tr: (k: string) => string): string | null {
    const pn = readString(row, ["project_name", "projectName", "project_title"]);
    if (!pn || looksLikeUuid(pn)) return null;
    const pid = readString(row, ["project_id", "projectId"]);
    if (pid && looksLikeUuid(pid) && pn === pid) return null;
    return pn;
}

function descriptionText(row: Record<string, unknown>, tr: (k: string) => string): string {
    const msg = readString(row, ["message", "body", "description"]);
    if (!msg || looksLikeUuid(msg)) return tr("noDescription");
    return msg;
}

function formatDate(iso: unknown, locale: string): string {
    if (iso == null || String(iso).trim() === "") return "";
    const d = new Date(String(iso));
    if (Number.isNaN(d.getTime())) return "";
    const loc = locale.startsWith("ar") ? "ar-MA" : locale.startsWith("en") ? "en-GB" : "fr-FR";
    return d.toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" });
}

export default function TalentRequestsPage() {
    const { t, i18n } = useTranslation(["common", "nav"]);
    const { push } = useToast();
    const tr = useCallback((k: string, o?: Record<string, string>) => t(`managerWorkspace.talentRequests.${k}`, o), [t]);

    useCopilotPage("none", t("nav:managerNavTalentRequests"));

    const rhQuery = useRhActions({ limit: 300 });
    const patch = usePatchRhAction();
    const teamQuery = useTeam({ scope: "mine", limit: 200 });

    const [kpiFilter, setKpiFilter] = useState<KpiFilter>("all");
    const [filterType, setFilterType] = useState<string>("");
    const [filterPriority, setFilterPriority] = useState<"" | "urgent" | "normal" | "low">("");
    const [filterTalentId, setFilterTalentId] = useState<string>("");

    const rawRows = useMemo(() => rowsFromRhActionsPayload(rhQuery.data), [rhQuery.data]);

    const talentRows = useMemo(() => rawRows.filter((r) => isTalentSourcedRow(r)), [rawRows]);

    const teamTalents = useMemo(() => teamQuery.data?.talents ?? [], [teamQuery.data?.talents]);

    const kpiCounts = useMemo(() => {
        const c: Record<KpiKey, number> = { pending: 0, accepted: 0, rejected: 0, hr_transfer: 0 };
        for (const row of talentRows) {
            c[managerFourBucket(row)] += 1;
        }
        return c;
    }, [talentRows]);

    const typeOptions = useMemo(() => {
        const s = new Set<string>();
        for (const row of talentRows) {
            const ty = String(row.type ?? "").trim();
            if (ty) s.add(ty);
        }
        return [...s].sort((a, b) => a.localeCompare(b));
    }, [talentRows]);

    const filtered = useMemo(() => {
        return talentRows.filter((row) => {
            if (kpiFilter !== "all" && managerFourBucket(row) !== kpiFilter) return false;
            if (filterType && String(row.type ?? "").trim() !== filterType) return false;
            const pb = priorityBucket(row);
            if (filterPriority && pb !== filterPriority) return false;
            if (filterTalentId) {
                const tid = String(row.talent_id ?? row.requester_talent_id ?? "").trim();
                if (tid !== filterTalentId) return false;
            }
            return true;
        });
    }, [talentRows, kpiFilter, filterType, filterPriority, filterTalentId]);

    const sorted = useMemo(() => {
        const ts = (row: Record<string, unknown> & { id: string }) => {
            const raw = row.created_at ?? row.updated_at ?? row.submitted_at;
            const n = new Date(String(raw ?? "")).getTime();
            return Number.isFinite(n) ? n : 0;
        };
        return [...filtered].sort((a, b) => ts(b) - ts(a));
    }, [filtered]);

    const showUnparsedHint = Boolean(
        rhQuery.isSuccess && rawRows.length > 0 && talentRows.length === 0 && !rhQuery.isError,
    );

    const onPatch = useCallback(
        (id: string, action: "accept" | "reject" | "progress", note?: string) => {
            if (!UUID_RE.test(id)) {
                push(tr("toastInvalidId"), "error");
                return;
            }
            patch.mutate(
                { id, body: { action, response_message: note } },
                {
                    onSuccess: () => {
                        if (action === "accept") push(tr("toastAcceptOk"), "success");
                        else if (action === "reject") push(tr("toastRejectOk"), "success");
                        else push(tr("toastTransferOk"), "success");
                    },
                    onError: () => push(tr("toastActionFail"), "error"),
                },
            );
        },
        [patch, push, tr],
    );

    const kpiDefs: { id: KpiKey; labelKey: string }[] = [
        { id: "pending", labelKey: "kpiPending" },
        { id: "accepted", labelKey: "kpiAccepted" },
        { id: "rejected", labelKey: "kpiRejected" },
        { id: "hr_transfer", labelKey: "kpiHrTransfer" },
    ];

    const hasFilters = kpiFilter !== "all" || filterType !== "" || filterPriority !== "" || filterTalentId !== "";

    const resetFilters = () => {
        setKpiFilter("all");
        setFilterType("");
        setFilterPriority("");
        setFilterTalentId("");
    };

    const typeLabel = useCallback(
        (ty: string) => {
            const tyl = ty.toLowerCase();
            const map: Record<string, string> = {
                recruitment: tr("typeRecruitment"),
                reallocation: tr("typeReallocation"),
                training: tr("typeTraining"),
                overload: tr("typeOverload"),
                skill_gap: tr("typeSkillGap"),
            };
            return map[tyl] ?? (ty ? ty.replace(/_/g, " ") : tr("typeUnknown"));
        },
        [tr],
    );

    const priorityBadge = (row: Record<string, unknown>) => {
        const b = priorityBucket(row);
        if (b === "urgent") return { label: tr("priorityUrgent"), color: "error" as const };
        if (b === "low") return { label: tr("priorityLow"), color: "gray" as const };
        if (b === "normal") return { label: tr("priorityNormal"), color: "warning" as const };
        return { label: tr("priorityUnknown"), color: "gray" as const };
    };

    const statusBadge = (row: Record<string, unknown>) => {
        const b = managerFourBucket(row);
        if (b === "pending") return { label: tr("statusPending"), color: "warning" as const };
        if (b === "accepted") return { label: tr("statusAccepted"), color: "success" as const };
        if (b === "rejected") return { label: tr("statusRejected"), color: "error" as const };
        return { label: tr("statusHrTransfer"), color: "brand" as const };
    };

    useWorkspaceTopbarMeta(tr("heroTitle"), tr("heroSubtitle"));

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={tr("shellTitle")}
            description={false}
            omitHeader
        >
            <div className="space-y-6 lg:space-y-8">
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

                {rhQuery.isError ? (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                        <p className="font-semibold">{tr("endpointBannerTitle")}</p>
                        <p className="mt-1 text-xs opacity-90">{tr("endpointBannerBody")}</p>
                        <div className="mt-3">
                            <Button color="secondary" size="sm" onClick={() => void rhQuery.refetch()} isLoading={rhQuery.isFetching}>
                                {tr("refresh")}
                            </Button>
                        </div>
                    </section>
                ) : null}

                {showUnparsedHint ? (
                    <p className="text-sm text-tertiary">{tr("emptyHintUnparsed")}</p>
                ) : null}

                {talentRows.length > 0 ? (
                    <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
                            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <NativeSelect
                                    label={tr("filterType")}
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    options={[{ label: tr("filterAll"), value: "" }, ...typeOptions.map((ty) => ({ label: typeLabel(ty), value: ty }))]}
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
                                    onChange={(e) => setFilterPriority(e.target.value as "" | "urgent" | "normal" | "low")}
                                    options={[
                                        { label: tr("filterAll"), value: "" },
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
                            <div className="flex flex-wrap gap-2">
                                {hasFilters ? (
                                    <Button color="secondary" size="sm" onClick={resetFilters}>
                                        {tr("resetFilters")}
                                    </Button>
                                ) : null}
                                <Button color="secondary" size="sm" onClick={() => void rhQuery.refetch()} isLoading={rhQuery.isFetching}>
                                    {tr("refresh")}
                                </Button>
                            </div>
                        </div>
                    </section>
                ) : null}

                {rhQuery.isLoading ? <p className="text-sm text-tertiary">{tr("loading")}</p> : null}

                {!rhQuery.isLoading && !rhQuery.isError && sorted.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-secondary bg-secondary_subtle/30 p-10 text-center shadow-xs">
                        <p className="text-sm font-medium text-primary">{tr("emptyTitle")}</p>
                    </section>
                ) : null}

                {!rhQuery.isLoading && sorted.length > 0 ? (
                    <ul className="space-y-4">
                        {sorted.map((row) => {
                            const id = talentRowId(row);
                            const bucket = managerFourBucket(row);
                            const pb = priorityBadge(row);
                            const sb = statusBadge(row);
                            const proj = projectLine(row, tr);
                            const desc = descriptionText(row, tr);
                            const dateStr = formatDate(row.created_at ?? row.updated_at, i18n.language);
                            const actionsEnabled = bucket === "pending" && UUID_RE.test(id);
                            return (
                                <li
                                    key={`${id}-${String(row._row_index ?? "")}`}
                                    className="rounded-xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/60"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <p className="text-base font-semibold text-primary">{talentName(row, tr)}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            <Badge type="pill-color" size="sm" color={pb.color}>
                                                {pb.label}
                                            </Badge>
                                            <Badge type="pill-color" size="sm" color={sb.color}>
                                                {sb.label}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-secondary">
                                        <span className="font-medium text-primary">{tr("typePrefix")}</span> {typeLabel(String(row.type ?? ""))}
                                    </p>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-secondary">{desc}</p>
                                    {proj ? (
                                        <p className="mt-2 text-sm text-secondary">
                                            <span className="font-medium text-primary">{tr("projectPrefix")}</span> {proj}
                                        </p>
                                    ) : null}
                                    {dateStr ? (
                                        <p className="mt-2 text-xs text-tertiary">
                                            {tr("datePrefix")} {dateStr}
                                        </p>
                                    ) : null}
                                    {actionsEnabled ? (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <Button
                                                color="primary"
                                                size="sm"
                                                isDisabled={patch.isPending}
                                                onClick={() => onPatch(id, "accept")}
                                            >
                                                {tr("actionAccept")}
                                            </Button>
                                            <Button
                                                color="secondary"
                                                size="sm"
                                                isDisabled={patch.isPending}
                                                onClick={() => onPatch(id, "reject")}
                                            >
                                                {tr("actionReject")}
                                            </Button>
                                            <Button
                                                color="secondary"
                                                size="sm"
                                                isDisabled={patch.isPending}
                                                onClick={() => onPatch(id, "progress", tr("transferRhNote"))}
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
