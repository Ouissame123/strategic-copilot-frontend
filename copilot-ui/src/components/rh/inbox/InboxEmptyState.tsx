import { SearchX, Inbox } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { EmptyState } from "@/components/ui/EmptyState";

type InboxEmptyStateProps = {
    variant: "inbox-empty" | "no-results" | "error";
    errorMessage?: string;
    onRetry?: () => void;
    onResetFilters?: () => void;
};

export function InboxEmptyState({ variant, errorMessage, onRetry, onResetFilters }: InboxEmptyStateProps) {
    if (variant === "error") {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
                {errorMessage ?? "Erreur de chargement."}{" "}
                {onRetry ? (
                    <button type="button" className="font-semibold underline" onClick={onRetry}>
                        Réessayer
                    </button>
                ) : null}
            </div>
        );
    }

    if (variant === "inbox-empty") {
        return (
            <EmptyState size="md" className="py-12">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon color="gray" icon={Inbox} />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>Inbox vide</EmptyState.Title>
                    <EmptyState.Description>
                        Aucune action à traiter pour le moment. L&apos;IA et les managers vous notifieront ici.
                    </EmptyState.Description>
                </EmptyState.Content>
            </EmptyState>
        );
    }

    return (
        <EmptyState size="md" className="py-12">
            <EmptyState.Header>
                <EmptyState.FeaturedIcon color="gray" icon={SearchX} />
            </EmptyState.Header>
            <EmptyState.Content>
                <EmptyState.Title>Aucune action ne correspond</EmptyState.Title>
                <EmptyState.Description>Essayez de changer les filtres ou réinitialiser.</EmptyState.Description>
            </EmptyState.Content>
            {onResetFilters ? (
                <EmptyState.Footer>
                    <Button color="secondary" size="sm" onPress={onResetFilters}>
                        Réinitialiser
                    </Button>
                </EmptyState.Footer>
            ) : null}
        </EmptyState>
    );
}
