import type { TalentFitItem } from "@/hooks/use-project";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";

export interface TalentFitTableProps {
    talents: TalentFitItem[];
    className?: string;
}

const actionToColor = (action: string): "success" | "warning" | "brand" => {
    if (action === "redeploy") return "success";
    if (action === "training") return "warning";
    return "brand";
};

export function TalentFitTable({ talents, className }: TalentFitTableProps) {
    if (talents.length === 0) return null;

    return (
        <section className={cx(className)}>
            <TableCard.Root size="sm">
                <TableCard.Header title="Talents recommandés" description="Adéquation compétences et actions RH." />
                <Table aria-label="Talents fit" className="min-w-full">
                    <Table.Header>
                        <Table.Head id="name" label="Talent" />
                        <Table.Head id="score" label="Skill fit score" />
                        <Table.Head id="action" label="Action" />
                    </Table.Header>
                    <Table.Body items={talents}>
                        {(talent) => (
                            <Table.Row id={talent.id}>
                                <Table.Cell>
                                    <span className="text-sm font-medium text-primary">{talent.name}</span>
                                </Table.Cell>
                                <Table.Cell>
                                    <span className="text-sm text-tertiary">{talent.skill_fit_score.toFixed(1)} / 10</span>
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge type="pill-color" size="sm" color={actionToColor(talent.action)}>
                                        {talent.action}
                                    </Badge>
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table>
            </TableCard.Root>
        </section>
    );
}
