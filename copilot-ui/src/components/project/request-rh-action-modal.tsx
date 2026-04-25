import { useState } from "react";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import type { RhActionRequestType } from "@/api/rh-actions.api";

type RequestRhActionModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    onSubmit: (payload: { project_id: string; type: RhActionRequestType; message: string }) => Promise<void>;
};

const TYPES: { value: RhActionRequestType; label: string }[] = [
    { value: "reallocation", label: "Réaffectation" },
    { value: "overload", label: "Surcharge" },
    { value: "training", label: "Formation" },
    { value: "recruitment", label: "Recrutement" },
    { value: "skill_gap", label: "Écart de compétences" },
];

export function RequestRhActionModal({ open, onOpenChange, projectId, onSubmit }: RequestRhActionModalProps) {
    const [type, setType] = useState<RhActionRequestType>("skill_gap");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        if (!message.trim()) {
            setError("Message obligatoire.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await onSubmit({ project_id: projectId, type, message: message.trim() });
            setMessage("");
            onOpenChange(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Échec");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalOverlay isOpen={open} onOpenChange={onOpenChange} isDismissable>
            <Modal>
                <Dialog className="max-w-lg rounded-2xl border border-secondary bg-primary p-6 shadow-xl">
                    <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">RH</p>
                    <h2 className="mt-1 text-lg font-semibold text-primary">Demander une action RH</h2>
                    <p className="mt-2 text-sm text-tertiary">Projet : {projectId}</p>
                    <div className="mt-4 space-y-4">
                        <NativeSelect
                            label="Type"
                            value={type}
                            onChange={(e) => setType(e.target.value as RhActionRequestType)}
                            options={TYPES.map((x) => ({ label: x.label, value: x.value }))}
                        />
                        <Input label="Message" value={message} onChange={setMessage} placeholder="Contexte pour l’équipe RH…" />
                        {error ? <p className="text-sm text-error-primary">{error}</p> : null}
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button color="secondary" size="sm" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button color="primary" size="sm" isLoading={loading} onClick={() => void submit()}>
                            Envoyer
                        </Button>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
