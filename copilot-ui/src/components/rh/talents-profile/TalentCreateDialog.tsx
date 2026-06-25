import { useEffect, useState } from "react";
import { Heading } from "react-aria-components";
import { X } from "lucide-react";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { PortalAccessBadge } from "@/components/rh/talents-profile/PortalAccessBadge";
import { useCreateTalentProfile } from "@/hooks/use-rh-talents-profile";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";

const SENIORITY_OPTIONS = ["Junior", "Mid", "Senior", "Lead", "Expert", "Stagiaire", "Freelance"];

const INPUT_CLASS =
    "mt-1 w-full rounded-lg border border-secondary bg-primary px-2.5 py-2 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25";

type TalentCreateDialogProps = {
    open: boolean;
    onClose: () => void;
};

const INITIAL = {
    name: "",
    email: "",
    job_title: "",
    department: "",
    seniority_level: "",
    manager_user_id: "",
    phone: "",
};

export function TalentCreateDialog({ open, onClose }: TalentCreateDialogProps) {
    const { push: toast } = useToast();
    const create = useCreateTalentProfile();
    const [form, setForm] = useState(INITIAL);

    useEffect(() => {
        if (!open) setForm(INITIAL);
    }, [open]);

    const handleSubmit = () => {
        if (!form.name.trim()) {
            toast("Nom requis", "error");
            return;
        }
        if (!form.email.includes("@")) {
            toast("Email invalide", "error");
            return;
        }
        if (!form.job_title.trim()) {
            toast("Poste requis", "error");
            return;
        }

        create.mutate(
            {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                job_title: form.job_title.trim(),
                department: form.department.trim() || undefined,
                seniority_level: form.seniority_level || undefined,
                manager_user_id: form.manager_user_id.trim() || undefined,
                phone: form.phone.trim() || undefined,
            },
            {
                onSuccess: () => {
                    onClose();
                    setForm(INITIAL);
                },
            },
        );
    };

    return (
        <ModalOverlay isOpen={open} onOpenChange={(next) => !next && onClose()} isDismissable={!create.isPending}>
            <Modal>
                <Dialog className="w-full max-w-lg p-4 sm:p-6">
                    <div className="relative w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={create.isPending}
                            className="absolute right-4 top-4 rounded-lg p-1.5 text-tertiary hover:bg-secondary_subtle"
                            aria-label="Fermer"
                        >
                            <X className="size-4" />
                        </button>

                        <Heading slot="title" className="pr-8 text-lg font-semibold text-primary">
                            Nouveau profil talent
                        </Heading>
                        <p className="mt-1 text-sm text-secondary">
                            Fiche talent sans accès portail. Utilisez « Donner accès portail » après création si besoin.
                        </p>

                        <div className="mt-5 space-y-3">
                            <Field label="Nom complet *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                            <Field label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                            <Field label="Poste *" value={form.job_title} onChange={(v) => setForm({ ...form, job_title: v })} />
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Field label="Département" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
                                <SelectField
                                    label="Séniorité"
                                    value={form.seniority_level}
                                    onChange={(v) => setForm({ ...form, seniority_level: v })}
                                    options={SENIORITY_OPTIONS}
                                />
                            </div>
                            <Field label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                            <Field
                                label="Manager (UUID)"
                                value={form.manager_user_id}
                                onChange={(v) => setForm({ ...form, manager_user_id: v })}
                            />
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <Button color="secondary" isDisabled={create.isPending} onPress={onClose}>
                                Annuler
                            </Button>
                            <Button color="primary" isLoading={create.isPending} onPress={handleSubmit}>
                                Créer le talent
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
}) {
    return (
        <label className="block text-sm">
            <span className="font-medium text-primary">{label}</span>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} />
        </label>
    );
}

function SelectField({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
}) {
    return (
        <label className="block text-sm">
            <span className="font-medium text-primary">{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} className={cx(INPUT_CLASS, "cursor-pointer")}>
                <option value="">—</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o}
                    </option>
                ))}
            </select>
        </label>
    );
}
