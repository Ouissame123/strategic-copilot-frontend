import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

type AccountsHealthEmptyStateProps = {
    icon: ReactNode;
    title: string;
    description: string;
};

export function AccountsHealthEmptyState({ icon, title, description }: AccountsHealthEmptyStateProps) {
    return (
        <EmptyState size="md" className="py-10">
            <EmptyState.Header>{icon}</EmptyState.Header>
            <EmptyState.Content>
                <EmptyState.Title>{title}</EmptyState.Title>
                <EmptyState.Description>{description}</EmptyState.Description>
            </EmptyState.Content>
        </EmptyState>
    );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-ws-muted-surface" />
            ))}
        </div>
    );
}
