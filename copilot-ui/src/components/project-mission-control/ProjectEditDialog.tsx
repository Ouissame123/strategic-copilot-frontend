import { useEffect, useState } from "react";
import { Heading } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { useUpdateProject } from "@/hooks/useProjects";
import type { ProjectStatus } from "@/types/api.types";
import { clamp, toDateInputValue } from "./utils";

type ProjectEditDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    initial: { status: ProjectStatus; priority: number; milestone_at: string; start_date?: string | null };
};

function statusForSelect(raw: string | null | undefined): ProjectStatus {
    const v = String(raw ?? "active").trim().toLowerCase().replace(/\s+/g, "_");
    if (v === "on_hold" || v === "onhold") return "on_hold";
    if (v === "planned" || v === "active" || v === "completed" || v === "cancelled") return v;
    return "active";
}

export function ProjectEditDialog({ open, onOpenChange, projectId, initial }: ProjectEditDialogProps) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);
    const updateProject = useUpdateProject();
    const [payload, setPayload] = useState({
        status: statusForSelect(initial.status),
        priority: clamp(initial.priority, 1, 10),
        milestone_at: toDateInputValue(initial.milestone_at),
    });

    useEffect(() => {
        if (!open) return;
        setPayload({
            status: statusForSelect(initial.status),
            priority: clamp(initial.priority, 1, 10),
            milestone_at: toDateInputValue(initial.milestone_at),
        });
    }, [open, initial.status, initial.priority, initial.milestone_at]);

    const handleSave = () => {
        updateProject.mutate(
            {
                projectId,
                body: {
                    status: payload.status,
                    priority: payload.priority,
                    milestone_at: payload.milestone_at.trim() ? payload.milestone_at.trim() : null,
                },
            },
            { onSuccess: () => onOpenChange(false) },
        );
    };

    return (
        <ModalOverlay isOpen={open} onOpenChange={onOpenChange} isDismissable={!updateProject.isPending}>
            <Modal>
                <Dialog role="dialog" aria-label={tm("editProjectTitle")} className="w-full max-sm:max-w-none sm:max-w-[520px] sm:p-4">
                    <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-secondary bg-primary shadow-xl ring-1 ring-secondary/80">
                        <div className="overflow-y-auto p-6">
                            <Heading slot="title" className="text-lg font-semibold text-primary">
                                {tm("editProjectTitle")}
                            </Heading>
                            <div className="mt-4 grid gap-3">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-fg-tertiary">{tm("labelProjectStatus")}</span>
                                    <select
                                        value={payload.status}
                                        onChange={(e) => setPayload((p) => ({ ...p, status: e.target.value as ProjectStatus }))}
                                        className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                    >
                                        <option value="planned">{tm("statusOptionPlanned")}</option>
                                        <option value="active">{tm("statusOptionActive")}</option>
                                        <option value="on_hold">{tm("statusOptionOnHold")}</option>
                                        <option value="completed">{tm("statusOptionCompleted")}</option>
                                        <option value="cancelled">{tm("statusOptionCancelled")}</option>
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-fg-tertiary">{tm("labelProjectPriority")}</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={payload.priority}
                                        onChange={(e) => setPayload((p) => ({ ...p, priority: clamp(Number(e.target.value) || 1, 1, 10) }))}
                                        className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-fg-tertiary">{tm("labelProjectMilestone")}</span>
                                    <input
                                        type="date"
                                        value={payload.milestone_at}
                                        onChange={(e) => setPayload((p) => ({ ...p, milestone_at: e.target.value }))}
                                        className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-secondary px-6 py-4">
                            <Button type="button" color="secondary" onClick={() => onOpenChange(false)} isDisabled={updateProject.isPending}>
                                {tm("cancel")}
                            </Button>
                            <Button
                                type="button"
                                color="primary"
                                isDisabled={updateProject.isPending}
                                isLoading={updateProject.isPending}
                                onClick={handleSave}
                            >
                                {tm("saveProjectChanges")}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
