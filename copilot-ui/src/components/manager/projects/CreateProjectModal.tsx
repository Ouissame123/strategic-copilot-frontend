import { useEffect, useState, type FormEvent } from "react";
import { Heading } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { parseManagerProjectCreateError } from "@/api/manager-projects.api";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { useCreateProject } from "@/hooks/useProjects";
import { useToast } from "@/providers/toast-provider";
import type { CreateProjectRequest, ProjectStatus } from "@/types/api.types";

type CreateProjectModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type FormState = {
    name: string;
    description: string;
    status: ProjectStatus;
    priority: number;
    start_date: string;
    milestone_at: string;
    budget_rh_planned: string;
};

type FieldErrors = Partial<Record<"name" | "status" | "priority" | "form", string>>;

const EMPTY: FormState = {
    name: "",
    description: "",
    status: "planned",
    priority: 5,
    start_date: "",
    milestone_at: "",
    budget_rh_planned: "",
};

const inputClass =
    "rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-fg-quaternary focus:outline-none focus:ring-1 focus:ring-secondary";

export function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
    const { t } = useTranslation("common");
    const tc = (key: string) => t(`managerWorkspace.projects.createForm.${key}`);
    const { push: pushToast } = useToast();
    const createProject = useCreateProject();
    const [form, setForm] = useState<FormState>(EMPTY);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (!open) return;
        setForm(EMPTY);
        setFieldErrors({});
    }, [open]);

    const nameTrimmed = form.name.trim();
    const canSubmit = nameTrimmed.length > 0 && !createProject.isPending;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!nameTrimmed) {
            setFieldErrors({ name: tc("nameRequired") });
            return;
        }
        setFieldErrors({});

        const body: CreateProjectRequest = {
            name: nameTrimmed,
            status: form.status,
            priority: form.priority,
        };
        if (form.description.trim()) body.description = form.description.trim();
        if (form.start_date.trim()) body.start_date = form.start_date.trim();
        if (form.milestone_at.trim()) body.milestone_at = form.milestone_at.trim();
        if (form.budget_rh_planned.trim()) {
            const n = Number(form.budget_rh_planned);
            if (Number.isFinite(n)) body.budget_rh_planned = n;
        }

        createProject.mutate(body, {
            onSuccess: () => {
                pushToast(tc("successToast"), "success");
                onOpenChange(false);
            },
            onError: (err) => {
                const parsed = parseManagerProjectCreateError(err);
                if (parsed) {
                    setFieldErrors({ [parsed.field]: parsed.message });
                    return;
                }
                setFieldErrors({ form: tc("errorFallback") });
            },
        });
    };

    return (
        <ModalOverlay isOpen={open} onOpenChange={onOpenChange} isDismissable={!createProject.isPending}>
            <Modal>
                <Dialog role="dialog" aria-label={tc("title")} className="w-full max-sm:max-w-none sm:max-w-[520px] sm:p-4">
                    <form
                        onSubmit={handleSubmit}
                        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-secondary bg-primary shadow-xl ring-1 ring-secondary/80"
                    >
                        <div className="overflow-y-auto p-6">
                            <Heading slot="title" className="text-lg font-semibold text-primary">
                                {tc("title")}
                            </Heading>
                            <p className="mt-1 text-sm text-secondary">{tc("subtitle")}</p>

                            <div className="mt-4 grid gap-3">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-fg-tertiary">{tc("labelName")}</span>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => {
                                            setForm((f) => ({ ...f, name: e.target.value }));
                                            setFieldErrors((prev) => ({ ...prev, name: undefined }));
                                        }}
                                        className={inputClass}
                                        autoFocus
                                        required
                                    />
                                    {fieldErrors.name ? (
                                        <span className="text-xs text-red-600 dark:text-red-400">{fieldErrors.name}</span>
                                    ) : null}
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-fg-tertiary">{tc("labelDescription")}</span>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                        rows={3}
                                        className={inputClass}
                                    />
                                </label>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-fg-tertiary">{tc("labelStatus")}</span>
                                        <select
                                            value={form.status}
                                            onChange={(e) => {
                                                setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }));
                                                setFieldErrors((prev) => ({ ...prev, status: undefined }));
                                            }}
                                            className={inputClass}
                                        >
                                            <option value="planned">{t("managerWorkspace.projects.listFilters.statusPlanned")}</option>
                                            <option value="active">{t("managerWorkspace.projects.listFilters.statusActive")}</option>
                                            <option value="on_hold">{t("managerWorkspace.projects.listFilters.statusOnHold")}</option>
                                            <option value="completed">{t("managerWorkspace.projects.listFilters.statusCompleted")}</option>
                                            <option value="cancelled">{t("managerWorkspace.projects.statusCancelled")}</option>
                                        </select>
                                        {fieldErrors.status ? (
                                            <span className="text-xs text-red-600 dark:text-red-400">{fieldErrors.status}</span>
                                        ) : null}
                                    </label>

                                    <label className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-fg-tertiary">{tc("labelPriority")}</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={form.priority}
                                            onChange={(e) => {
                                                const n = Number(e.target.value);
                                                setForm((f) => ({
                                                    ...f,
                                                    priority: Number.isFinite(n) ? Math.min(10, Math.max(1, Math.round(n))) : 5,
                                                }));
                                                setFieldErrors((prev) => ({ ...prev, priority: undefined }));
                                            }}
                                            className={inputClass}
                                        />
                                        {fieldErrors.priority ? (
                                            <span className="text-xs text-red-600 dark:text-red-400">{fieldErrors.priority}</span>
                                        ) : null}
                                    </label>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-fg-tertiary">{tc("labelStartDate")}</span>
                                        <input
                                            type="date"
                                            value={form.start_date}
                                            onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-fg-tertiary">{tc("labelMilestone")}</span>
                                        <input
                                            type="date"
                                            value={form.milestone_at}
                                            onChange={(e) => setForm((f) => ({ ...f, milestone_at: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </label>
                                </div>

                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-fg-tertiary">{tc("labelBudget")}</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={form.budget_rh_planned}
                                        onChange={(e) => setForm((f) => ({ ...f, budget_rh_planned: e.target.value }))}
                                        className={inputClass}
                                        placeholder="0"
                                    />
                                </label>

                                {fieldErrors.form ? (
                                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                                        {fieldErrors.form}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-secondary px-6 py-4">
                            <Button
                                type="button"
                                color="secondary"
                                onClick={() => onOpenChange(false)}
                                isDisabled={createProject.isPending}
                            >
                                {tc("cancel")}
                            </Button>
                            <Button
                                type="submit"
                                color="primary"
                                isDisabled={!canSubmit}
                                isLoading={createProject.isPending}
                            >
                                {createProject.isPending ? tc("submitting") : tc("submit")}
                            </Button>
                        </div>
                    </form>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
