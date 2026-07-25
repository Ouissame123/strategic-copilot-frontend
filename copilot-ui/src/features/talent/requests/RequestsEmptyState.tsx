import { Inbox } from "lucide-react";
import { Button } from "@/components/base/buttons/button";

type RequestsEmptyStateProps = {
    title: string;
    description?: string;
    onNewRequest?: () => void;
};

export function RequestsEmptyState({ title, description, onNewRequest }: RequestsEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-secondary/70 bg-secondary_subtle/40 px-6 py-14 text-center dark:border-secondary/60 dark:bg-secondary/20">
            <Inbox className="mb-3 size-10 text-quaternary" aria-hidden />
            <h2 className="text-base font-semibold text-primary">{title}</h2>
            {description ? <p className="mt-2 max-w-md text-sm text-tertiary">{description}</p> : null}
            {onNewRequest ? (
                <Button type="button" color="secondary" size="sm" className="mt-4" onClick={onNewRequest}>
                    Nouvelle demande
                </Button>
            ) : null}
        </div>
    );
}
