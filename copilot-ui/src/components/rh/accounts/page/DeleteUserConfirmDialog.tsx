import { AlertTriangle } from "lucide-react";
import { Heading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { useDeleteUser } from "@/hooks/useRhAccounts";
import type { RhStaffAccount } from "@/types/rh-accounts.types";

type DeleteUserConfirmDialogProps = {
    isOpen: boolean;
    user: RhStaffAccount;
    onClose: () => void;
    onSuccess: () => void;
};

export function DeleteUserConfirmDialog({ isOpen, user, onClose, onSuccess }: DeleteUserConfirmDialogProps) {
    const deleteUser = useDeleteUser();

    const handleClose = () => {
        if (deleteUser.isPending) return;
        onClose();
    };

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && handleClose()} isDismissable={!deleteUser.isPending}>
            <Modal>
                <Dialog className="w-full max-w-md p-4 sm:p-6">
                    <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            Désactiver le compte ?
                        </Heading>
                        <div className="mt-3 text-sm text-secondary">
                            <p>
                                Vous allez désactiver le compte <strong>{user.full_name}</strong> ({user.email}).
                            </p>
                            <p className="mt-2 text-xs text-tertiary">
                                Cette action est réversible (vous pouvez réactiver le compte plus tard).
                            </p>
                            <div className="mt-3 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30">
                                <p className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-200">
                                    <AlertTriangle size={14} aria-hidden /> Effets en cascade :
                                </p>
                                <ul className="ml-5 list-disc space-y-0.5 text-amber-700 dark:text-amber-300">
                                    <li>Toutes les sessions actives seront révoquées</li>
                                    {user.role === "manager" && user.managed_talents_count > 0 ? (
                                        <li>
                                            {user.managed_talents_count} talent{user.managed_talents_count > 1 ? "s" : ""}{" "}
                                            sera{user.managed_talents_count > 1 ? "ont" : ""} désaffecté
                                            {user.managed_talents_count > 1 ? "s" : ""} (sans manager)
                                        </li>
                                    ) : null}
                                </ul>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button color="secondary" isDisabled={deleteUser.isPending} onPress={handleClose}>
                                Annuler
                            </Button>
                            <Button
                                color="primary-destructive"
                                isLoading={deleteUser.isPending}
                                onPress={() =>
                                    void deleteUser.mutateAsync({ userId: user.id }).then(() => {
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
