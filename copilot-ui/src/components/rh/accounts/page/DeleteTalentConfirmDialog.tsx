import { AlertTriangle } from "lucide-react";
import { Heading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { useDeleteTalent } from "@/hooks/useRhAccounts";
import type { RhTalentAccount } from "@/types/rh-accounts.types";

type DeleteTalentConfirmDialogProps = {
    isOpen: boolean;
    talent: RhTalentAccount;
    onClose: () => void;
    onSuccess: () => void;
};

export function DeleteTalentConfirmDialog({ isOpen, talent, onClose, onSuccess }: DeleteTalentConfirmDialogProps) {
    const deleteTalent = useDeleteTalent();

    const handleClose = () => {
        if (deleteTalent.isPending) return;
        onClose();
    };

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && handleClose()} isDismissable={!deleteTalent.isPending}>
            <Modal>
                <Dialog className="w-full max-w-md p-4 sm:p-6">
                    <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            Désactiver le talent ?
                        </Heading>
                        <div className="mt-3 text-sm text-secondary">
                            <p>
                                Vous allez désactiver le talent <strong>{talent.name}</strong> ({talent.email}).
                            </p>
                            <div className="mt-3 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30">
                                <p className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-200">
                                    <AlertTriangle size={14} aria-hidden /> Effets en cascade :
                                </p>
                                <ul className="ml-5 list-disc space-y-0.5 text-amber-700 dark:text-amber-300">
                                    <li>Les affectations actives seront terminées côté backend</li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button color="secondary" isDisabled={deleteTalent.isPending} onPress={handleClose}>
                                Annuler
                            </Button>
                            <Button
                                color="primary-destructive"
                                isLoading={deleteTalent.isPending}
                                onPress={() =>
                                    void deleteTalent.mutateAsync({ talentId: talent.id }).then(() => {
                                        onSuccess();
                                        onClose();
                                    })
                                }
                            >
                                Confirmer la désactivation
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
