import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/base/buttons/button";

type ProjectsEmptyStateProps = {
    icon?: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
};

export function ProjectsEmptyState({ icon: Icon, title, description, actionLabel, onAction }: ProjectsEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/20">
            {Icon ? <Icon className="mb-3 size-10 text-slate-400" aria-hidden /> : null}
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            {description ? <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p> : null}
            {actionLabel && onAction ? (
                <Button type="button" color="primary" size="sm" className="mt-4" onClick={onAction}>
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    );
}
