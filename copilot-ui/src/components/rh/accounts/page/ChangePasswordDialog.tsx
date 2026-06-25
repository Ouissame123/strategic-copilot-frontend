import { useState } from "react";
import { Heading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { useChangePassword } from "@/hooks/useRhAccounts";
import { cx } from "@/utils/cx";

type ChangePasswordDialogProps = {
    isOpen: boolean;
    userId: string;
    onClose: () => void;
};

const INPUT_CLASS =
    "w-full rounded-lg border border-secondary bg-primary px-2.5 py-2 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25";

export function ChangePasswordDialog({ isOpen, userId, onClose }: ChangePasswordDialogProps) {
    const change = useChangePassword();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const errors: string[] = [];
    if (password && password.length < 8) errors.push("Min 8 caractères.");
    if (password && confirm && password !== confirm) errors.push("Les mots de passe ne correspondent pas.");
    const canSubmit = password.length >= 8 && password === confirm && !change.isPending;

    const handleClose = () => {
        if (change.isPending) return;
        setPassword("");
        setConfirm("");
        onClose();
    };

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && handleClose()} isDismissable={!change.isPending}>
            <Modal>
                <Dialog className="w-full max-w-md p-4 sm:p-6">
                    <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            Nouveau mot de passe
                        </Heading>
                        <div className="mt-4 space-y-3">
                            <label className="block text-sm">
                                <span className="font-medium text-secondary">Nouveau mot de passe *</span>
                                <input
                                    type="password"
                                    className={cx(INPUT_CLASS, "mt-1")}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-secondary">Confirmer</span>
                                <input
                                    type="password"
                                    className={cx(INPUT_CLASS, "mt-1")}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                />
                            </label>
                            {errors[0] ? <p className="text-xs text-rose-600">{errors[0]}</p> : null}
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button color="secondary" isDisabled={change.isPending} onPress={handleClose}>
                                Annuler
                            </Button>
                            <Button
                                color="primary"
                                isDisabled={!canSubmit}
                                isLoading={change.isPending}
                                onPress={() =>
                                    void change.mutateAsync({ userId, newPassword: password }).then(handleClose)
                                }
                            >
                                Enregistrer
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
