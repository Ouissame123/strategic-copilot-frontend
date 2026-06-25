import { useEffect, useState } from "react";
import { Heading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";

type ExpressInterestModalProps = {
    isOpen: boolean;
    projectName: string | null;
    isSubmitting: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (message?: string) => void;
};

export function ExpressInterestModal({
    isOpen,
    projectName,
    isSubmitting,
    onOpenChange,
    onSubmit,
}: ExpressInterestModalProps) {
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!isOpen) setMessage("");
    }, [isOpen]);

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={!isSubmitting}>
            <Modal>
                <Dialog className="w-full max-w-md p-4 sm:p-6">
                    <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            Exprimer mon intérêt
                        </Heading>
                        <p className="mt-1 text-sm text-secondary">{projectName ?? "—"}</p>

                        <div className="mt-5">
                            <TextArea
                                label="Message (optionnel)"
                                placeholder="Ex. Très intéressé(e) par ce projet…"
                                value={message}
                                onChange={setMessage}
                                isDisabled={isSubmitting}
                                rows={4}
                            />
                        </div>

                        <div className="mt-8 flex flex-wrap justify-end gap-3">
                            <Button
                                type="button"
                                color="secondary"
                                isDisabled={isSubmitting}
                                onClick={() => onOpenChange(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="button"
                                color="primary"
                                isLoading={isSubmitting}
                                isDisabled={isSubmitting}
                                onClick={() => onSubmit(message.trim() || undefined)}
                            >
                                Envoyer
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
