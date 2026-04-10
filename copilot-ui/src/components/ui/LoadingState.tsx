import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { cx } from "@/utils/cx";

export interface LoadingStateProps {
    label?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function LoadingState({ label = "Chargement...", size = "md", className }: LoadingStateProps) {
    return (
        <div
            className={cx(
                "flex min-h-48 items-center justify-center rounded-2xl border border-secondary bg-primary p-8 shadow-xs ring-1 ring-secondary/80",
                className,
            )}
        >
            <LoadingIndicator type="line-simple" size={size} label={label} />
        </div>
    );
}
