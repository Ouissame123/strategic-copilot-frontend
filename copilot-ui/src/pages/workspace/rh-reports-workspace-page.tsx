import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Table } from "@/components/application/table/table";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { toUserMessage } from "@/hooks/crud/error-message";
import { getProjectsMonitoring } from "@/api/projects.api";
import { Button } from "@/components/base/buttons/button";
import { ErrorState } from "@/components/ui/ErrorState";
import { ApiError } from "@/utils/apiClient";

function formatCellValue(v: unknown): string {
    if (v == null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
}

function mapMonitoringError(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.status === 400) return `Erreur 400: ${toUserMessage(err)}`;
        if (err.status === 404) return `Erreur 404: ${toUserMessage(err)}`;
        return toUserMessage(err);
    }
    if (err instanceof Error) return `Erreur réseau: ${err.message}`;
    return "Erreur réseau";
}

type RowWithId = Record<string, unknown> & { id: string };

export default function RhReportsWorkspacePage() {
    const { t } = useTranslation(["common", "dataCrud"]);
    useCopilotPage("none", t("workspace.rhReportsTitle"));
    const [summary, setSummary] = useState<Record<string, unknown>>({});
    const [items, setItems] = useState<Record<string, unknown>[]>([]);
    const [rawResponse, setRawResponse] = useState<unknown>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadMonitoring = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getProjectsMonitoring();
            setRawResponse(response.raw);
            setSummary(response.summary);
            setItems(response.items);
        } catch (err) {
            setError(mapMonitoringError(err));
            setRawResponse(null);
            setSummary({});
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadMonitoring();
    }, []);

    const summaryCards = useMemo(() => {
        return Object.entries(summary)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([label, value]) => ({ label, value }));
    }, [summary]);

    const columnKeys = useMemo(() => {
        const keys = new Set<string>();
        for (const it of items) {
            for (const k of Object.keys(it)) keys.add(k);
        }
        return Array.from(keys).sort((a, b) => a.localeCompare(b));
    }, [items]);

    const tableRows = useMemo<RowWithId[]>(() => {
        return items.map((row, index) => ({
            ...row,
            id: String(row.project_id ?? row.id ?? `row-${index}`),
        }));
    }, [items]);

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow={t("workspace.rhReportsEyebrow")}
            title={t("workspace.rhReportsTitle")}
            description={t("workspace.rhReportsDesc")}
        >
            <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-3">
                    {summaryCards.length === 0 && !isLoading ? (
                        <div className="col-span-full rounded-2xl border border-dashed border-secondary bg-primary p-4 text-sm text-tertiary">
                            Aucune clé dans <span className="font-mono">summary</span> (réponse vide ou structure inattendue).
                        </div>
                    ) : (
                        summaryCards.map((card) => (
                            <div
                                key={card.label}
                                className="flex min-h-32 flex-col justify-between rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80"
                            >
                                <span className="text-xs font-semibold uppercase tracking-wide text-quaternary">{card.label}</span>
                                <span className="text-2xl font-semibold text-primary">
                                    {isLoading ? "—" : formatCellValue(card.value)}
                                </span>
                                <Button size="sm" color="secondary" onClick={() => void loadMonitoring()} isLoading={isLoading}>
                                    Actualiser
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                {rawResponse != null && (
                    <details className="rounded-2xl border border-secondary bg-primary p-4 text-sm shadow-xs ring-1 ring-secondary/80">
                        <summary className="cursor-pointer font-medium text-secondary">Réponse JSON brute (monitoring projets)</summary>
                        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-tertiary">
                            {JSON.stringify(rawResponse, null, 2)}
                        </pre>
                    </details>
                )}

                {isLoading ? (
                    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-secondary bg-primary p-6 shadow-xs ring-1 ring-secondary/80">
                        <LoadingIndicator type="line-simple" size="md" label={t("dataCrud:loading")} />
                    </div>
                ) : error ? (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80 md:p-6">
                            <ErrorState
                                title="Endpoint non disponible"
                                message="Le service de rapports ne répond pas ou le webhook n8n n’est pas enregistré."
                                detail="GET /api/projects/monitoring · erreur côté serveur"
                                hint="Ce module nécessite un webhook n8n actif et une intégration monitoring opérationnelle."
                                onRetry={() => void loadMonitoring()}
                                retryLabel={t("dataCrud:retry")}
                            />
                        </div>
                        <div className="pointer-events-none opacity-35">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-quaternary">
                                Aperçu (données fictives — actif quand l’endpoint répond)
                            </p>
                            <div className="grid gap-4 md:grid-cols-3">
                                {[
                                    { k: "Taux de staffing", v: "— %" },
                                    { k: "Risques détectés", v: "—" },
                                    { k: "Adoption Copilot", v: "— %" },
                                ].map((card) => (
                                    <div
                                        key={card.k}
                                        className="flex min-h-28 flex-col justify-between rounded-2xl border border-dashed border-secondary bg-secondary/20 p-4"
                                    >
                                        <span className="text-xs font-semibold uppercase text-quaternary">{card.k}</span>
                                        <span className="text-2xl font-semibold text-primary">{card.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-secondary bg-primary p-6 shadow-xs ring-1 ring-secondary/80">
                        <EmptyState size="md">
                            <EmptyState.Content>
                                <EmptyState.Title>{t("dataCrud:empty")}</EmptyState.Title>
                            </EmptyState.Content>
                        </EmptyState>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80">
                        <div className="w-full overflow-x-auto">
                            <Table aria-label="Monitoring projets" className="min-w-full">
                                <Table.Header>
                                    {columnKeys.map((key) => (
                                        <Table.Head key={key} id={key} label={key} />
                                    ))}
                                </Table.Header>
                                <Table.Body items={tableRows}>
                                    {(row) => (
                                        <Table.Row id={row.id}>
                                            {columnKeys.map((key) => (
                                                <Table.Cell key={key} className="max-w-[min(28rem,40vw)] whitespace-pre-wrap break-words text-sm">
                                                    {formatCellValue(row[key])}
                                                </Table.Cell>
                                            ))}
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
        </WorkspacePageShell>
    );
}
