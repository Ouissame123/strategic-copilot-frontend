import { useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import {
    RH_ALERT_ERROR,
    RH_BTN_SECONDARY,
    RH_MODAL_OVERLAY,
    RH_MODAL_PANEL,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    WS_MODAL_HEADER,
    WS_TEXT_FAINT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type DeleteAccountTarget = {
    id: string;
    name: string;
    email: string;
    kind: "staff" | "talent";
};

type DeleteAccountConfirmModalProps = {
    open: boolean;
    target: DeleteAccountTarget | null;
    onClose: () => void;
    onConfirm: (target: DeleteAccountTarget) => Promise<void>;
};

export function DeleteAccountConfirmModal({ open, target, onClose, onConfirm }: DeleteAccountConfirmModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!open || !target) return null;

    const handleClose = () => {
        if (submitting) return;
        setError(null);
        onClose();
    };

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await onConfirm(target);
            setError(null);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Impossible de supprimer le compte.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <button
                type="button"
                className={cx("absolute inset-0", RH_MODAL_OVERLAY)}
                aria-label="Fermer"
                disabled={submitting}
                onClick={handleClose}
            />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-account-title"
                className={cx("relative w-full max-w-md overflow-hidden", RH_MODAL_PANEL)}
            >
                <div className={cx("flex items-start justify-between px-5 py-4", WS_MODAL_HEADER)}>
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
                            <Trash2 size={20} aria-hidden />
                        </span>
                        <div>
                            <h2 id="delete-account-title" className={cx("text-lg font-semibold", RH_TEXT_PRIMARY)}>
                                Supprimer le compte
                            </h2>
                            <p className={cx("text-xs", RH_TEXT_MUTED)}>Cette action est irréversible.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className={cx("rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800", WS_TEXT_FAINT)}
                        aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900 dark:bg-amber-950/30">
                        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                        <div className="text-sm">
                            <p className={cx("font-medium", RH_TEXT_PRIMARY)}>{target.name}</p>
                            <p className={cx("mt-0.5", RH_TEXT_MUTED)}>{target.email}</p>
                        </div>
                    </div>

                    {error ? <p className={cx("rounded-lg px-3 py-2 text-sm", RH_ALERT_ERROR)}>{error}</p> : null}

                    <div className="flex justify-end gap-2">
                        <button type="button" className={RH_BTN_SECONDARY} disabled={submitting} onClick={handleClose}>
                            Annuler
                        </button>
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => void handleConfirm()}
                            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Supprimer"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
