import { useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Table, TableCard } from "@/components/application/table/table";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePatchRhActionMutation, useRhActionsListQuery } from "@/hooks/use-rh-actions-query";
import { rowsFromRhPayload, pickCell } from "@/utils/rh-api-parse";

function statusKey(raw: unknown): string {
    return String(raw ?? "")
        .trim()
        .toLowerCase();
}

function isFinalStatus(s: string): boolean {
    if (!s) return false;
    return (
        s.includes("accept") ||
        s.includes("refus") ||
        s.includes("reject") ||
        s.includes("clos") ||
        s.includes("cancel") ||
        s.includes("termin") ||
        s.includes("done")
    );
}

function StatusBadge({ status }: { status: string }) {
    const s = statusKey(status);
    if (s.includes("pending") || s.includes("open") || s.includes("new") || s.includes("submitted") || s.includes("attente")) {
        return (
            <Badge type="pill-color" size="sm" color="warning">
                {status || "—"}
            </Badge>
        );
    }
    if (s.includes("accept")) {
        return (
            <Badge type="pill-color" size="sm" color="success">
                {status}
            </Badge>
        );
    }
    if (s.includes("refus") || s.includes("reject")) {
        return (
            <Badge type="pill-color" size="sm" color="error">
                {status}
            </Badge>
        );
    }
    return (
        <Badge type="pill-color" size="sm" color="gray">
            {status || "—"}
        </Badge>
    );
}

export default function RhManagerRequestsPage() {
    const { t } = useTranslation(["common", "nav"]);
    useCopilotPage("staffing", t("nav:rhNavManagerRequests"));

    const q = useRhActionsListQuery();
    const patch = usePatchRhActionMutation();

    const rows = useMemo(() => {
        const raw = rowsFromRhPayload(q.data ?? []);
        return raw.map((r, i) => ({ ...r, id: String(r.id ?? r.request_id ?? `a-${i}`) }));
    }, [q.data]);

    const setStatus = async (id: string, status: string) => {
        await patch.mutateAsync({ id, body: { status } });
    };

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH"
            title={t("nav:rhNavManagerRequests")}
            description={t("common:rhRequests.description")}
        >
            <div className="mb-4 flex flex-wrap gap-2">
                <Button color="secondary" size="sm" onClick={() => void q.refetch()} isLoading={q.isFetching}>
                    {t("common:retry")}
                </Button>
                <Link to="/workspace/rh/mobility" className="text-sm font-semibold text-brand-secondary underline">
                    {t("common:rhRequests.openMobility")}
                </Link>
            </div>

            {q.isLoading ? <p className="text-sm text-tertiary">{t("common:loading")}</p> : null}
            {q.isError ? (
                <p className="text-sm text-error-primary">{q.error instanceof Error ? q.error.message : String(q.error)}</p>
            ) : null}

            {!q.isLoading && rows.length === 0 ? (
                <p className="text-sm text-tertiary">{t("common:rhRequests.empty")}</p>
            ) : !q.isLoading ? (
                <TableCard.Root size="md">
                    <TableCard.Header title={t("common:rhRequests.tableTitle")} />
                    <div className="overflow-x-auto">
                        <Table aria-label="Demandes managers" className="min-w-full">
                            <Table.Header>
                                <Table.Head id="m" label={t("common:rhRequests.colManager")} isRowHeader />
                                <Table.Head id="ty" label={t("common:rhRequests.colType")} />
                                <Table.Head id="p" label={t("common:rhRequests.colProject")} />
                                <Table.Head id="pr" label={t("common:rhRequests.colPriority")} />
                                <Table.Head id="msg" label={t("common:rhRequests.colMessage")} />
                                <Table.Head id="st" label={t("common:rhRequests.colStatus")} />
                                <Table.Head id="a" label="" />
                            </Table.Header>
                            <Table.Body items={rows}>
                                {(row) => {
                                    const st = pickCell(row, ["status", "state"]);
                                    const finalized = isFinalStatus(statusKey(st));
                                    return (
                                        <Table.Row id={row.id}>
                                            <Table.Cell>{pickCell(row, ["manager_name", "manager_id", "requester"])}</Table.Cell>
                                            <Table.Cell>{pickCell(row, ["type", "action_type", "request_type"])}</Table.Cell>
                                            <Table.Cell>{pickCell(row, ["project_name", "project_id"])}</Table.Cell>
                                            <Table.Cell>{pickCell(row, ["priority"])}</Table.Cell>
                                            <Table.Cell className="max-w-md text-sm text-secondary">
                                                {pickCell(row, ["message", "body", "description"])}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <StatusBadge status={st} />
                                            </Table.Cell>
                                            <Table.Cell className="space-x-2 whitespace-nowrap">
                                                <Button
                                                    size="sm"
                                                    color="primary"
                                                    isLoading={patch.isPending}
                                                    isDisabled={finalized}
                                                    onClick={() => void setStatus(String(row.id), "accepted")}
                                                >
                                                    {t("common:rhRequests.accept")}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    color="secondary"
                                                    isLoading={patch.isPending}
                                                    isDisabled={finalized}
                                                    onClick={() => void setStatus(String(row.id), "refused")}
                                                >
                                                    {t("common:rhRequests.refuse")}
                                                </Button>
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                }}
                            </Table.Body>
                        </Table>
                    </div>
                </TableCard.Root>
            ) : null}
        </WorkspacePageShell>
    );
}
