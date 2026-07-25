import { useState, type ReactNode } from "react";
import { SideSheet } from "./SideSheet";

type TruncatedListProps<T> = {
    items: T[];
    max?: number;
    renderItem: (item: T, index: number) => ReactNode;
    getKey: (item: T, index: number) => string;
    sheetTitle: string;
    empty: ReactNode;
    className?: string;
};

export function TruncatedList<T>({
    items,
    max = 5,
    renderItem,
    getKey,
    sheetTitle,
    empty,
    className,
}: TruncatedListProps<T>) {
    const [open, setOpen] = useState(false);
    const visible = items.slice(0, max);
    const remaining = Math.max(0, items.length - max);

    if (items.length === 0) return <>{empty}</>;

    return (
        <div className={className}>
            <ul className="space-y-2">
                {visible.map((item, index) => (
                    <li key={getKey(item, index)}>{renderItem(item, index)}</li>
                ))}
            </ul>
            {remaining > 0 ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="mt-3 text-xs font-medium text-[color:var(--ws-accent)] hover:underline"
                >
                    Voir les {items.length} →
                </button>
            ) : null}
            <SideSheet open={open} onClose={() => setOpen(false)} title={sheetTitle}>
                <ul className="space-y-2">
                    {items.map((item, index) => (
                        <li key={getKey(item, index)}>{renderItem(item, index)}</li>
                    ))}
                </ul>
            </SideSheet>
        </div>
    );
}
