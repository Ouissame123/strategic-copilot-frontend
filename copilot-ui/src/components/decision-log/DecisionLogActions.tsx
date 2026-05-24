import { Check, Eye, Loader2, RotateCcw } from "lucide-react";
import type { DecisionLogStatus } from "@/services/decisions.api";
import { cx } from "@/utils/cx";

type DecisionLogActionsProps = {
    status: DecisionLogStatus;
    statusUpdating?: boolean;
    deleting?: boolean;
    onViewDetail: () => void;
    onMarkHandled: () => void;
    onDismiss: () => void;
    onReopen: () => void;
    onDelete?: () => void;
};

export function DecisionLogActions({
    status,
    statusUpdating,
    deleting,
    onViewDetail,
    onMarkHandled,
    onDismiss,
    onReopen,
    onDelete,
}: DecisionLogActionsProps) {
    const pending = Boolean(statusUpdating || deleting);
    const isClosed = status === "handled" || status === "dismissed";

    return (
        <div className="flex flex-wrap gap-2">
            <button
                type="button"
                disabled={pending}
                onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-secondary/40 bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-secondary hover:bg-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Eye className="size-3.5" aria-hidden />
                Voir détail
            </button>
            {!isClosed ? (
                <>
                    <button
                        type="button"
                        disabled={pending}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkHandled();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-secondary px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {statusUpdating ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
                        Marquer traité
                    </button>
                    <button
                        type="button"
                        disabled={pending}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDismiss();
                        }}
                        className="rounded-lg border border-secondary px-3 py-1.5 text-xs font-medium text-tertiary hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Masquer
                    </button>
                </>
            ) : null}
            {isClosed ? (
                <button
                    type="button"
                    disabled={pending}
                    onClick={(e) => {
                        e.stopPropagation();
                        onReopen();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-secondary px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {statusUpdating ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RotateCcw className="size-3.5" aria-hidden />}
                    Réouvrir
                </button>
            ) : null}
            {onDelete ? (
                <button
                    type="button"
                    disabled={pending}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                    {deleting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                    Supprimer
                </button>
            ) : null}
        </div>
    );
}

export function decisionRowStatusClass(status: DecisionLogStatus): string {
    return cx(
        status === "handled" && "opacity-80",
        status === "dismissed" && "opacity-60",
    );
}
