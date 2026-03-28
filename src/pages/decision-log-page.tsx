import { useTranslation } from "react-i18next";
import { Table, TableCard } from "@/components/application/table/table";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { Badge } from "@/components/base/badges/badges";
import { getDecisionConfig } from "@/utils/decisionConfig";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDecisionLog } from "@/hooks/use-decision-log";

export function DecisionLogPage() {
    const { t, i18n } = useTranslation("decisionLog");
    const { entries, isLoading, error, retry } = useDecisionLog();
    useCopilotPage("decision-log", t("title"));

    const locale =
        i18n.language.startsWith("ar") ? "ar-EG" : i18n.language.startsWith("en") ? "en-US" : "fr-FR";

    if (isLoading) {
        return <LoadingState label={t("loading")} size="md" />;
    }

    if (error) {
        return <ErrorState title={t("errorTitle")} message={error} onRetry={retry} retryLabel={t("errorRetry")} />;
    }

    if (entries.length === 0) {
        return (
            <div className="space-y-6">
                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">{t("title")}</h1>
                <p className="text-secondary">{t("emptyIntro")}</p>
                <EmptyState size="md">
                    <EmptyState.Header>
                        <EmptyState.FeaturedIcon color="gray" />
                    </EmptyState.Header>
                    <EmptyState.Content>
                        <EmptyState.Title>{t("emptyTitle")}</EmptyState.Title>
                        <EmptyState.Description>{t("emptyDescription")}</EmptyState.Description>
                    </EmptyState.Content>
                </EmptyState>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">{t("title")}</h1>
                <p className="mt-2 text-sm text-tertiary">{t("subtitle")}</p>
            </header>

            <TableCard.Root size="sm">
                <TableCard.Header title={t("table.title")} description={t("table.description")} />
                <Table aria-label={t("table.ariaLabel")} className="min-w-full">
                    <Table.Header>
                        <Table.Head id="date" label={t("table.columns.date")} />
                        <Table.Head id="score" label={t("table.columns.score")} />
                        <Table.Head id="decision" label={t("table.columns.decision")} />
                        <Table.Head id="justification" label={t("table.columns.justification")} />
                        <Table.Head id="version" label={t("table.columns.rulesVersion")} />
                    </Table.Header>
                    <Table.Body items={entries}>
                        {(entry) => {
                            const config = getDecisionConfig(entry.decision);
                            return (
                                <Table.Row id={entry.id}>
                                    <Table.Cell>
                                        <span className="text-sm text-tertiary">
                                            {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                                                new Date(entry.date),
                                            )}
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <span className="text-sm font-medium text-primary">
                                            {entry.score.toFixed(1)}
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge type="pill-color" size="sm" color={config.badgeColor}>
                                            {t(`decision.${entry.decision}`)}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <span className="line-clamp-2 text-sm text-tertiary">
                                            {entry.justification || "—"}
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <span className="text-sm text-tertiary">{entry.rules_version ?? "—"}</span>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        }}
                    </Table.Body>
                </Table>
            </TableCard.Root>
        </div>
    );
}
