import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Button } from "@/components/base/buttons/button";
import { useTalentWorkspaceQuery } from "@/hooks/use-talent-workspace-query";
import { unwrapDataPayload } from "@/utils/unwrap-api-payload";

type Props = {
    children: (ctx: { root: Record<string, unknown>; raw: unknown }) => ReactNode;
};

/** Charge le GET workspace talent ; états chargement / erreur partagés. */
export function TalentWorkspaceBoundary({ children }: Props) {
    const { t } = useTranslation("common");
    const { data, isLoading, error, refetch } = useTalentWorkspaceQuery();

    const root = data ? unwrapDataPayload(data) : {};

    if (isLoading) {
        return (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-secondary bg-primary p-8">
                <LoadingIndicator type="line-simple" size="md" label={t("loading")} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-secondary bg-primary p-6">
                <EmptyState size="md">
                    <EmptyState.Content>
                        <EmptyState.Title>Données indisponibles</EmptyState.Title>
                        <EmptyState.Description>{error instanceof Error ? error.message : String(error)}</EmptyState.Description>
                    </EmptyState.Content>
                    <EmptyState.Footer>
                        <Button color="secondary" size="sm" onClick={() => void refetch()}>
                            {t("retry")}
                        </Button>
                    </EmptyState.Footer>
                </EmptyState>
            </div>
        );
    }

    return <>{children({ root, raw: data })}</>;
}
