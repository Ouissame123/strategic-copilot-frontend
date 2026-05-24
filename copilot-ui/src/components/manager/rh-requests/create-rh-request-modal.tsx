import { ClipboardList } from "lucide-react";
import type { RhActionRequestType } from "@/api/rh-actions.api";
import type { RhActionPriority } from "@/types/manager-rh-actions.types";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { RH_PRIMARY_CTA_CLASSES } from "@/components/rh-requests/rh-requests-styles";
import { cx } from "@/utils/cx";

type CreateRHRequestModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: RhActionRequestType | "";
    projectId: string;
    assignedTo: string;
    priority: RhActionPriority | "";
    message: string;
    onType: (v: RhActionRequestType | "") => void;
    onProjectId: (v: string) => void;
    onAssignedTo: (v: string) => void;
    onPriority: (v: RhActionPriority | "") => void;
    onMessage: (v: string) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    projectOptions: { id: string; label: string }[];
    typeOptions: { value: RhActionRequestType; label: string }[];
    priorityOptions: { value: RhActionPriority; label: string }[];
    labels: {
        modalTitle: string;
        modalSubtitle: string;
        fieldType: string;
        fieldProjectOptional: string;
        fieldAssignedOptional: string;
        fieldPriority: string;
        fieldMessage: string;
        pickTypePlaceholder: string;
        pickPriorityPlaceholder: string;
        noProjectOption: string;
        placeholderMessage: string;
        placeholderAssignedTo: string;
        cancel: string;
        send: string;
    };
};

const textareaClass = cx(
    "min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-xs outline-none transition",
    "placeholder:text-slate-400 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/25",
    "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500",
);

const inputClass = cx(
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition",
    "placeholder:text-slate-400 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/25",
    "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
);

export function CreateRHRequestModal({
    open,
    onOpenChange,
    type,
    projectId,
    assignedTo,
    priority,
    message,
    onType,
    onProjectId,
    onAssignedTo,
    onPriority,
    onMessage,
    onSubmit,
    isSubmitting,
    projectOptions,
    typeOptions,
    priorityOptions,
    labels,
}: CreateRHRequestModalProps) {
    return (
        <ModalOverlay isOpen={open} onOpenChange={onOpenChange} isDismissable>
            <Modal>
                <Dialog className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="max-h-[85dvh] overflow-y-auto">
                        <div className="border-b border-slate-100 bg-gradient-to-br from-violet-50/80 to-white px-6 py-6 dark:border-slate-800 dark:from-violet-950/30 dark:to-slate-900 sm:px-8 sm:py-7">
                            <div className="flex gap-4">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md">
                                    <ClipboardList className="size-6" strokeWidth={2} aria-hidden />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{labels.modalTitle}</h2>
                                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{labels.modalSubtitle}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4 px-6 py-6 sm:px-8 sm:py-8">
                            <NativeSelect
                                label={labels.fieldType}
                                value={type}
                                onChange={(e) => onType(e.target.value as RhActionRequestType | "")}
                                selectClassName="rounded-xl border-slate-200 dark:border-slate-700"
                                options={[
                                    { label: labels.pickTypePlaceholder, value: "" },
                                    ...typeOptions.map((x) => ({ label: x.label, value: x.value })),
                                ]}
                            />
                            <NativeSelect
                                label={labels.fieldProjectOptional}
                                value={projectId}
                                onChange={(e) => onProjectId(e.target.value)}
                                selectClassName="rounded-xl border-slate-200 dark:border-slate-700"
                                options={[
                                    { label: labels.noProjectOption, value: "" },
                                    ...projectOptions.map((x) => ({ label: x.label, value: x.id })),
                                ]}
                            />
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {labels.fieldAssignedOptional}
                                </span>
                                <input
                                    type="text"
                                    value={assignedTo}
                                    onChange={(e) => onAssignedTo(e.target.value)}
                                    placeholder={labels.placeholderAssignedTo}
                                    className={inputClass}
                                />
                            </label>
                            <NativeSelect
                                label={labels.fieldPriority}
                                value={priority}
                                onChange={(e) => onPriority(e.target.value as RhActionPriority | "")}
                                selectClassName="rounded-xl border-slate-200 dark:border-slate-700"
                                options={[
                                    { label: labels.pickPriorityPlaceholder, value: "" },
                                    ...priorityOptions.map((p) => ({ label: p.label, value: p.value })),
                                ]}
                            />
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{labels.fieldMessage}</span>
                                <textarea
                                    className={textareaClass}
                                    value={message}
                                    onChange={(e) => onMessage(e.target.value)}
                                    placeholder={labels.placeholderMessage}
                                    maxLength={5000}
                                />
                                <span className="mt-1 block text-right text-xs text-slate-500">{message.length}/5000</span>
                            </label>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40 sm:px-8">
                            <Button color="secondary" size="md" onClick={() => onOpenChange(false)}>
                                {labels.cancel}
                            </Button>
                            <button
                                type="button"
                                className={cx(RH_PRIMARY_CTA_CLASSES, isSubmitting && "pointer-events-none opacity-70")}
                                disabled={isSubmitting}
                                onClick={onSubmit}
                            >
                                {labels.send}
                            </button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
