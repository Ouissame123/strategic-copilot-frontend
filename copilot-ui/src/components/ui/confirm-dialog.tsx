import type { ReactNode } from "react";
import { Heading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";

type ConfirmDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    body: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    tone?: "default" | "danger";
    isConfirmLoading?: boolean;
};

export function ConfirmDialog({
    isOpen,
    onOpenChange,
    title,
    body,
    confirmLabel,
    cancelLabel,
    onConfirm,
    tone = "default",
    isConfirmLoading,
}: ConfirmDialogProps) {
    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
            <Modal>
                <Dialog className="w-full max-w-md p-4 sm:p-6">
                    <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            {title}
                        </Heading>
                        <div className="mt-3 text-sm text-secondary">{body}</div>
                        <div className="mt-8 flex flex-wrap justify-end gap-3">
                            <Button type="button" color="secondary" onClick={() => onOpenChange(false)}>
                                {cancelLabel}
                            </Button>
                            <Button
                                type="button"
                                color={tone === "danger" ? "primary-destructive" : "primary"}
                                isLoading={isConfirmLoading}
                                onClick={() => {
                                    onConfirm();
                                    onOpenChange(false);
                                }}
                            >
                                {confirmLabel}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
