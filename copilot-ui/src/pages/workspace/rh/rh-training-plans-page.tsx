import { useState } from "react";
import { useTranslation } from "react-i18next";
import { postRhTrainingPlan } from "@/api/rh-actions.api";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Table, TableCard } from "@/components/application/table/table";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useRhTrainingPlansQuery } from "@/hooks/use-rh-workspace-queries";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { rowsFromRhPayload, pickCell } from "@/utils/rh-api-parse";

export default function RhTrainingPlansPage() {
    const { t } = useTranslation(["common", "nav"]);
    const qc = useQueryClient();
    useCopilotPage("none", t("nav:rhNavTraining"));

    const q = useRhTrainingPlansQuery();
    const rows = rowsFromRhPayload(q.data ?? []).map((r, i) => ({ ...r, id: String(r.id ?? `tp-${i}`) }));

    const [open, setOpen] = useState(false);
    const [bodyJson, setBodyJson] = useState("{}");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const submit = async () => {
        setSaving(true);
        setErr(null);
        try {
            let parsed: Record<string, unknown> = {};
            try {
                parsed = JSON.parse(bodyJson) as Record<string, unknown>;
            } catch {
                setErr("JSON invalide.");
                setSaving(false);
                return;
            }
            await postRhTrainingPlan(parsed);
            setOpen(false);
            void qc.invalidateQueries({ queryKey: queryKeys.rh.trainingPlans() });
            void qc.invalidateQueries({ queryKey: queryKeys.rh.dashboard() });
        } catch (e) {
            setErr(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH"
            title={t("nav:rhNavTraining")}
            description={t("common:rhTraining.description")}
        >
            <div className="mb-4">
                <Button color="primary" size="sm" onClick={() => setOpen(true)}>
                    {t("common:rhTraining.create")}
                </Button>
            </div>

            {q.isLoading ? <p className="text-sm text-tertiary">{t("common:loading")}</p> : null}
            {q.isError ? (
                <p className="text-sm text-error-primary">{q.error instanceof Error ? q.error.message : String(q.error)}</p>
            ) : null}

            {q.isSuccess && rows.length === 0 ? (
                <p className="text-sm text-tertiary">{t("common:rhTraining.empty")}</p>
            ) : q.isSuccess ? (
                <TableCard.Root size="md">
                    <TableCard.Header title={t("common:rhTraining.tableTitle")} />
                    <div className="overflow-x-auto">
                        <Table aria-label="Plans" className="min-w-full">
                            <Table.Header>
                                <Table.Head id="ti" label={t("common:rhTraining.colTitle")} isRowHeader />
                                <Table.Head id="g" label={t("common:rhTraining.colGap")} />
                                <Table.Head id="tal" label={t("common:rhTraining.colTalents")} />
                                <Table.Head id="st" label={t("common:rhTraining.colStatus")} />
                                <Table.Head id="pr" label={t("common:rhTraining.colPriority")} />
                                <Table.Head id="im" label={t("common:rhTraining.colImpact")} />
                            </Table.Header>
                            <Table.Body items={rows}>
                                {(row) => (
                                    <Table.Row id={row.id}>
                                        <Table.Cell className="font-medium">{pickCell(row, ["title", "name", "label"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["skill_gap", "gap", "linked_skill"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["target_talents", "talents", "participants"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["status", "state"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["priority"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["expected_impact", "impact"])}</Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                    </div>
                </TableCard.Root>
            ) : null}

            <ModalOverlay isOpen={open} onOpenChange={setOpen} isDismissable>
                <Modal>
                    <Dialog className="max-w-lg rounded-2xl border border-secondary bg-primary p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-primary">{t("common:rhTraining.modalTitle")}</h2>
                        <p className="mt-2 text-sm text-tertiary">{t("common:rhTraining.modalHint")}</p>
                        <textarea
                            className="mt-4 w-full rounded-lg border border-secondary bg-primary px-3 py-2 font-mono text-sm text-primary"
                            rows={8}
                            value={bodyJson}
                            onChange={(e) => setBodyJson(e.target.value)}
                        />
                        {err ? <p className="mt-2 text-sm text-error-primary">{err}</p> : null}
                        <div className="mt-4 flex justify-end gap-2">
                            <Button color="secondary" size="sm" onClick={() => setOpen(false)}>
                                {t("common:cancel")}
                            </Button>
                            <Button color="primary" size="sm" isLoading={saving} onClick={() => void submit()}>
                                {t("common:rhTraining.submit")}
                            </Button>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </WorkspacePageShell>
    );
}
