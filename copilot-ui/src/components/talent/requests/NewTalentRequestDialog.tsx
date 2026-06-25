import { useEffect, useMemo, useState } from "react";
import { Heading } from "react-aria-components";
import { z } from "zod";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import type { CreateTalentRequestPayload, TalentRequestPriority, TalentRequestType } from "@/types/talent-requests";
import { cx } from "@/utils/cx";

const REQUEST_TYPES: TalentRequestType[] = ["formation", "mobilite", "conge", "feedback", "autre"];
const PRIORITIES: TalentRequestPriority[] = ["normal", "high", "urgent"];

const TYPE_LABELS: Record<TalentRequestType, string> = {
    formation: "Formation",
    mobilite: "Mobilité",
    conge: "Congé",
    feedback: "Feedback",
    autre: "Autre",
};

const baseSchema = z.object({
    request_type: z.enum(["formation", "mobilite", "conge", "feedback", "autre"]),
    title: z.string().trim().min(3, "Minimum 3 caractères").max(200, "Maximum 200 caractères"),
    description: z.string().max(2000, "Maximum 2000 caractères").optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

type NewTalentRequestDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    isSubmitting: boolean;
    onSubmit: (payload: CreateTalentRequestPayload) => void;
    initialDraft?: {
        request_type?: TalentRequestType;
        title?: string;
        description?: string;
    } | null;
};

export function NewTalentRequestDialog({
    isOpen,
    onOpenChange,
    isSubmitting,
    onSubmit,
    initialDraft = null,
}: NewTalentRequestDialogProps) {
    const [requestType, setRequestType] = useState<TalentRequestType | "">("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<TalentRequestPriority>("normal");

    const [budgetEstimate, setBudgetEstimate] = useState("");
    const [formationDeadline, setFormationDeadline] = useState("");
    const [targetRole, setTargetRole] = useState("");
    const [targetDepartment, setTargetDepartment] = useState("");
    const [leaveStart, setLeaveStart] = useState("");
    const [leaveEnd, setLeaveEnd] = useState("");

    const [fieldError, setFieldError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setRequestType("");
            setTitle("");
            setDescription("");
            setPriority("normal");
            setBudgetEstimate("");
            setFormationDeadline("");
            setTargetRole("");
            setTargetDepartment("");
            setLeaveStart("");
            setLeaveEnd("");
            setFieldError(null);
            return;
        }
        if (initialDraft) {
            setRequestType(initialDraft.request_type ?? "");
            setTitle(initialDraft.title ?? "");
            setDescription(initialDraft.description ?? "");
            if (initialDraft.request_type === "formation") {
                setPriority("high");
            }
        }
    }, [isOpen, initialDraft]);

    const validation = useMemo(() => {
        const parsed = baseSchema.safeParse({
            request_type: requestType || undefined,
            title,
            description: description || undefined,
            priority,
        });
        return parsed;
    }, [requestType, title, description, priority]);

    const buildPayload = (): CreateTalentRequestPayload | null => {
        if (!validation.success) return null;

        const payload: Record<string, unknown> = {};
        const type = validation.data.request_type;

        if (type === "formation") {
            if (budgetEstimate.trim()) payload.budget_estime = budgetEstimate.trim();
            if (formationDeadline.trim()) payload.deadline = formationDeadline.trim();
        } else if (type === "mobilite") {
            if (targetRole.trim()) payload.poste_cible = targetRole.trim();
            if (targetDepartment.trim()) payload.departement = targetDepartment.trim();
        } else if (type === "conge") {
            if (leaveStart.trim()) payload.date_debut = leaveStart.trim();
            if (leaveEnd.trim()) payload.date_fin = leaveEnd.trim();
        }

        return {
            request_type: type,
            title: validation.data.title,
            description: validation.data.description?.trim() || undefined,
            priority: validation.data.priority ?? "normal",
            payload: Object.keys(payload).length > 0 ? payload : undefined,
        };
    };

    const handleSubmit = () => {
        setFieldError(null);
        if (!requestType) {
            setFieldError("Sélectionnez un type de demande.");
            return;
        }
        if (!validation.success) {
            setFieldError(validation.error.issues[0]?.message ?? "Formulaire invalide.");
            return;
        }
        const payload = buildPayload();
        if (!payload) return;
        onSubmit(payload);
    };

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={!isSubmitting}>
            <Modal>
                <Dialog className="w-full max-w-lg p-4 sm:p-6">
                    <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            Nouvelle demande
                        </Heading>
                        <p className="mt-1 text-sm text-secondary">
                            Votre demande sera transmise à votre manager et aux RH.
                        </p>

                        <div className="mt-6 space-y-4">
                            <div>
                                <label htmlFor="tr-type" className="mb-1.5 block text-sm font-medium text-primary">
                                    Type
                                </label>
                                <NativeSelect
                                    id="tr-type"
                                    value={requestType}
                                    onChange={(e) => setRequestType(e.target.value as TalentRequestType | "")}
                                    disabled={isSubmitting}
                                    options={[
                                        { label: "Sélectionner…", value: "" },
                                        ...REQUEST_TYPES.map((type) => ({ label: TYPE_LABELS[type], value: type })),
                                    ]}
                                />
                            </div>

                            <div>
                                <label htmlFor="tr-title" className="mb-1.5 block text-sm font-medium text-primary">
                                    Titre
                                </label>
                                <input
                                    id="tr-title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    disabled={isSubmitting}
                                    maxLength={200}
                                    className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary outline-none focus:border-brand-secondary"
                                    placeholder="Objet de votre demande"
                                />
                                <p className="mt-1 text-xs text-tertiary">{title.length}/200</p>
                            </div>

                            <div>
                                <label htmlFor="tr-desc" className="mb-1.5 block text-sm font-medium text-primary">
                                    Description
                                </label>
                                <TextArea
                                    id="tr-desc"
                                    value={description}
                                    onChange={setDescription}
                                    isDisabled={isSubmitting}
                                    placeholder="Détaillez votre demande (optionnel)"
                                    rows={4}
                                />
                                <p className="mt-1 text-xs text-tertiary">{description.length}/2000</p>
                            </div>

                            <div>
                                <span className="mb-1.5 block text-sm font-medium text-primary">Priorité</span>
                                <div className="inline-flex gap-1 rounded-lg bg-secondary_subtle p-1">
                                    {PRIORITIES.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => setPriority(p)}
                                            className={cx(
                                                "rounded-md px-3 py-1.5 text-sm transition",
                                                priority === p
                                                    ? "bg-primary font-medium text-primary shadow-sm"
                                                    : "text-tertiary hover:text-primary",
                                            )}
                                        >
                                            {p === "normal" ? "Normal" : p === "high" ? "Haute" : "Urgent"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {requestType === "formation" ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="tr-budget" className="mb-1.5 block text-sm font-medium text-primary">
                                            Budget estimé
                                        </label>
                                        <input
                                            id="tr-budget"
                                            type="text"
                                            value={budgetEstimate}
                                            onChange={(e) => setBudgetEstimate(e.target.value)}
                                            disabled={isSubmitting}
                                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="tr-deadline" className="mb-1.5 block text-sm font-medium text-primary">
                                            Deadline
                                        </label>
                                        <input
                                            id="tr-deadline"
                                            type="date"
                                            value={formationDeadline}
                                            onChange={(e) => setFormationDeadline(e.target.value)}
                                            disabled={isSubmitting}
                                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            {requestType === "mobilite" ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="tr-role" className="mb-1.5 block text-sm font-medium text-primary">
                                            Poste cible
                                        </label>
                                        <input
                                            id="tr-role"
                                            type="text"
                                            value={targetRole}
                                            onChange={(e) => setTargetRole(e.target.value)}
                                            disabled={isSubmitting}
                                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="tr-dept" className="mb-1.5 block text-sm font-medium text-primary">
                                            Département
                                        </label>
                                        <input
                                            id="tr-dept"
                                            type="text"
                                            value={targetDepartment}
                                            onChange={(e) => setTargetDepartment(e.target.value)}
                                            disabled={isSubmitting}
                                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            {requestType === "conge" ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="tr-start" className="mb-1.5 block text-sm font-medium text-primary">
                                            Date début
                                        </label>
                                        <input
                                            id="tr-start"
                                            type="date"
                                            value={leaveStart}
                                            onChange={(e) => setLeaveStart(e.target.value)}
                                            disabled={isSubmitting}
                                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="tr-end" className="mb-1.5 block text-sm font-medium text-primary">
                                            Date fin
                                        </label>
                                        <input
                                            id="tr-end"
                                            type="date"
                                            value={leaveEnd}
                                            onChange={(e) => setLeaveEnd(e.target.value)}
                                            disabled={isSubmitting}
                                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            {fieldError ? <p className="text-sm text-error-primary">{fieldError}</p> : null}
                        </div>

                        <div className="mt-8 flex flex-wrap justify-end gap-3">
                            <Button type="button" color="secondary" isDisabled={isSubmitting} onClick={() => onOpenChange(false)}>
                                Annuler
                            </Button>
                            <Button type="button" color="primary" isLoading={isSubmitting} onClick={handleSubmit}>
                                Envoyer la demande
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
