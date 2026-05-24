/**
 * Confirmation désactivation talent — DELETE /webhook/wf-rh-talents-delete-v1/rh/talents/:id.
 */
import { useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { deleteRhTalent, mapRhTalentDeleteError } from "@/api/rh-talents.api";
import {
    RH_ALERT_ERROR,
    RH_BTN_SECONDARY,
    RH_MODAL_OVERLAY,
    RH_MODAL_PANEL,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TEXT_SECONDARY,
    WS_MODAL_HEADER,
    WS_TEXT_FAINT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type DeleteTalentModalProps = {
    open: boolean;
    talentId: string | null;
    talentName: string;
    onClose: () => void;
    apiBase?: string;
    token?: string;
    onDeleted?: () => void;
};

export function DeleteTalentModal({
    open,
    talentId,
    talentName,
    onClose,
    apiBase,
    token,
    onDeleted,
}: DeleteTalentModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!open || !talentId) return null;

    const handleClose = () => {
        if (submitting) return;
        setError(null);
        onClose();
    };

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await deleteRhTalent(talentId, { apiBase, token });
            setError(null);
            onDeleted?.();
            onClose();
        } catch (err) {
            setError(mapRhTalentDeleteError(err));
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
                aria-labelledby="delete-talent-title"
                aria-describedby="delete-talent-desc"
                className={cx("relative w-full max-w-md overflow-hidden", RH_MODAL_PANEL)}
            >
                <div className={cx("flex items-start justify-between px-5 py-4", WS_MODAL_HEADER)}>
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
                            <Trash2 size={20} aria-hidden />
                        </span>
                        <div>
                            <h2 id="delete-talent-title" className={cx("text-lg font-semibold", RH_TEXT_PRIMARY)}>
                                Désactiver le talent
                            </h2>
                            <p id="delete-talent-desc" className={cx("text-xs", RH_TEXT_MUTED)}>
                                Le profil passera au statut <strong>inactif</strong> (suppression logique).
                            </p>
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

                <div className="px-5 py-4">
                    <p className={cx("text-sm", RH_TEXT_SECONDARY)}>
                        Confirmer la désactivation de{" "}
                        <span className={cx("font-semibold", RH_TEXT_PRIMARY)}>{talentName}</span> ?
                    </p>
                    <p className={cx("mt-2 text-xs", RH_TEXT_MUTED)}>
                        Cette action est réversible côté RH en réactivant le talent si votre workflow le permet.
                    </p>

                    {error ? (
                        <div className={cx("mt-4 flex items-start gap-2 px-3 py-2", RH_ALERT_ERROR)} role="alert">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                            <span>{error}</span>
                        </div>
                    ) : null}
                </div>

                <div className={cx("flex flex-wrap justify-end gap-2 border-t px-5 py-4", WS_MODAL_HEADER)}>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className={cx("rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50", RH_BTN_SECONDARY)}
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleConfirm()}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" aria-hidden />
                                Suppression…
                            </>
                        ) : (
                            <>
                                <Trash2 size={16} aria-hidden />
                                Désactiver
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
