import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { Table, TableCard } from "@/components/application/table/table";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useRhActionsListQuery } from "@/hooks/use-rh-actions-query";
import { asRecord } from "@/utils/unwrap-api-payload";

function parseActionRows(raw: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(raw)) return raw.map((x) => asRecord(x));
    const r = asRecord(raw);
    if (Array.isArray(r.items)) return r.items.map((x) => asRecord(x));
    if (Array.isArray(r.data)) return r.data.map((x) => asRecord(x));
    return [];
}

function cell(row: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = row[k];
        if (v != null && String(v).trim() !== "") return String(v);
    }
    return "—";
}

export default function RhActionsWorkspacePage() {
    const { t } = useTranslation("common");
    useCopilotPage("staffing", "File d’actions RH");

    const { data, isLoading, isError, error, refetch } = useRhActionsListQuery();
    const rows = useMemo(() => parseActionRows(data), [data]);

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH"
            title="File d’actions"
            description="Demandes émises par les managers (POST /api/rh/actions). Statut renvoyé par le serveur."
        >
            {isLoading ? (
                <div className="flex min-h-48 items-center justify-center rounded-2xl border border-secondary bg-primary p-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("loading")} />
                </div>
            ) : isError ? (
                <div className="rounded-2xl border border-secondary bg-primary p-6">
                    <EmptyState size="md">
                        <EmptyState.Content>
                            <EmptyState.Title>Impossible de charger la file</EmptyState.Title>
                            <EmptyState.Description>{error instanceof Error ? error.message : String(error)}</EmptyState.Description>
                        </EmptyState.Content>
                        <EmptyState.Footer>
                            <button
                                type="button"
                                className="text-sm font-semibold text-brand-secondary underline"
                                onClick={() => void refetch()}
                            >
                                {t("retry")}
                            </button>
                        </EmptyState.Footer>
                    </EmptyState>
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-secondary bg-primary p-8">
                    <EmptyState size="md">
                        <EmptyState.Content>
                            <EmptyState.Title>Aucune demande</EmptyState.Title>
                            <EmptyState.Description>La liste est vide ou le format de réponse ne contient pas encore d’éléments.</EmptyState.Description>
                        </EmptyState.Content>
                    </EmptyState>
                </div>
            ) : (
                <TableCard.Root size="md">
                    <TableCard.Header title="Demandes entrantes" />
                    <Table aria-label="File RH" className="min-w-full">
                        <Table.Header>
                            <Table.Head id="proj" label="Projet" isRowHeader />
                            <Table.Head id="type" label="Type" />
                            <Table.Head id="msg" label="Message" />
                            <Table.Head id="st" label="Statut" />
                        </Table.Header>
                        <Table.Body items={rows.map((r, i) => ({ ...r, id: String(r.id ?? `row-${i}`) }))}>
                            {(row) => (
                                <Table.Row id={String(row.id)}>
                                    <Table.Cell className="max-w-[12rem]">
                                        <span className="font-medium text-primary">{cell(row, ["project_name", "project_id"])}</span>
                                    </Table.Cell>
                                    <Table.Cell>{cell(row, ["type", "action_type"])}</Table.Cell>
                                    <Table.Cell className="max-w-xl">
                                        <span className="line-clamp-3 text-sm text-secondary">{cell(row, ["message", "body", "description"])}</span>
                                    </Table.Cell>
                                    <Table.Cell>{cell(row, ["status", "state"])}</Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table>
                </TableCard.Root>
            )}
        </WorkspacePageShell>
    );
}
