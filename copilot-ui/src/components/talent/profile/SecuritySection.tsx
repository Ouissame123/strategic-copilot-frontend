import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Heading } from "react-aria-components";
import { useForm } from "react-hook-form";
import { KeyRound } from "lucide-react";
import { z } from "zod";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { PROFILE_INPUT_CLASS } from "@/components/talent/profile/talent-profile-ui";
import { useTalentChangePassword } from "@/hooks/useTalentProfile";

const passwordSchema = z
    .object({
        old_password: z.string().min(1, "Mot de passe actuel requis"),
        new_password: z.string().min(8, "Minimum 8 caractères"),
        confirm_password: z.string().min(8, "Confirmez le mot de passe"),
    })
    .refine((data) => data.new_password === data.confirm_password, {
        message: "Les mots de passe ne correspondent pas",
        path: ["confirm_password"],
    })
    .refine((data) => data.new_password !== data.old_password, {
        message: "Le nouveau mot de passe doit être différent",
        path: ["new_password"],
    });

type PasswordFormValues = z.infer<typeof passwordSchema>;

type ChangePasswordModalProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
};

export function ChangePasswordModal({ isOpen, onOpenChange }: ChangePasswordModalProps) {
    const changePassword = useTalentChangePassword();

    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { old_password: "", new_password: "", confirm_password: "" },
    });

    useEffect(() => {
        if (!isOpen) {
            form.reset();
        }
    }, [isOpen, form]);

    const onSubmit = form.handleSubmit((values) => {
        changePassword.mutate(
            { old_password: values.old_password, new_password: values.new_password },
            {
                onSuccess: () => onOpenChange(false),
            },
        );
    });

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={!changePassword.isPending}>
            <Modal>
                <Dialog className="w-full max-w-md p-4 sm:p-6">
                    <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            Changer le mot de passe
                        </Heading>
                        <p className="mt-1 text-sm text-secondary">
                            Toutes vos sessions seront révoquées après le changement.
                        </p>

                        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
                            <label className="grid gap-1.5">
                                <span className="text-sm font-medium text-primary">Mot de passe actuel</span>
                                <input
                                    {...form.register("old_password")}
                                    type="password"
                                    autoComplete="current-password"
                                    disabled={changePassword.isPending}
                                    className={PROFILE_INPUT_CLASS}
                                />
                                {form.formState.errors.old_password?.message ? (
                                    <span className="text-xs text-error-primary">
                                        {form.formState.errors.old_password.message}
                                    </span>
                                ) : null}
                            </label>

                            <label className="grid gap-1.5">
                                <span className="text-sm font-medium text-primary">Nouveau mot de passe</span>
                                <input
                                    {...form.register("new_password")}
                                    type="password"
                                    autoComplete="new-password"
                                    disabled={changePassword.isPending}
                                    className={PROFILE_INPUT_CLASS}
                                />
                                {form.formState.errors.new_password?.message ? (
                                    <span className="text-xs text-error-primary">
                                        {form.formState.errors.new_password.message}
                                    </span>
                                ) : null}
                            </label>

                            <label className="grid gap-1.5">
                                <span className="text-sm font-medium text-primary">Confirmer le mot de passe</span>
                                <input
                                    {...form.register("confirm_password")}
                                    type="password"
                                    autoComplete="new-password"
                                    disabled={changePassword.isPending}
                                    className={PROFILE_INPUT_CLASS}
                                />
                                {form.formState.errors.confirm_password?.message ? (
                                    <span className="text-xs text-error-primary">
                                        {form.formState.errors.confirm_password.message}
                                    </span>
                                ) : null}
                            </label>

                            <div className="flex flex-wrap justify-end gap-3 pt-2">
                                <Button
                                    type="button"
                                    color="secondary"
                                    isDisabled={changePassword.isPending}
                                    onClick={() => onOpenChange(false)}
                                >
                                    Annuler
                                </Button>
                                <Button type="submit" color="primary" isLoading={changePassword.isPending}>
                                    Valider
                                </Button>
                            </div>
                        </form>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

type SecuritySectionProps = {
    mustChangePassword?: boolean;
    autoOpenPasswordModal?: boolean;
};

export function SecuritySection({ mustChangePassword, autoOpenPasswordModal }: SecuritySectionProps) {
    const [open, setOpen] = useState(autoOpenPasswordModal ?? false);

    useEffect(() => {
        if (autoOpenPasswordModal) setOpen(true);
    }, [autoOpenPasswordModal]);

    return (
        <>
            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/60 sm:p-6">
                <div className="flex items-start gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
                        <KeyRound className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-primary">Sécurité</h2>
                        <p className="mt-0.5 text-xs text-tertiary">Mot de passe et accès au compte</p>
                        {mustChangePassword ? (
                            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                                Vous devez changer votre mot de passe.
                            </p>
                        ) : null}
                        <Button type="button" color="secondary" size="sm" className="mt-4" onClick={() => setOpen(true)}>
                            Changer le mot de passe
                        </Button>
                    </div>
                </div>
            </section>

            <ChangePasswordModal isOpen={open} onOpenChange={setOpen} />
        </>
    );
}
