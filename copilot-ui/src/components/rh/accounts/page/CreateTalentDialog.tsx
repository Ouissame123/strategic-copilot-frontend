import { useEffect, useState } from "react";
import { Heading } from "react-aria-components";
import { useQueryClient } from "@tanstack/react-query";
import { createRhStaffAccount } from "@/api/rh-accounts.api";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { useCreateTalent, useManagersList } from "@/hooks/useRhAccounts";
import { queryKeys } from "@/lib/query-keys";
import { readBackendMessage } from "@/lib/rh-accounts-display";
import { useToast } from "@/providers/toast-provider";
import type { CreateRhTalentAccountBody, RhStaffRole, RhTalentSeniority } from "@/types/rh-accounts.types";
import { cx } from "@/utils/cx";

type CreateTalentDialogProps = {
    isOpen: boolean;
    onClose: () => void;
};

const INPUT_CLASS =
    "w-full rounded-lg border border-secondary bg-primary px-2.5 py-2 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25";

const SENIORITIES: Array<RhTalentSeniority | ""> = ["", "junior", "mid", "senior"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_FORM = {
    name: "",
    email: "",
    job_title: "",
    department: "",
    seniority: "" as "" | RhTalentSeniority,
    manager_user_id: "",
    phone: "",
};

export function CreateTalentDialog({ isOpen, onClose }: CreateTalentDialogProps) {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    const createTalent = useCreateTalent();
    const managers = useManagersList();
    const [form, setForm] = useState(INITIAL_FORM);
    const [createAccount, setCreateAccount] = useState(false);
    const [accountRole, setAccountRole] = useState<RhStaffRole>("manager");
    const [accountPwd, setAccountPwd] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm(INITIAL_FORM);
        setCreateAccount(false);
        setAccountRole("manager");
        setAccountPwd("");
        setIsSubmitting(false);
    }, [isOpen]);

    const isBusy = createTalent.isPending || isSubmitting;

    const canSubmit =
        Boolean(form.name.trim()) &&
        EMAIL_RE.test(form.email.trim()) &&
        Boolean(form.job_title.trim()) &&
        (!createAccount || accountPwd.length >= 8) &&
        !isBusy;

    const handleClose = () => {
        if (isBusy) return;
        onClose();
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;

        const body: CreateRhTalentAccountBody = {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            job_title: form.job_title.trim(),
            department: form.department.trim() || undefined,
            seniority: form.seniority || undefined,
            manager_user_id: form.manager_user_id.trim() || undefined,
            phone: form.phone.trim() || undefined,
        };

        setIsSubmitting(true);
        try {
            await createTalent.mutateAsync(body);

            if (createAccount) {
                try {
                    const userRes = await createRhStaffAccount({
                        full_name: body.name,
                        email: body.email,
                        password: accountPwd,
                        role: accountRole,
                    });
                    toast(readBackendMessage(userRes, "Compte créé."), "success");
                    void qc.invalidateQueries({ queryKey: queryKeys.rh.accounts() });
                } catch {
                    toast(
                        "Talent créé, mais création du compte a échoué. Réessaie depuis « Nouveau compte ».",
                        "error",
                    );
                }
            }

            onClose();
        } catch {
            // Erreur talent déjà gérée par le hook (toast)
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && handleClose()} isDismissable={!isBusy}>
            <Modal>
                <Dialog className="w-full max-w-md p-4 sm:p-6">
                    <div className="w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-secondary bg-primary p-6 shadow-xl">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            Nouveau talent
                        </Heading>
                        <div className="mt-4 space-y-3">
                            <label className="block text-sm">
                                <span className="font-medium text-secondary">Nom complet *</span>
                                <input
                                    className={cx(INPUT_CLASS, "mt-1")}
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-secondary">Email *</span>
                                <input
                                    type="email"
                                    className={cx(INPUT_CLASS, "mt-1")}
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })}
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-secondary">Métier *</span>
                                <input
                                    className={cx(INPUT_CLASS, "mt-1")}
                                    value={form.job_title}
                                    onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-secondary">Département</span>
                                <input
                                    className={cx(INPUT_CLASS, "mt-1")}
                                    value={form.department}
                                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                                />
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-secondary">Séniorité</span>
                                <select
                                    className={cx(INPUT_CLASS, "mt-1")}
                                    value={form.seniority}
                                    onChange={(e) =>
                                        setForm({ ...form, seniority: e.target.value as "" | RhTalentSeniority })
                                    }
                                >
                                    <option value="">—</option>
                                    {SENIORITIES.filter(Boolean).map((s) => (
                                        <option key={s} value={s}>
                                            {String(s).charAt(0).toUpperCase() + String(s).slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-secondary">Manager</span>
                                <select
                                    className={cx(INPUT_CLASS, "mt-1")}
                                    value={form.manager_user_id}
                                    onChange={(e) => setForm({ ...form, manager_user_id: e.target.value })}
                                >
                                    <option value="">— Aucun pour l&apos;instant</option>
                                    {(managers.data?.users ?? []).map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.full_name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-secondary">Téléphone</span>
                                <input
                                    className={cx(INPUT_CLASS, "mt-1")}
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </label>

                            <div className="mt-3 border-t border-secondary pt-3">
                                <label className="flex cursor-pointer items-start gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5"
                                        checked={createAccount}
                                        onChange={(e) => setCreateAccount(e.target.checked)}
                                    />
                                    <span>
                                        <strong className="text-primary">
                                            Lui créer un compte d&apos;accès immédiatement
                                        </strong>
                                        <span className="mt-0.5 block text-xs text-tertiary">
                                            Génère le compte utilisateur en même temps que le talent.
                                        </span>
                                    </span>
                                </label>

                                {createAccount && (
                                    <div className="ml-6 mt-3 space-y-3">
                                        <div>
                                            <span className="text-sm font-medium text-secondary">Rôle</span>
                                            <div className="mt-1 flex gap-2">
                                                {(["manager", "rh"] as const).map((r) => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => setAccountRole(r)}
                                                        className={cx(
                                                            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition",
                                                            accountRole === r
                                                                ? "border-brand-secondary bg-brand-primary/10 text-brand-secondary"
                                                                : "border-secondary text-secondary hover:bg-secondary_subtle",
                                                        )}
                                                    >
                                                        {r === "manager" ? "Manager" : "RH"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <label className="block text-sm">
                                            <span className="font-medium text-secondary">Mot de passe initial *</span>
                                            <span className="ml-1 text-xs text-tertiary">(min 8 caractères)</span>
                                            <input
                                                type="password"
                                                className={cx(INPUT_CLASS, "mt-1")}
                                                value={accountPwd}
                                                onChange={(e) => setAccountPwd(e.target.value)}
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button color="secondary" isDisabled={isBusy} onPress={handleClose}>
                                Annuler
                            </Button>
                            <Button
                                color="primary"
                                isDisabled={!canSubmit}
                                isLoading={isBusy}
                                onPress={() => void handleSubmit()}
                            >
                                {createAccount ? "Créer talent + compte" : "Créer le talent"}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
