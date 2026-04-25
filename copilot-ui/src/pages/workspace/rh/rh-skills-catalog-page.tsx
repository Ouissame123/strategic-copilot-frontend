import { useTranslation } from "react-i18next";
import { Table, TableCard } from "@/components/application/table/table";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useSkills } from "@/hooks/crud/skills";
import { pickCell } from "@/utils/rh-api-parse";

export default function RhSkillsCatalogPage() {
    const { t } = useTranslation(["common", "nav", "dataCrud"]);
    const { skills, loading, error } = useSkills();
    useCopilotPage("none", t("nav:rhNavSkills"));

    const rows = skills.map((s) => ({ ...s, id: s.id }));

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH"
            title={t("nav:rhNavSkills")}
            description={t("common:rhSkills.description")}
        >
            {loading ? (
                <div className="flex min-h-48 items-center justify-center rounded-2xl border border-secondary bg-primary p-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("dataCrud:loading")} />
                </div>
            ) : error ? (
                <p className="text-sm text-error-primary">{error}</p>
            ) : (
                <TableCard.Root size="md">
                    <TableCard.Header title={t("common:rhSkills.tableTitle")} />
                    <div className="overflow-x-auto">
                        <Table aria-label="Compétences" className="min-w-full">
                            <Table.Header>
                                <Table.Head id="n" label={t("common:rhSkills.colName")} isRowHeader />
                                <Table.Head id="c" label={t("common:rhSkills.colCategory")} />
                                <Table.Head id="d" label={t("common:rhSkills.colDistribution")} />
                                <Table.Head id="t" label={t("common:rhSkills.colTalentCount")} />
                                <Table.Head id="s" label={t("common:rhSkills.colScarcity")} />
                            </Table.Header>
                            <Table.Body items={rows}>
                                {(row) => (
                                    <Table.Row id={row.id}>
                                        <Table.Cell className="font-medium">{pickCell(row, ["name", "title"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["category", "skill_category"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["level_distribution", "distribution"])}</Table.Cell>
                                        <Table.Cell className="tabular-nums">{pickCell(row, ["talent_count", "holders_count", "count"])}</Table.Cell>
                                        <Table.Cell>{pickCell(row, ["scarcity", "scarcity_label", "priority"])}</Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                    </div>
                </TableCard.Root>
            )}
        </WorkspacePageShell>
    );
}
