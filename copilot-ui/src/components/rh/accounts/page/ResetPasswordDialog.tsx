import { useEffect, useState } from "react";
import { Heading } from "react-aria-components";
import { CheckCircle2, X } from "lucide-react";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { CopyRow, PasswordField } from "@/components/rh/accounts/page/onboard-portal-shared";
import { copyToClipboard, generateInitialPassword } from "@/hooks/useOnboardTalent";
import { useResetTalentPassword } from "@/hooks/useResetTalentPassword";
import { useToast } from "@/providers/toast-provider";
import type { RhTalentAccount } from "@/types/rh-accounts.types";

type ResetPasswordDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    talent: RhTalentAccount;
};

export function ResetPasswordDialog({ open, onOpenChange, talent }: ResetPasswordDialogProps) {
    const { push: toast } = useToast();
    const resetMutation = useResetTalentPassword();

    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [successPassword, setSuccessPassword] = useState<string | null>(null);
    const [fieldError, setFieldError] = useState<string | null>(null);

    const userId = talent.user_id?.trim() ?? "";
    const isBusy = resetMutation.isPending;

    useEffect(() => {
        if (!open) {
            setPassword("");
            setShowPassword(false);
            setSuccessPassword(null);
            setFieldError(null);
        }
    }, [open, talent.id]);

    const handleClose = () => {
        if (isBusy) return;
        onOpenChange(false);
    };

    const handleSubmit = () => {
        setFieldError(null);
        if (!userId) {
            setFieldError("Aucun compte portail associé à ce talent.");
            return;
        }
        if (password.length < 8) {
            setFieldError("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }

        resetMutation.mutate(
            { user_id: userId, new_password: password },
            {
                onSuccess: () => {
                    setSuccessPassword(password);
                },
            },
        );
    };

    const handleCopyPassword = async () => {
        const value = successPassword ?? password;
        if (!value) return;
        const ok = await copyToClipboard(value);
        if (ok) toast("Copié", "success");
    };

    return (
        <ModalOverlay isOpen={open} onOpenChange={(next) => !next && handleClose()} isDismissable={!isBusy}>
            <Modal>
                <Dialog className="w-full max-w-md p-4 sm:p-6">
                    <div className="relative w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isBusy}
                            className="absolute right-4 top-4 rounded-lg p-1.5 text-tertiary transition hover:bg-secondary_subtle hover:text-primary"
                            aria-label="Fermer"
                        >
                            <X className="size-4" />
                        </button>

                        {successPassword ? (
                            <div className="space-y-5 pr-6">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" />
                                    <div>
                                        <h2 className="text-lg font-semibold text-primary">Mot de passe réinitialisé</h2>
                                    </div>
                                </div>

                                <CopyRow
                                    label="Nouveau mot de passe"
                                    value={successPassword}
                                    copyLabel="Copier le mot de passe"
                                    onCopy={() => void handleCopyPassword()}
                                />

                                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                    ⚠️ Communique ce mot de passe au talent en sécurité. Il devra le changer à sa prochaine
                                    connexion (recommandé).
                                </p>

                                <div className="flex justify-end pt-2">
                                    <Button type="button" color="secondary" onClick={handleClose}>
                                        Fermer
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Heading slot="title" className="pr-8 text-lg font-semibold text-primary">
                                    Réinitialiser le mot de passe de {talent.name}
                                </Heading>
                                <p className="mt-1 text-sm text-secondary">
                                    Le talent recevra un nouveau mot de passe — communique-le en sécurité.
                                </p>

                                <div className="mt-6">
                                    <PasswordField
                                        id="reset-talent-password"
                                        value={password}
                                        onChange={setPassword}
                                        showPassword={showPassword}
                                        onToggleShow={() => setShowPassword((v) => !v)}
                                        onGenerate={() => setPassword(generateInitialPassword())}
                                        onCopy={() => void handleCopyPassword()}
                                        disabled={isBusy}
                                    />
                                    {fieldError ? <p className="mt-2 text-sm text-error-primary">{fieldError}</p> : null}
                                </div>

                                <div className="mt-8 flex flex-wrap justify-end gap-3">
                                    <Button type="button" color="secondary" isDisabled={isBusy} onClick={handleClose}>
                                        Annuler
                                    </Button>
                                    <Button
                                        type="button"
                                        color="primary-destructive"
                                        isLoading={isBusy}
                                        isDisabled={password.length < 8 || !userId}
                                        onClick={handleSubmit}
                                    >
                                        Confirmer la réinitialisation
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
