import type { RhActionSource } from "@/lib/classifySource";
import { cx } from "@/utils/cx";

export type InboxSourceTabId = RhActionSource | "all";

export const INBOX_SOURCE_TABS: {
    id: InboxSourceTabId;
    label: string;
    kbd: string;
}[] = [
    { id: "all", label: "Tous", kbd: "1" },
    { id: "manager", label: "Manager", kbd: "2" },
    { id: "watchdog", label: "Watchdog", kbd: "3" },
    { id: "strategist", label: "Strategist", kbd: "4" },
    { id: "analyst", label: "Analyst", kbd: "5" },
];

type InboxSourceTabsProps = {
    active: InboxSourceTabId;
    counts: Record<InboxSourceTabId, number>;
    onChange: (id: InboxSourceTabId) => void;
};

export function InboxSourceTabs({ active, counts, onChange }: InboxSourceTabsProps) {
    return (
        <nav
            className="scrollbar-hide -mx-1 flex items-center gap-1 overflow-x-auto border-b border-ws-border-subtle px-1 pb-px"
            role="tablist"
            aria-label="Filtrer par source"
        >
            {INBOX_SOURCE_TABS.map((tab) => {
                const count = counts[tab.id] ?? 0;
                const isActive = active === tab.id;
                if (tab.id !== "all" && count === 0 && !isActive) return null;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(tab.id)}
                        className={cx(
                            "shrink-0 rounded-t-md border-b-2 px-3 py-2 text-sm transition",
                            isActive
                                ? "border-ws-accent text-ws-primary font-medium"
                                : "border-transparent text-ws-muted hover:text-ws-secondary hover:bg-ws-subtle",
                        )}
                    >
                        {tab.label}
                        <span className="ml-1.5 text-xs tabular-nums opacity-60">{count}</span>
                    </button>
                );
            })}
        </nav>
    );
}
