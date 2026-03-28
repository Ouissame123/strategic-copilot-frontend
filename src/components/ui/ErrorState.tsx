import type { ReactNode } from "react";
import { AlertCircle } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";

export interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    retryLabel?: string;
    className?: string;
    children?: ReactNode;
}

export function ErrorState({
    title = "Erreur",
    message = "Une erreur est survenue. Vérifiez votre connexion ou réessayez.",
    onRetry,
    retryLabel = "Réessayer",
    className,
    children,
}: ErrorStateProps) {
    return (
        <div className={className}>
            <EmptyState size="md">
                <EmptyState.Header pattern="none">
                    <EmptyState.FeaturedIcon icon={AlertCircle} color="error" theme="light" />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>{title}</EmptyState.Title>
                    <EmptyState.Description>{message}</EmptyState.Description>
                </EmptyState.Content>
                <EmptyState.Footer>
                    {onRetry && (
                        <Button color="secondary" onClick={onRetry}>
                            {retryLabel}
                        </Button>
                    )}
                    {children}
                </EmptyState.Footer>
            </EmptyState>
        </div>
    );
}
