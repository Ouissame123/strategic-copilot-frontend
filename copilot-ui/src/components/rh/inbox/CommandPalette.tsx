import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { RhRequestRow } from "@/components/rh-requests/manager-requests/RequestCard";
import { getRequestTitle } from "@/lib/rh-request-display";
import { cx } from "@/utils/cx";

type CommandPaletteProps = {
    open: boolean;
    items: RhRequestRow[];
    onClose: () => void;
    onSelect: (item: RhRequestRow) => void;
    onFilterUrgent?: () => void;
    onResetFilters?: () => void;
};

export function CommandPalette({
    open,
    items,
    onClose,
    onSelect,
    onFilterUrgent,
    onResetFilters,
}: CommandPaletteProps) {
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (open) {
            setQuery("");
            setActiveIndex(0);
        }
    }, [open]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items.slice(0, 12);
        return items
            .filter((item) => getRequestTitle(item).toLowerCase().includes(q))
            .slice(0, 12);
    }, [items, query]);

    useEffect(() => {
        if (activeIndex >= filtered.length) setActiveIndex(0);
    }, [filtered.length, activeIndex]);

    if (!open) return null;

    const quickActions = [
        onFilterUrgent ? { id: "urgent", label: "Filtrer les urgents", run: onFilterUrgent } : null,
        onResetFilters ? { id: "reset", label: "Réinitialiser les filtres", run: onResetFilters } : null,
    ].filter(Boolean) as { id: string; label: string; run: () => void }[];

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-[60] animate-inbox-fade-in bg-black/30"
                aria-label="Fermer"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                className="fixed top-[15%] left-1/2 z-[61] w-full max-w-lg -translate-x-1/2 animate-inbox-fade-in overflow-hidden rounded-lg border border-ws-border bg-ws-card shadow-lg"
            >
                <div className="flex items-center gap-2 border-b border-ws-border-subtle px-3 py-2.5">
                    <Search className="size-4 text-ws-muted" aria-hidden />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher une demande…"
                        className="flex-1 bg-transparent text-sm text-ws-primary outline-none placeholder:text-ws-faint"
                        onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
                            } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setActiveIndex((i) => Math.max(0, i - 1));
                            } else if (e.key === "Enter" && filtered[activeIndex]) {
                                onSelect(filtered[activeIndex]);
                                onClose();
                            } else if (e.key === "Escape") {
                                onClose();
                            }
                        }}
                    />
                    <kbd className="rounded border border-ws-border-subtle bg-ws-muted-surface px-1.5 py-0.5 text-[10px] text-ws-muted">
                        Esc
                    </kbd>
                </div>
                <ul className="max-h-72 overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                        <li className="px-4 py-6 text-center text-sm text-ws-muted">Aucun résultat</li>
                    ) : (
                        filtered.map((item, index) => (
                            <li key={String(item.id)}>
                                <button
                                    type="button"
                                    className={cx(
                                        "flex w-full px-4 py-2.5 text-left text-sm transition",
                                        index === activeIndex ? "bg-ws-subtle text-ws-primary" : "text-ws-secondary hover:bg-ws-subtle",
                                    )}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => {
                                        onSelect(item);
                                        onClose();
                                    }}
                                >
                                    {getRequestTitle(item)}
                                </button>
                            </li>
                        ))
                    )}
                </ul>
                {quickActions.length > 0 && !query.trim() ? (
                    <div className="border-t border-ws-border-subtle px-2 py-2">
                        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ws-faint">
                            Actions rapides
                        </p>
                        {quickActions.map((action) => (
                            <button
                                key={action.id}
                                type="button"
                                className="w-full rounded px-2 py-1.5 text-left text-sm text-ws-secondary hover:bg-ws-subtle"
                                onClick={() => {
                                    action.run();
                                    onClose();
                                }}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
        </>
    );
}
