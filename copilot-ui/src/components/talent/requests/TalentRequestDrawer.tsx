import { useEffect, useState } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/ui/ErrorState";
import {
    useCancelTalentRequest,
    useDeleteTalentRequest,
    useTalentRequestDetail,
} from "@/hooks/useTalentRequests";
import { formatRelativeTimeFr } from "@/lib/rh-request-display";
import type { TalentRequest } from "@/types/talent-requests";
import { cx } from "@/utils/cx";
import {
    PRIORITY_TONES,
    STATUS_TONES,
    TYPE_TONES,
    badgeToneClass,
    formatPayloadEntries,
    isDecidedStatus,
} from "./talent-request-ui";

type TalentRequestDrawerProps = {
    open: boolean;
    requestId: string | null;
    listRow?: TalentRequest | null;
    onClose: () => void;
};

function TimelineStep({
    label,
    date,
    done,
    isLast,
}: {
    label: string;
    date: string | null | undefined;
    done: boolean;
    isLast?: boolean;
}) {
    if (!date && !done) return null;
    return (
        <li className="relative flex gap-3 pb-4">
            {!isLast ? <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-secondary" aria-hidden /> : null}
            <span className="relative z-10 mt-0.5 shrink-0 text-tertiary">
                {done ? <CheckCircle2 className="size-[22px] text-emerald-600" /> : <Circle className="size-[22px]" />}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary">{label}</p>
                {date ? <p className="mt-0.5 text-xs text-tertiary">{formatRelativeTimeFr(date)}</p> : null}
            </div>
        </li>
    );
}

export function TalentRequestDrawer({ open, requestId, listRow, onClose }: TalentRequestDrawerProps) {
    const detailQuery = useTalentRequestDetail(open && requestId ? requestId : null);
    const cancelMutation = useCancelTalentRequest();
    const deleteMutation = useDeleteTalentRequest();
    const [confirmDelete, setConfirmDelete] = useState(false);

    const request = detailQuery.data ?? listRow ?? null;

    useEffect(() => {
        if (!open) setConfirmDelete(false);
    }, [open, requestId]);

    if (!open || !requestId) return null;

    const payloadEntries = request ? formatPayloadEntries(request.payload) : [];
    const showDecision = request ? isDecidedStatus(request.status) && (request.decision_reason || request.decided_by_name) : false;
    const canCancel = request?.can_cancel === true;
    const canDelete = request?.can_delete === true;

    const handleCancel = () => {
        if (!requestId) return;
        cancelMutation.mutate(requestId, {
            onSuccess: () => {
                void detailQuery.refetch();
            },
        });
    };

    const handleDelete = () => {
        if (!requestId) return;
        deleteMutation.mutate(requestId, {
            onSuccess: () => {
                setConfirmDelete(false);
                onClose();
            },
        });
    };

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px]"
                aria-label="Fermer"
                onClick={onClose}
            />
            <aside
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[480px] flex-col border-l border-secondary bg-primary shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="talent-request-drawer-title"
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap gap-1.5">
                            {request?.request_type_label ? (
                                <span className={badgeToneClass(TYPE_TONES[request.request_type])}>{request.request_type_label}</span>
                            ) : null}
                            {request?.status_label ? (
                                <span className={badgeToneClass(STATUS_TONES[request.status])}>{request.status_label}</span>
                            ) : null}
                            {request?.priority === "urgent" || request?.priority === "high" ? (
                                <span className={badgeToneClass(PRIORITY_TONES[request.priority])}>
                                    {request.priority === "urgent" ? "Urgent" : "Haute"}
                                </span>
                            ) : null}
                        </div>
                        <h2 id="talent-request-drawer-title" className="line-clamp-2 text-base font-semibold text-primary">
                            {request?.title ?? "Demande"}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-tertiary transition hover:bg-secondary_subtle hover:text-primary"
                        aria-label="Fermer"
                    >
                        <X className="size-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    {detailQuery.isLoading && !request ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary" />
                            ))}
                        </div>
                    ) : null}

                    {detailQuery.isError && !request ? (
                        <ErrorState
                            title="Détail indisponible"
                            message="Impossible de charger cette demande."
                            detail={detailQuery.error instanceof Error ? detailQuery.error.message : String(detailQuery.error)}
                            onRetry={() => void detailQuery.refetch()}
                        />
                    ) : null}

                    {request ? (
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Détail</h3>
                                <dl className="mt-3 space-y-3 text-sm">
                                    {request.description ? (
                                        <div>
                                            <dt className="text-tertiary">Description</dt>
                                            <dd className="mt-0.5 whitespace-pre-wrap text-secondary">{request.description}</dd>
                                        </div>
                                    ) : null}
                                    {payloadEntries.length > 0 ? (
                                        <div>
                                            <dt className="text-tertiary">Informations complémentaires</dt>
                                            <dd className="mt-2 space-y-2">
                                                {payloadEntries.map((entry) => (
                                                    <div
                                                        key={entry.key}
                                                        className="flex items-start justify-between gap-3 rounded-lg bg-secondary_subtle px-3 py-2"
                                                    >
                                                        <span className="text-tertiary">{entry.key}</span>
                                                        <span className="text-right font-medium text-primary">{entry.value}</span>
                                                    </div>
                                                ))}
                                            </dd>
                                        </div>
                                    ) : null}
                                    {request.manager_name ? (
                                        <div>
                                            <dt className="text-tertiary">Manager</dt>
                                            <dd className="mt-0.5 text-secondary">{request.manager_name}</dd>
                                        </div>
                                    ) : null}
                                    {request.created_at ? (
                                        <div>
                                            <dt className="text-tertiary">Créée</dt>
                                            <dd className="mt-0.5 text-secondary">{formatRelativeTimeFr(request.created_at)}</dd>
                                        </div>
                                    ) : null}
                                    {request.updated_at ? (
                                        <div>
                                            <dt className="text-tertiary">Mise à jour</dt>
                                            <dd className="mt-0.5 text-secondary">{formatRelativeTimeFr(request.updated_at)}</dd>
                                        </div>
                                    ) : null}
                                </dl>
                            </section>

                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Workflow</h3>
                                <ol className="mt-3">
                                    <TimelineStep label="Demande créée" date={request.created_at} done={Boolean(request.created_at)} />
                                    <TimelineStep
                                        label="Transférée aux RH"
                                        date={request.hr_transferred_at}
                                        done={Boolean(request.hr_transferred_at)}
                                    />
                                    <TimelineStep
                                        label="Décision prise"
                                        date={request.decided_at}
                                        done={Boolean(request.decided_at)}
                                        isLast
                                    />
                                </ol>
                            </section>

                            {showDecision ? (
                                <section>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Décision</h3>
                                    <div className="mt-3 rounded-xl border border-secondary bg-secondary_subtle/50 p-4 text-sm">
                                        {request.decided_by_name ? (
                                            <p className="font-medium text-primary">
                                                {request.decided_by_name}
                                                {request.decided_by_role ? (
                                                    <span className="font-normal text-tertiary"> · {request.decided_by_role}</span>
                                                ) : null}
                                            </p>
                                        ) : null}
                                        {request.decision_reason ? (
                                            <p className={cx("text-secondary", request.decided_by_name && "mt-2")}>{request.decision_reason}</p>
                                        ) : null}
                                    </div>
                                </section>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {(canCancel || canDelete) && request ? (
                    <footer className="shrink-0 border-t border-secondary px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                            {canCancel ? (
                                <Button
                                    type="button"
                                    color="secondary"
                                    isLoading={cancelMutation.isPending}
                                    onClick={handleCancel}
                                >
                                    Annuler la demande
                                </Button>
                            ) : null}
                            {canDelete ? (
                                <Button type="button" color="primary-destructive" onClick={() => setConfirmDelete(true)}>
                                    Supprimer
                                </Button>
                            ) : null}
                        </div>
                    </footer>
                ) : null}
            </aside>

            <ConfirmDialog
                isOpen={confirmDelete}
                onOpenChange={setConfirmDelete}
                title="Supprimer cette demande ?"
                body="Cette action est définitive. La demande sera retirée de votre historique."
                confirmLabel="Supprimer"
                cancelLabel="Annuler"
                tone="danger"
                isConfirmLoading={deleteMutation.isPending}
                onConfirm={handleDelete}
            />
        </>
    );
}
