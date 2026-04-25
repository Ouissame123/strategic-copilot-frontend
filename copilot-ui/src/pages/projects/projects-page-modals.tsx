import { zodResolver } from "@hookform/resolvers/zod";
import { Heading } from "react-aria-components";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { AnalysisRefreshPanel } from "@/features/crud-common/analysis-refresh-panel";
import type { AnalysisRefreshPayload, Project } from "@/types/crud-domain";
import { cx } from "@/utils/cx";
import { normalizeProjectStatus } from "@/pages/projects/projects-utils";

type StatusOption = { id: string; label: string };

export type ProjectFormValues = {
    name: string;
    description: string;
    status: string;
};

type ProjectFormModalProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editing: Project | null;
    defaultStatusOptions: StatusOption[];
    analysisRefresh: AnalysisRefreshPayload | null;
    creating: boolean;
    updating: boolean;
    onSubmit: (values: ProjectFormValues) => Promise<void>;
};

function buildSchema(t: (k: string) => string) {
    return z.object({
        name: z.string().min(1, t("projects:validation.nameRequired")).max(200, t("projects:validation.nameMax")),
        description: z.string().max(5000, t("projects:validation.descriptionMax")),
        status: z.string(),
    });
}

export function ProjectFormModal({
    isOpen,
    onOpenChange,
    editing,
    defaultStatusOptions,
    analysisRefresh,
    creating,
    updating,
    onSubmit,
}: ProjectFormModalProps) {
    const { t } = useTranslation(["projects", "dataCrud"]);

    const schema = buildSchema(t);
    const {
        control,
        handleSubmit,
        reset,
        clearErrors,
        watch,
        setValue,
        formState: { isSubmitting, isValid },
    } = useForm<ProjectFormValues>({
        resolver: zodResolver(schema),
        mode: "onChange",
        defaultValues: { name: "", description: "", status: "" },
    });

    const status = watch("status");

    useEffect(() => {
        if (!isOpen) return;
        if (editing) {
            reset({
                name: String(editing.name ?? ""),
                description: editing.description != null ? String(editing.description) : "",
                status: normalizeProjectStatus(editing.status != null ? String(editing.status) : ""),
            });
        } else {
            reset({ name: "", description: "", status: "" });
        }
    }, [isOpen, editing, reset]);

    const submit = handleSubmit(async (values) => {
        await onSubmit(values);
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            clearErrors();
            reset({ name: "", description: "", status: "" }, { keepDefaultValues: false });
        }
        onOpenChange(open);
    };

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={handleOpenChange} isDismissable>
            <Modal>
                <Dialog className="w-full max-w-3xl p-4 sm:p-6">
                    <form
                        noValidate
                        onSubmit={submit}
                        className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-2xl ring-1 ring-secondary/80"
                    >
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            {editing ? t("dataCrud:edit") : t("dataCrud:newProject")}
                        </Heading>
                        <p className="mt-1 text-sm text-tertiary">{t("projects:modal.hint")}</p>
                        <div className="mt-6 grid gap-6 md:grid-cols-5">
                            <div className="space-y-4 md:col-span-3">
                                <Controller
                                    name="name"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Input
                                            label={t("dataCrud:name")}
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            isInvalid={!!fieldState.error}
                                            hint={fieldState.error?.message}
                                            isRequired
                                        />
                                    )}
                                />
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextArea
                                            label={t("dataCrud:description")}
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            isInvalid={!!fieldState.error}
                                            hint={fieldState.error?.message}
                                            rows={4}
                                        />
                                    )}
                                />
                                {analysisRefresh ? <AnalysisRefreshPanel payload={analysisRefresh} /> : null}
                            </div>

                            <div className="rounded-xl border border-secondary bg-primary_alt/40 p-4 md:col-span-2">
                                <p className="mb-2 text-sm font-semibold text-primary">{t("dataCrud:status")}</p>
                                <p className="mb-3 text-xs text-tertiary">{t("projects:modal.statusHint")}</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
                                    {defaultStatusOptions.map((option) => {
                                        const selected = status === option.id;
                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => setValue("status", option.id, { shouldValidate: true, shouldDirty: true })}
                                                className={cx(
                                                    "rounded-lg border px-3 py-2 text-left text-sm font-medium transition duration-150",
                                                    selected
                                                        ? "border-utility-brand-400 bg-utility-brand-50 text-utility-brand-800 ring-1 ring-utility-brand-300"
                                                        : "border-secondary bg-primary text-secondary hover:-translate-y-0.5 hover:bg-primary_hover",
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="relative z-10 mt-8 flex justify-end gap-3">
                            <Button type="button" color="secondary" slot="close">
                                {t("dataCrud:cancel")}
                            </Button>
                            <Button type="submit" color="primary" isLoading={creating || updating || isSubmitting} isDisabled={!isValid}>
                                {editing ? t("dataCrud:save") : t("dataCrud:create")}
                            </Button>
                        </div>
                    </form>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

type DeleteProjectModalProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    deleting: boolean;
    onConfirm: () => void;
};

export function DeleteProjectModal({ isOpen, onOpenChange, deleting, onConfirm }: DeleteProjectModalProps) {
    const { t } = useTranslation("dataCrud");

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
            <Modal>
                <Dialog className="w-full max-w-md p-4 sm:p-6">
                    <div className="w-full rounded-2xl border border-secondary bg-primary p-6 shadow-xl ring-1 ring-secondary/80">
                        <Heading slot="title" className="text-lg font-semibold text-primary">
                            {t("confirmDeleteTitle")}
                        </Heading>
                        <p className="mt-3 text-sm text-secondary">{t("confirmDeleteBody")}</p>
                        <div className="relative z-10 mt-8 flex justify-end gap-3">
                            <Button type="button" color="secondary" slot="close">
                                {t("cancel")}
                            </Button>
                            <Button type="button" color="primary" isLoading={deleting} onClick={onConfirm}>
                                {t("delete")}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
