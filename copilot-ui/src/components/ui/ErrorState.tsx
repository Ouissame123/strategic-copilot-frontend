import type { ReactNode } from "react";
import { AlertCircle } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";

export interface ErrorStateProps {
    title?: string;
    message?: string;
    /** Détail technique (ex. méthode + code HTTP) — court, lisible. */
    detail?: string;
    /** Sous-texte d’aide (ex. prérequis webhook). */
    hint?: string;
    onRetry?: () => void;
    retryLabel?: string;
    className?: string;
    children?: ReactNode;
}

export function ErrorState({
    title = "Erreur",
    message = "Une erreur est survenue. Vérifiez votre connexion ou réessayez.",
    detail,
    hint,
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
                    <EmptyState.Description>
                        <span className="block">{message}</span>
                        {detail ? (
                            <code className="mt-2 block rounded-lg bg-secondary/60 px-3 py-2 font-mono text-xs text-secondary">{detail}</code>
                        ) : null}
                        {hint ? <p className="mt-3 text-sm text-tertiary">{hint}</p> : null}
                    </EmptyState.Description>
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
