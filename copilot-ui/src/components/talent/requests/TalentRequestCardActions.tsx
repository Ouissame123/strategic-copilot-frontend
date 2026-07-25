import { ArrowRight, Check, Loader2, X } from "lucide-react";
import {
    isAcceptedStatus,
    isDoneStatus,
    isPendingStatus,
    isRejectedStatus,
    isTransferredStatus,
    normalizeRequestStatusKey,
} from "@/components/talent/requests/talent-request-ui";
import type { ManagerTalentRequestStatusPatch } from "@/types/talent-requests";
import { cx } from "@/utils/cx";

type TalentRequestCardActionsLabels = {
    accept: string;
    reject: string;
    transferRh: string;
    reconsider: string;
    accepted: string;
    rejected: string;
    transferredRh: string;
};

type TalentRequestCardActionsProps = {
    requestId: string;
    status: string;
    actioningId: string | null;
    onAction: (requestId: string, action: ManagerTalentRequestStatusPatch) => void;
    labels: TalentRequestCardActionsLabels;
};

export function TalentRequestCardActions({
    requestId,
    status,
    actioningId,
    onAction,
    labels,
}: TalentRequestCardActionsProps) {
    const normalized = normalizeRequestStatusKey(status);
    const isActioning = actioningId === requestId;
    const disabled = Boolean(actioningId);

    if (isDoneStatus(normalized)) return null;

    if (isTransferredStatus(normalized)) {
        return (
            <p className="mt-3 flex items-center gap-1 text-xs text-tertiary">
                <ArrowRight size={13} aria-hidden />
                {labels.transferredRh}
            </p>
        );
    }

    return (
        <div className="mt-3 flex flex-wrap items-center gap-2">
            {isPendingStatus(normalized) ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onAction(requestId, "accepted")}
                    className={cx(
                        "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
                        isActioning
                            ? "cursor-not-allowed bg-emerald-100 text-emerald-900"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                >
                    {isActioning ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Check size={13} aria-hidden />}
                    {labels.accept}
                </button>
            ) : null}

            {isAcceptedStatus(normalized) ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Check size={13} aria-hidden />
                    {labels.accepted}
                </span>
            ) : null}

            {isPendingStatus(normalized) || isAcceptedStatus(normalized) ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onAction(requestId, "rejected")}
                    className={cx(
                        "inline-flex items-center gap-1 rounded-md border border-rose-500 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-rose-950/30",
                        isAcceptedStatus(normalized) && "px-2 py-1",
                    )}
                >
                    <X size={13} aria-hidden />
                    {labels.reject}
                </button>
            ) : null}

            {isRejectedStatus(normalized) ? (
                <>
                    <span className="text-xs font-medium text-rose-600">{labels.rejected}</span>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onAction(requestId, "pending")}
                        className="inline-flex items-center gap-1 rounded-md border border-primary-500 px-2.5 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-primary-300 dark:hover:bg-primary-950/30"
                    >
                        {labels.reconsider}
                    </button>
                </>
            ) : null}

            {isPendingStatus(normalized) ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onAction(requestId, "transferred_to_hr")}
                    className="inline-flex items-center gap-1 rounded-md border border-secondary px-2.5 py-1.5 text-xs text-secondary transition hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <ArrowRight size={13} aria-hidden />
                    {labels.transferRh}
                </button>
            ) : null}
        </div>
    );
}
