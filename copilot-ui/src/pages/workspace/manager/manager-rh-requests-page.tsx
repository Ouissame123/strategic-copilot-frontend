import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { Plus } from "@untitledui/icons";
import type { PostRhActionBody, RhActionRequestType } from "@/api/rh-actions.api";
import { ApiError } from "@/api/errors";
import { getManagerWorkspaceProjects, parseManagerWorkspaceProjectsResponse } from "@/api/workspace-manager.api";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { PageHero } from "@/components/layout/PageHero";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePatchRhActionMutation, usePostRhActionMutation, useRhActionsListQuery } from "@/hooks/use-rh-actions-query";
import { useToast } from "@/providers/toast-provider";
import { rowsFromRhActionsPayload } from "@/utils/rh-actions-list";
import { cx } from "@/utils/cx";

type KpiBucket = "pending" | "accepted" | "in_progress" | "done" | "rejected";
type StatusFilter = "all" | KpiBucket;

const REQUEST_TYPE_ORDER: RhActionRequestType[] = ["recruitment", "reallocation", "training", "overload", "skill_gap"];

const PRIORITIES: { value: NonNullable<PostRhActionBody["priority"]>; key: string }[] = [
    { value: "urgent", key: "priorityUrgent" },
    { value: "normal", key: "priorityNormal" },
    { value: "low", key: "priorityLow" },
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Agrégation affichage KPI — heuristique sur les libellés renvoyés par l’API (inchangé côté backend). */
function kpiBucket(raw: unknown): KpiBucket {
    const s = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (!s) return "pending";
    if (s.includes("reject") || s.includes("refus") || s.includes("declin") || s.includes("cancel")) return "rejected";
    if (s.includes("done") || s.includes("closed") || s.includes("completed") || s.includes("termin") || s === "resolved")
        return "done";
    if (s.includes("progress") || s.includes("cours") || s.includes("processing") || s.includes("assigned") || s.includes("trait"))
        return "in_progress";
    if (s.includes("accept") || s.includes("approved") || s.includes("valid")) return "accepted";
    if (s.includes("pend") || s.includes("attente") || s === "open" || s === "submitted" || s === "new" || s === "draft") return "pending";
    return "pending";
}

function looksLikeUuid(s: string): boolean {
    return UUID_REGEX.test(s.trim());
}

function primaryMessage(row: Record<string, unknown>): string {
    return String(row.message ?? row.body ?? row.description ?? "").trim();
}

/** Titre carte : champs métier, sinon extrait du message ; jamais d’UUID. */
function businessTitle(row: Record<string, unknown>, tr: (k: string) => string): string {
    const titleKeys = ["title", "subject", "summary", "request_title", "label", "name"] as const;
    for (const k of titleKeys) {
        const v = row[k as string];
        if (typeof v !== "string") continue;
        const t = v.trim();
        if (!t || looksLikeUuid(t)) continue;
        return t;
    }
    const msg = primaryMessage(row);
    if (msg && !looksLikeUuid(msg)) {
        return msg.length > 100 ? `${msg.slice(0, 100)}…` : msg;
    }
    return tr("defaultRequestTitle");
}

/** Description affichée (message complet ou libellé si vide). */
function cardDescription(row: Record<string, unknown>, tr: (k: string) => string): string {
    const msg = primaryMessage(row);
    if (!msg || looksLikeUuid(msg)) return tr("noDescriptionProvided");
    return msg;
}

function formatSentOnDate(ts: unknown, locale: string): string {
    if (ts == null || String(ts).trim() === "") return "";
    const d = new Date(String(ts));
    if (Number.isNaN(d.getTime())) return "";
    const loc = locale.startsWith("ar") ? "ar-MA" : locale.startsWith("en") ? "en-GB" : "fr-FR";
    return d.toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" });
}

function rowPriorityBucket(raw: unknown): "urgent" | "normal" | "low" | "" {
    const s = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (s.includes("urgent") || s === "high" || s.includes("haute")) return "urgent";
    if (s.includes("faible") || s.includes("low") || s.includes("basse")) return "low";
    if (s.includes("normal") || s === "medium" || s.includes("moyenne")) return "normal";
    if (!s) return "";
    return "normal";
}

function priorityBadgeProps(
    raw: unknown,
    tr: (k: string) => string,
): { label: string; color: "error" | "warning" | "gray" } {
    const b = rowPriorityBucket(raw);
    if (b === "urgent") return { label: tr("priorityUrgent"), color: "error" };
    if (b === "low") return { label: tr("priorityLow"), color: "gray" };
    if (b === "normal") return { label: tr("priorityNormal"), color: "warning" };
    return { label: tr("priorityDash"), color: "gray" };
}

function kpiStatusBadge(
    bucket: KpiBucket,
    tr: (k: string) => string,
): { label: string; color: "warning" | "success" | "brand" | "gray" | "error" } {
    if (bucket === "pending") return { label: tr("statusPending"), color: "warning" };
    if (bucket === "accepted") return { label: tr("statusAccepted"), color: "success" };
    if (bucket === "in_progress") return { label: tr("statusInProgress"), color: "brand" };
    if (bucket === "done") return { label: tr("statusDone"), color: "gray" };
    return { label: tr("statusRejected"), color: "error" };
}

function resolveRhActionId(row: Record<string, unknown>): string {
    const candidates = [row.id, row.action_id, row.rh_action_id, row.request_id];
    for (const value of candidates) {
        const id = String(value ?? "").trim();
        if (UUID_REGEX.test(id)) return id;
    }
    return "";
}

function typeTranslationKey(t: RhActionRequestType): string {
    const map: Record<RhActionRequestType, string> = {
        recruitment: "typeRecruitment",
        reallocation: "typeReallocation",
        training: "typeTraining",
        overload: "typeOverload",
        skill_gap: "typeSkillGap",
    };
    return map[t] ?? "typeSkillGap";
}

export default function ManagerRhRequestsPage() {
    const { t, i18n } = useTranslation(["common", "nav"]);
    const { push: toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const tr = useCallback((key: string) => t(`managerWorkspace.rhRequests.${key}`), [t]);

    useCopilotPage("none", t("nav:managerNavRhRequests"));

    const q = useRhActionsListQuery();
    const postRh = usePostRhActionMutation();
    const patchRh = usePatchRhActionMutation();

    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
    const [filterType, setFilterType] = useState<RhActionRequestType | "">("");
    const [filterPriority, setFilterPriority] = useState<"" | "urgent" | "normal" | "low">("");

    const [type, setType] = useState<RhActionRequestType | "">("");
    const [projectId, setProjectId] = useState("");
    const [priority, setPriority] = useState<NonNullable<PostRhActionBody["priority"]> | "">("");
    const [description, setDescription] = useState("");

    const rows = useMemo(() => rowsFromRhActionsPayload(q.data), [q.data]);

    const managerProjectsQuery = useQuery({
        queryKey: ["manager-projects-select"],
        queryFn: async () => {
            const raw = await getManagerWorkspaceProjects({ page: 1, limit: 50 });
            return parseManagerWorkspaceProjectsResponse(raw);
        },
        enabled: true,
    });

    const projectOptions = useMemo(() => {
        const items = managerProjectsQuery.data?.items ?? [];
        return items
            .map((item, idx) => {
                const id = String(item.id ?? item.project_id ?? "").trim();
                if (!id) return null;
                const name = String(item.name ?? item.project_name ?? `Projet ${idx + 1}`).trim();
                const code = String(item.project_code ?? "").trim();
                return { id, label: `${name} · ${code || id.slice(0, 8)}` };
            })
            .filter((x): x is { id: string; label: string } => x != null);
    }, [managerProjectsQuery.data?.items]);

    const kpiCounts = useMemo(() => {
        const counts: Record<KpiBucket, number> = {
            pending: 0,
            accepted: 0,
            in_progress: 0,
            done: 0,
            rejected: 0,
        };
        for (const row of rows) {
            counts[kpiBucket(row.status ?? row.state)] += 1;
        }
        return counts;
    }, [rows]);

    const filtered = useMemo(() => {
        return rows.filter((row) => {
            const bucket = kpiBucket(row.status ?? row.state);
            if (filterStatus !== "all" && bucket !== filterStatus) return false;
            const rowType = String(row.type ?? "").trim() as RhActionRequestType | "";
            if (filterType && rowType !== filterType) return false;
            const pb = rowPriorityBucket(row.priority);
            if (filterPriority && pb !== filterPriority) return false;
            return true;
        });
    }, [rows, filterStatus, filterType, filterPriority]);

    const sortedFiltered = useMemo(() => {
        const pickTs = (row: Record<string, unknown> & { id: string }) => {
            const raw = row.created_at ?? row.sent_at ?? row.updated_at ?? row.submitted_at;
            const n = new Date(String(raw ?? "")).getTime();
            return Number.isFinite(n) ? n : 0;
        };
        return [...filtered].sort((a, b) => pickTs(b) - pickTs(a));
    }, [filtered]);

    const intentOpenedRef = useRef(false);
    useEffect(() => {
        if (intentOpenedRef.current) return;
        if (searchParams.get("intent") === "onboarding") {
            intentOpenedRef.current = true;
            setRequestModalOpen(true);
            const next = new URLSearchParams(searchParams);
            next.delete("intent");
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const resetForm = () => {
        setType("");
        setProjectId("");
        setPriority("");
        setDescription("");
    };

    const submit = async () => {
        if (!type) {
            toast(t("managerWorkspace.rhRequests.toastPickType"), "error");
            return;
        }
        if (projectId.trim() && !UUID_REGEX.test(projectId.trim())) {
            toast(t("managerWorkspace.rhRequests.toastInvalidUuid"), "error");
            return;
        }
        if (!priority) {
            toast(t("managerWorkspace.rhRequests.toastPickPriority"), "error");
            return;
        }
        if (!description.trim()) {
            toast(t("managerWorkspace.rhRequests.toastDescription"), "error");
            return;
        }
        const body: PostRhActionBody = {
            type,
            message: description.trim(),
            priority,
        };
        if (projectId.trim()) body.project_id = projectId.trim();
        try {
            await postRh.mutateAsync(body);
            resetForm();
            setRequestModalOpen(false);
            toast(t("managerWorkspace.rhRequests.toastSubmitSuccess"), "success", 7000);
        } catch (e) {
            toast(e instanceof Error ? e.message : t("managerWorkspace.rhRequests.toastSubmitFail"), "error");
        }
    };

    const cancelRequest = async (request: Record<string, unknown> & { id: string }) => {
        const actionId = resolveRhActionId(request);
        if (!UUID_REGEX.test(actionId)) {
            toast(t("managerWorkspace.rhRequests.toastInvalidCancelId"), "error");
            return;
        }
        const runPatch = async (status: "cancelled" | "done" | "rejected") =>
            patchRh.mutateAsync({
                id: actionId,
                body: { status },
            });
        try {
            let response = await runPatch("cancelled");
            let root = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
            let successFlag = String(root.status ?? "").trim().toLowerCase() === "success";

            if (!successFlag) {
                response = await runPatch("done");
                root = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
                successFlag = String(root.status ?? "").trim().toLowerCase() === "success";
            }
            if (!successFlag) {
                response = await runPatch("rejected");
                root = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
                successFlag = String(root.status ?? "").trim().toLowerCase() === "success";
            }
            const payload = root.item && typeof root.item === "object" ? (root.item as Record<string, unknown>) : undefined;
            if (!successFlag) {
                throw new Error(t("managerWorkspace.rhRequests.toastBackendNoConfirm"));
            }
            const nextStatus = String(payload?.status ?? "").trim().toLowerCase();
            await q.refetch();
            if (nextStatus === "done") toast(t("managerWorkspace.rhRequests.toastDone"), "success");
            else toast(t("managerWorkspace.rhRequests.toastCancelled"), "success");
        } catch (e) {
            const details =
                e instanceof ApiError && e.payload != null ? ` [id=${actionId}] ${JSON.stringify(e.payload)}` : ` [id=${actionId}]`;
            toast(
                t("managerWorkspace.rhRequests.toastCancelFail", {
                    msg: e instanceof Error ? e.message : t("managerWorkspace.rhRequests.toastCancelFailDefault"),
                    details,
                }),
                "error",
            );
        }
    };

    const openNewRequest = () => {
        setRequestModalOpen(true);
    };

    const kpiItems: { id: KpiBucket; labelKey: string }[] = [
        { id: "pending", labelKey: "kpiPending" },
        { id: "accepted", labelKey: "kpiAccepted" },
        { id: "in_progress", labelKey: "kpiInProgress" },
        { id: "done", labelKey: "kpiDone" },
        { id: "rejected", labelKey: "kpiRejected" },
    ];

    const hasFilters = filterStatus !== "all" || filterType !== "" || filterPriority !== "";

    const resetFilters = () => {
        setFilterStatus("all");
        setFilterType("");
        setFilterPriority("");
    };

    const typeOptionsForForm = useMemo(
        () => REQUEST_TYPE_ORDER.map((value) => ({ value, label: tr(typeTranslationKey(value)) })),
        [tr],
    );

    const rowTypeLabel = useCallback(
        (raw: unknown) => {
            const s = String(raw ?? "").trim() as RhActionRequestType;
            if (REQUEST_TYPE_ORDER.includes(s)) return tr(typeTranslationKey(s));
            return s || tr("statusUnknown");
        },
        [tr],
    );

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={tr("shellTitle")}
            description={false}
            omitHeader
        >
            <div className="space-y-6 lg:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        to="/workspace/manager/team"
                        className="text-sm font-semibold text-brand-secondary hover:text-brand-secondary_hover hover:underline"
                    >
                        {tr("backToTeam")}
                    </Link>
                </div>

                <PageHero
                    eyebrow={tr("heroEyebrow")}
                    title={tr("heroTitle")}
                    subtitle={tr("heroSubtitle")}
                    badge={t("workspaceRoles.manager")}
                    actions={
                        <Button color="primary" size="md" iconLeading={Plus} onClick={openNewRequest}>
                            {tr("primaryCta")}
                        </Button>
                    }
                    metrics={
                        rows.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                {kpiItems.map(({ id, labelKey }) => {
                                    const count = kpiCounts[id];
                                    const active = filterStatus === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setFilterStatus((prev) => (prev === id ? "all" : id))}
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
                        ) : null
                    }
                />

                {rows.length > 0 ? (
                    <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
                            <div className="grid flex-1 gap-3 sm:grid-cols-3">
                                <NativeSelect
                                    label={tr("filterType")}
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as RhActionRequestType | "")}
                                    options={[
                                        { label: tr("filterAll"), value: "" },
                                        ...typeOptionsForForm.map((x) => ({ label: x.label, value: x.value })),
                                    ]}
                                />
                                <NativeSelect
                                    label={tr("filterStatus")}
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
                                    options={[
                                        { label: tr("filterAll"), value: "all" },
                                        ...kpiItems.map(({ id, labelKey }) => ({ label: tr(labelKey), value: id })),
                                    ]}
                                />
                                <NativeSelect
                                    label={tr("filterPriority")}
                                    value={filterPriority}
                                    onChange={(e) => setFilterPriority(e.target.value as "" | "urgent" | "normal" | "low")}
                                    options={[
                                        { label: tr("filterAll"), value: "" },
                                        ...PRIORITIES.map((p) => ({ label: tr(p.key), value: p.value })),
                                    ]}
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {hasFilters ? (
                                    <Button color="secondary" size="sm" onClick={resetFilters}>
                                        {tr("resetFilters")}
                                    </Button>
                                ) : null}
                                <Button color="secondary" size="sm" onClick={() => void q.refetch()} isLoading={q.isFetching}>
                                    {tr("refresh")}
                                </Button>
                            </div>
                        </div>
                    </section>
                ) : null}

                {q.isLoading ? <p className="text-sm text-tertiary">{tr("loadingList")}</p> : null}
                {q.error ? (
                    <p className="text-sm text-error-primary">{q.error instanceof Error ? q.error.message : String(q.error)}</p>
                ) : null}

                {!q.isLoading && !q.error && rows.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-secondary bg-secondary_subtle/30 p-10 text-center shadow-xs">
                        <p className="text-sm font-medium text-primary">{tr("emptyTitle")}</p>
                        <div className="mt-4 flex justify-center">
                            <Button color="primary" size="md" iconLeading={Plus} onClick={openNewRequest}>
                                {tr("emptyCta")}
                            </Button>
                        </div>
                    </section>
                ) : null}

                {!q.isLoading && rows.length > 0 && filtered.length === 0 ? (
                    <p className="text-sm text-tertiary">{tr("emptyFiltered")}</p>
                ) : null}

                {!q.isLoading && sortedFiltered.length > 0 ? (
                    <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80 sm:p-5">
                        <h2 className="text-sm font-semibold text-primary">{tr("requestsSectionTitle")}</h2>
                        <ul className="mt-4 space-y-4">
                            {sortedFiltered.map((row) => {
                                const bucket = kpiBucket(row.status ?? row.state);
                                const sb = kpiStatusBadge(bucket, tr);
                                const pb = priorityBadgeProps(row.priority, tr);
                                const sentAt = row.created_at ?? row.sent_at ?? row.updated_at ?? row.submitted_at;
                                const actionId = resolveRhActionId(row);
                                const title = businessTitle(row, tr);
                                const desc = cardDescription(row, tr);
                                const dateStr = formatSentOnDate(sentAt, i18n.language);
                                const showCancel = bucket === "pending" && Boolean(actionId);
                                return (
                                    <li
                                        key={`${row.id}-${String(row._row_index ?? "")}`}
                                        className="rounded-xl border border-secondary bg-secondary/15 p-4 shadow-xs ring-1 ring-secondary/60"
                                    >
                                        <p className="text-base font-semibold leading-snug text-primary">{title}</p>
                                        <p className="mt-2 text-sm text-secondary">
                                            <span className="font-medium text-primary">{tr("detailType")}</span>
                                            {" : "}
                                            {rowTypeLabel(row.type)}
                                        </p>
                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-secondary">{desc}</p>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <Badge type="pill-color" size="sm" color={pb.color}>
                                                {pb.label}
                                            </Badge>
                                            <Badge type="pill-color" size="sm" color={sb.color}>
                                                {sb.label}
                                            </Badge>
                                        </div>
                                        {dateStr ? (
                                            <p className="mt-3 text-xs text-tertiary">
                                                {t("managerWorkspace.rhRequests.sentOn", { date: dateStr })}
                                            </p>
                                        ) : null}
                                        {showCancel ? (
                                            <div className="mt-3">
                                                <Button
                                                    color="tertiary"
                                                    size="sm"
                                                    onClick={() => void cancelRequest(row)}
                                                    isLoading={patchRh.isPending}
                                                >
                                                    {tr("actionCancel")}
                                                </Button>
                                            </div>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ) : null}
            </div>

            <ModalOverlay isOpen={requestModalOpen} onOpenChange={(open) => !open && setRequestModalOpen(false)} isDismissable>
                <Modal>
                    <Dialog className="max-w-lg rounded-2xl border border-secondary bg-primary p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-primary">{tr("modalTitle")}</h2>
                        <div className="mt-4 space-y-4">
                            <NativeSelect
                                label={tr("fieldType")}
                                value={type}
                                onChange={(e) => setType(e.target.value as RhActionRequestType | "")}
                                options={[
                                    { label: tr("pickTypePlaceholder"), value: "" },
                                    ...typeOptionsForForm.map((x) => ({ label: x.label, value: x.value })),
                                ]}
                            />
                            <NativeSelect
                                label={tr("fieldProjectOptional")}
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                options={[
                                    { label: tr("noProjectOption"), value: "" },
                                    ...projectOptions.map((x) => ({ label: x.label, value: x.id })),
                                ]}
                            />
                            <NativeSelect
                                label={tr("fieldPriority")}
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as NonNullable<PostRhActionBody["priority"]> | "")}
                                options={[
                                    { label: tr("pickPriorityPlaceholder"), value: "" },
                                    ...PRIORITIES.map((p) => ({ label: tr(p.key), value: p.value })),
                                ]}
                            />
                            <label className="block text-sm">
                                <span className="mb-1 block font-medium text-secondary">{tr("fieldDescription")}</span>
                                <textarea
                                    className="min-h-[120px] w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-primary outline-none ring-brand-secondary focus:ring-2"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={tr("placeholderDescription")}
                                />
                            </label>
                        </div>
                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                            <Button color="secondary" size="md" onClick={() => setRequestModalOpen(false)}>
                                {tr("detailClose")}
                            </Button>
                            <Button color="primary" size="md" isLoading={postRh.isPending} onClick={() => void submit()}>
                                {tr("sendToRh")}
                            </Button>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>

        </WorkspacePageShell>
    );
}
