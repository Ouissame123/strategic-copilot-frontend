import { Loader2, X } from "lucide-react";
import { resolveAssignmentManagerName } from "@/lib/rh-assignments-display";
import type { RhAssignmentRow } from "@/types/rh-assignments.types";
import {
    RH_BTN_SECONDARY,
    RH_MODAL_OVERLAY,
    RH_MODAL_PANEL,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type DeleteAssignmentModalProps = {
    open: boolean;
    assignment: RhAssignmentRow | null;
    submitting: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

export function DeleteAssignmentModal({
    open,
    assignment,
    submitting,
    onClose,
    onConfirm,
}: DeleteAssignmentModalProps) {
    if (!open || !assignment) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="presentation">
            <button type="button" className={cx("absolute inset-0", RH_MODAL_OVERLAY)} aria-label="Fermer" onClick={onClose} />
            <div className={cx("relative w-full max-w-md p-5", RH_MODAL_PANEL)} role="alertdialog" aria-modal="true">
                <div className="flex items-start justify-between gap-2">
                    <h3 className={cx("text-base font-bold", RH_TEXT_PRIMARY)}>Retirer l&apos;affectation</h3>
                    <button type="button" onClick={onClose} className={cx("rounded-lg p-1", RH_BTN_SECONDARY)} aria-label="Fermer">
                        <X size={16} aria-hidden />
                    </button>
                </div>
                <p className={cx("mt-3 text-sm leading-relaxed", RH_TEXT_MUTED)}>
                    Retirer le rattachement de <strong className={RH_TEXT_PRIMARY}>{assignment.talent_name ?? "ce talent"}</strong>{" "}
                    au manager <strong className={RH_TEXT_PRIMARY}>{resolveAssignmentManagerName(assignment)}</strong> ?
                </p>
                <div className="mt-5 flex gap-2">
                    <button type="button" onClick={onClose} className={cx("flex-1 px-3 py-2 text-sm font-semibold", RH_BTN_SECONDARY)}>
                        Annuler
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={onConfirm}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
                        Retirer
                    </button>
                </div>
            </div>
        </div>
    );
}
