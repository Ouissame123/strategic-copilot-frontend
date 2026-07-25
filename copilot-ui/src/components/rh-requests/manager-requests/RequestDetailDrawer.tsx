import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Sparkles, X } from "lucide-react";
import { formatRhRequestMessage } from "@/components/rh-requests/formatRhRequestMessage";
import { Button } from "@/components/base/buttons/button";
import { AgentBadge } from "@/components/rh/inbox/AgentBadge";
import { AiReasoningBlock } from "@/components/rh/inbox/AiReasoningBlock";
import { StatusDot } from "@/components/rh/inbox/StatusDot";
import { classifySource } from "@/lib/classifySource";
import {
    formatProjectDisplay,
    formatRelativeTimeFr,
    getRequestTitle,
    getRequestTypeLabel,
} from "@/lib/rh-request-display";
import {
    mapRhRequestsDecisionError,
    useRhRequestDetailQuery,
    useRhRequestHistoryQuery,
    useRhRequestsDecision,
} from "@/hooks/use-rh-requests-decision";
import { readRhRequestField, readRhRequestProjectId, readRhRequestProjectName, rhRequestStatusToBucket } from "@/utils/rh-requests-decision";
import { cx } from "@/utils/cx";
import { stripLeadingSubjectPrefix } from "@/components/manager/rh-requests/rh-requests-utils";
import { RequestHistoryTimeline } from "./RequestHistoryTimeline";
import type { RhRequestRow } from "./RequestCard";

type RhDecisionChoice = "accept" | "reject" | "progress" | "done";

type RequestDetailDrawerProps = {
    open: boolean;
    requestId: string | null;
    initialTab?: "detail" | "history";
    listRow?: RhRequestRow | null;
    onClose: () => void;
    onDecisionComplete?: () => void;
};

function messageFromRow(row: Record<string, unknown>): string {
    const raw = String(row.message ?? row.description ?? "").trim();
    return stripLeadingSubjectPrefix(raw);
}

export function RequestDetailDrawer({
    open,
    requestId,
    initialTab = "detail",
    listRow,
    onClose,
    onDecisionComplete,
}: RequestDetailDrawerProps) {
    const [tab, setTab] = useState<"detail" | "history">(initialTab);
    const [note, setNote] = useState("");
    const [choice, setChoice] = useState<RhDecisionChoice>("accept");
    const [patchError, setPatchError] = useState<string | null>(null);

    const detailQuery = useRhRequestDetailQuery(requestId, { enabled: open && Boolean(requestId) });
    const historyQuery = useRhRequestHistoryQuery(requestId, {
        enabled: open && Boolean(requestId),
    });
    const decision = useRhRequestsDecision();

    const row = detailQuery.data ?? listRow;

    useEffect(() => {
        if (open) {
            setTab(initialTab);
            setNote("");
            setPatchError(null);
            setChoice("accept");
        }
    }, [open, requestId, initialTab]);

    if (!open || !requestId) return null;

    const title = row ? getRequestTitle(row) : "Demande";
    const historyCount = historyQuery.data?.count;

    const runDecision = async (id: string, selected: RhDecisionChoice) => {
        setPatchError(null);
        try {
            const msg = note.trim() || undefined;
            if (selected === "accept") await decision.acceptRequest(id, msg);
            else if (selected === "reject") {
                if (!note.trim()) {
                    setPatchError("Le motif de refus est obligatoire.");
                    return;
                }
                await decision.rejectRequest(id, note.trim());
            } else if (selected === "progress") await decision.setInProgress(id, msg);
            else if (selected === "done") await decision.markDone(id, msg);
            onDecisionComplete?.();
            onClose();
        } catch (err) {
            setPatchError(mapRhRequestsDecisionError(err));
        }
    };

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 animate-inbox-fade-in bg-black/30"
                aria-label="Fermer"
                onClick={onClose}
            />
            <aside
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[480px] flex-col border-l border-ws-border bg-ws-card shadow-lg animate-inbox-slide-in"
                role="dialog"
                aria-modal="true"
                aria-labelledby="rh-request-drawer-title"
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ws-border-subtle px-5 py-4">
                    <div className="min-w-0 flex-1 space-y-2">
                        {row ? <AgentBadge source={classifySource(row)} /> : null}
                        <h2 id="rh-request-drawer-title" className="line-clamp-2 text-sm font-semibold text-ws-primary">
                            {title}
                        </h2>
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

                <div className="flex shrink-0 gap-1 border-b border-secondary px-4">
                    <button
                        type="button"
                        onClick={() => setTab("detail")}
                        className={cx(
                            "border-b-2 px-3 py-2 text-sm font-medium transition",
                            tab === "detail"
                                ? "border-brand-secondary text-brand-secondary"
                                : "border-transparent text-tertiary hover:text-secondary",
                        )}
                    >
                        Détail
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("history")}
                        className={cx(
                            "border-b-2 px-3 py-2 text-sm font-medium transition",
                            tab === "history"
                                ? "border-brand-secondary text-brand-secondary"
                                : "border-transparent text-tertiary hover:text-secondary",
                        )}
                    >
                        Historique
                        {typeof historyCount === "number" && historyCount > 0 ? (
                            <span className="ml-1.5 text-xs opacity-60">({historyCount})</span>
                        ) : null}
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {tab === "detail" ? (
                        <RequestDetailPanel
                            row={row}
                            note={note}
                            onNoteChange={setNote}
                            choice={choice}
                            onChoiceChange={setChoice}
                            patchError={patchError}
                            isPending={decision.isPending}
                            isLoading={detailQuery.isPending && !row}
                            onConfirm={() => void runDecision(requestId, choice)}
                        />
                    ) : historyQuery.isPending ? (
                        <p className="p-4 text-sm text-tertiary">Chargement de l'historique…</p>
                    ) : historyQuery.error ? (
                        <p className="p-4 text-sm text-rose-700">{mapRhRequestsDecisionError(historyQuery.error)}</p>
                    ) : (
                        <RequestHistoryTimeline decisions={historyQuery.data?.decisions ?? []} />
                    )}
                </div>
            </aside>
        </>
    );
}

function RequestDetailPanel({
    row,
    note,
    onNoteChange,
    choice,
    onChoiceChange,
    patchError,
    isPending,
    isLoading,
    onConfirm,
}: {
    row: RhRequestRow | null | undefined;
    note: string;
    onNoteChange: (v: string) => void;
    choice: RhDecisionChoice;
    onChoiceChange: (v: RhDecisionChoice) => void;
    patchError: string | null;
    isPending: boolean;
    isLoading: boolean;
    onConfirm: () => void;
}) {
    if (isLoading || !row) {
        return <p className="p-4 text-sm text-tertiary">Chargement…</p>;
    }

    const bucket = rhRequestStatusToBucket(String(row.status ?? row.state ?? "")) ?? "pending";
    const type = String(row.type ?? "");
    const typeLabel = getRequestTypeLabel(type, readRhRequestField(row, ["type_label", "typeLabel"]) || null);
    const messageRaw = messageFromRow(row);
    const projectName = readRhRequestProjectName(row);
    const projectDisplay = formatProjectDisplay(projectName || null);
    const pid = readRhRequestProjectId(row);
    const created = String(row.created_at ?? row.createdAt ?? "");
    const responseText = readRhRequestField(row, ["response_message", "responseMessage", "reason"]);
    const showOrchestratorHint =
        Boolean(pid) && (choice === "accept" || choice === "done") && ["accept", "done"].includes(choice);
    const source = classifySource(row);
    const payload =
        row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
            ? (row.payload as Record<string, unknown>)
            : null;

    const canAcceptReject = bucket === "pending";
    const canProgress = bucket === "pending" || bucket === "accepted";
    const canDone = bucket === "pending" || bucket === "accepted" || bucket === "in_progress";

    const decisionOptions: { value: RhDecisionChoice; label: string; hint: string; show: boolean }[] = [
        { value: "accept", label: "Accepter", hint: "Valider la demande.", show: canAcceptReject },
        { value: "reject", label: "Rejeter", hint: "Refuser avec un motif obligatoire.", show: canAcceptReject },
        { value: "progress", label: "Mettre en cours", hint: "Prise en charge par les RH.", show: canProgress },
        { value: "done", label: "Terminer", hint: "Clôturer le traitement RH.", show: canDone },
    ];
    const visibleOptions = decisionOptions.filter((o) => o.show);
    const confirmDisabled = isPending || (choice === "reject" && !note.trim());

    return (
        <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
                <StatusDot status={row.status ?? row.state} statusLabel={row.status_label ?? row.statusLabel} />
                <span className="rounded border border-ws-border-subtle bg-ws-muted-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ws-secondary">
                    {typeLabel}
                </span>
            </div>

            <section className="rounded-lg border border-ws-border-subtle bg-ws-muted-surface/50 p-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ws-faint">Description</h3>
                <div className="mt-2 text-sm leading-relaxed text-ws-secondary">{formatRhRequestMessage(messageRaw)}</div>
            </section>

            {source !== "manager" ? <AiReasoningBlock source={source} payload={payload} /> : null}

            <dl className="grid gap-3 text-sm">
                <div>
                    <dt className="text-[11px] font-semibold uppercase text-tertiary">Projet</dt>
                    <dd className="mt-0.5 text-secondary">
                        {projectName && pid ? (
                            <Link
                                to={`/workspace/rh/projects/${encodeURIComponent(pid)}`}
                                className="font-medium text-brand-secondary underline-offset-2 hover:underline"
                            >
                                {projectDisplay}
                            </Link>
                        ) : projectName ? (
                            <span>{projectDisplay}</span>
                        ) : (
                            <span className="text-tertiary">Projet non renseigné</span>
                        )}
                    </dd>
                </div>
                <div>
                    <dt className="text-[11px] font-semibold uppercase text-tertiary">Créée</dt>
                    <dd className="mt-0.5 text-secondary">{formatRelativeTimeFr(created)}</dd>
                </div>
            </dl>

            {responseText ? (
                <div className="rounded-lg border border-secondary/80 bg-primary p-3 text-xs text-secondary">
                    <span className="font-semibold text-primary">Réponse RH :</span> {responseText}
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
                                    onChange={() => onChoiceChange(opt.value)}
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
                    {showOrchestratorHint ? (
                        <div
                            className="flex gap-2 rounded-lg border border-primary-200 bg-primary-50/80 p-3 text-xs text-primary-950 dark:border-primary-900 dark:bg-primary-950/30 dark:text-primary-100"
                            role="status"
                            aria-live="polite"
                        >
                            <Sparkles size={16} className="mt-0.5 shrink-0" aria-hidden />
                            <div>
                                <p className="font-semibold">Recalcul IA programmé</p>
                                <p className="mt-1 text-primary-900/90 dark:text-primary-100/90">
                                    Après validation, l&apos;IA recalculera le risque, les KPI et les matchings du
                                    projet <strong>{projectDisplay}</strong>. Mise à jour estimée en ~30s.
                                </p>
                            </div>
                        </div>
                    ) : null}
                    <Button className="w-full" color="primary" isDisabled={confirmDisabled} isLoading={isPending} onPress={onConfirm}>
                        Valider la décision
                    </Button>
                </section>
            ) : (
                <p className="rounded-lg border border-secondary/60 bg-secondary_subtle/40 p-3 text-xs text-secondary">
                    Cette demande est en statut final.
                </p>
            )}
        </div>
    );
}

/** Alias prompt — side panel Linear-style. */
export { RequestDetailDrawer as ActionSidePanel };
