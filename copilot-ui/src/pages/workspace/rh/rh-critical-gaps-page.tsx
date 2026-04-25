import { useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { Table, TableCard } from "@/components/application/table/table";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useRhCriticalGapsQuery } from "@/hooks/use-rh-workspace-queries";
import { rowsFromRhPayload, pickCell } from "@/utils/rh-api-parse";

export default function RhCriticalGapsPage() {
    const { t } = useTranslation(["common", "nav"]);
    useCopilotPage("projects_list", t("nav:rhNavGaps"));

    const q = useRhCriticalGapsQuery();
    const rows = useMemo(() => {
        const raw = rowsFromRhPayload(q.data ?? []);
        return raw.map((r, i) => ({ ...r, id: String(r.id ?? r.gap_id ?? `g-${i}`) }));
    }, [q.data]);

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH"
            title={t("nav:rhNavGaps")}
            description={t("common:rhGaps.description")}
        >
            {q.isLoading ? <p className="text-sm text-tertiary">{t("common:loading")}</p> : null}
            {q.isError ? (
                <div className="rounded-2xl border border-secondary bg-primary p-4 text-sm text-error-primary">
                    {q.error instanceof Error ? q.error.message : String(q.error)}
                    <Button color="secondary" size="sm" className="mt-2" onClick={() => void q.refetch()}>
                        {t("common:retry")}
                    </Button>
                </div>
            ) : null}

            {q.isSuccess && rows.length === 0 ? (
                <p className="text-sm text-tertiary">{t("common:rhGaps.empty")}</p>
            ) : q.isSuccess ? (
                <TableCard.Root size="md">
                    <TableCard.Header title={t("common:rhGaps.tableTitle")} />
                    <div className="overflow-x-auto">
                        <Table aria-label="Écarts" className="min-w-full">
                            <Table.Header>
                                <Table.Head id="p" label={t("common:rhGaps.colProject")} isRowHeader />
                                <Table.Head id="sk" label={t("common:rhGaps.colSkill")} />
                                <Table.Head id="req" label={t("common:rhGaps.colRequired")} />
                                <Table.Head id="av" label={t("common:rhGaps.colAvailable")} />
                                <Table.Head id="m" label={t("common:rhGaps.colMatches")} />
                                <Table.Head id="u" label={t("common:rhGaps.colUrgency")} />
                                <Table.Head id="a" label="" />
                            </Table.Header>
                            <Table.Body items={rows}>
                                {(row) => (
                                    <Table.Row id={row.id}>
                                        <Table.Cell className="font-medium">{pickCell(row, ["project_name", "project_id"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["missing_skill", "skill_name", "skill"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["required_level", "expected_level"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["available_level", "current_level"])}</Table.Cell>
                                        <Table.Cell className="tabular-nums">{pickCell(row, ["matching_talents_count", "match_count"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["urgency", "impact", "priority"])}</Table.Cell>
                                        <Table.Cell className="space-x-2 whitespace-nowrap">
                                            <Button size="sm" color="secondary" href="/workspace/rh/training-plans">
                                                {t("common:rhGaps.plan")}
                                            </Button>
                                            <Link to="/workspace/rh/manager-requests" className="text-sm font-semibold text-brand-secondary underline">
                                                {t("common:rhGaps.requests")}
                                            </Link>
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                    </div>
                </TableCard.Root>
            ) : null}
        </WorkspacePageShell>
    );
}
