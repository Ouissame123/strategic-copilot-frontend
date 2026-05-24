type DateGroupHeaderProps = {
    label: string;
    count: number;
};

export function DateGroupHeader({ label, count }: DateGroupHeaderProps) {
    return (
        <div className="sticky top-0 z-10 -mx-1 border-b border-secondary/80 bg-primary/95 px-1 py-2 backdrop-blur-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                {label}
                <span className="ml-2 tabular-nums text-quaternary">({count})</span>
            </h3>
        </div>
    );
}
