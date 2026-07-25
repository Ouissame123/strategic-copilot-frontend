import { Folder } from "lucide-react";
import { Button } from "@/components/base/buttons/button";

type ProjectsEmptyStateProps = {
    title: string;
    description?: string;
    onNewProject?: () => void;
};

export function ProjectsEmptyState({ title, description, onNewProject }: ProjectsEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-secondary/70 bg-secondary_subtle/40 px-6 py-14 text-center dark:bg-secondary/20">
            <Folder className="mb-3 size-10 text-quaternary" aria-hidden />
            <h2 className="text-base font-semibold text-primary">{title}</h2>
            {description ? <p className="mt-2 max-w-md text-sm text-tertiary">{description}</p> : null}
            {onNewProject ? (
                <Button type="button" color="secondary" size="sm" className="mt-4" onClick={onNewProject}>
                    Nouveau projet
                </Button>
            ) : null}
        </div>
    );
}
