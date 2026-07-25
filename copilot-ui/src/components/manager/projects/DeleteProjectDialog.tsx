import { Heading } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";

type DeleteProjectDialogProps = {
    open: boolean;
    projectName: string;
    isDeleting: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function DeleteProjectDialog({
    open,
    projectName,
    isDeleting,
    onOpenChange,
    onConfirm,
}: DeleteProjectDialogProps) {
    const { t } = useTranslation("common");

    return (
        <ModalOverlay
            isOpen={open}
            onOpenChange={(next) => {
                if (isDeleting) return;
                onOpenChange(next);
            }}
            isDismissable={!isDeleting}
        >
            <Modal>
                <Dialog className="w-full max-w-md p-4 sm:p-6">
                    <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            {t("managerWorkspace.projects.deleteProjectTitle")}
                        </Heading>
                        <p className="mt-3 text-sm text-secondary">
                            {t("managerWorkspace.projects.deleteProjectConfirmBody", { name: projectName })}
                        </p>
                        <div className="mt-8 flex flex-wrap justify-end gap-3">
                            <Button
                                type="button"
                                color="secondary"
                                isDisabled={isDeleting}
                                onClick={() => onOpenChange(false)}
                            >
                                {t("managerWorkspace.projects.deleteProjectCancel")}
                            </Button>
                            <Button
                                type="button"
                                color="primary-destructive"
                                isLoading={isDeleting}
                                isDisabled={isDeleting}
                                onClick={onConfirm}
                            >
                                {isDeleting
                                    ? t("managerWorkspace.projects.deleteProjectDeleting")
                                    : t("managerWorkspace.projects.deleteProjectConfirm")}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
