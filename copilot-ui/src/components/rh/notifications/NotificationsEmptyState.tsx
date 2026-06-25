import { BellOff, SearchX } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TriggerScanButton } from "./TriggerScanButton";

type NotificationsEmptyStateProps = {
    variant: "inbox-empty" | "no-results" | "filtered-read";
    onReset?: () => void;
};

export function NotificationsEmptyState({ variant, onReset }: NotificationsEmptyStateProps) {
    if (variant === "inbox-empty") {
        return (
            <EmptyState size="md" className="py-12">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon color="gray" icon={BellOff} />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>Tout est sous contrôle</EmptyState.Title>
                    <EmptyState.Description>
                        Aucune alerte active. L&apos;IA continue de surveiller en arrière-plan.
                    </EmptyState.Description>
                </EmptyState.Content>
                <EmptyState.Footer>
                    <TriggerScanButton />
                </EmptyState.Footer>
            </EmptyState>
        );
    }

    return (
        <EmptyState size="md" className="py-12">
            <EmptyState.Header>
                <EmptyState.FeaturedIcon color="gray" icon={SearchX} />
            </EmptyState.Header>
            <EmptyState.Content>
                <EmptyState.Title>Aucune notification ne correspond</EmptyState.Title>
                <EmptyState.Description>
                    {variant === "filtered-read"
                        ? "Aucune notification lue sur cette page."
                        : "Essayez de changer les filtres ou réinitialiser."}
                </EmptyState.Description>
            </EmptyState.Content>
            {onReset ? (
                <EmptyState.Footer>
                    <Button color="secondary" size="sm" onPress={onReset}>
                        Réinitialiser
                    </Button>
                </EmptyState.Footer>
            ) : null}
        </EmptyState>
    );
}
