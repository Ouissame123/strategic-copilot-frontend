import {
    Archive,
    ArchiveRestore,
    Loader2,
    MessageSquarePlus,
    Search,
    Sparkles,
} from "lucide-react";
import { memo } from "react";
import { RhChatConversationRow } from "@/components/rh-chat/RhChatConversationRow";
import type { RhChatConversationListItem, RhChatConversationStatus } from "@/types/rh-chat";
import { cx } from "@/utils/cx";

type RhChatSidebarProps = {
    conversations: RhChatConversationListItem[];
    selectedId: string | null;
    statusFilter: RhChatConversationStatus | "all";
    search: string;
    loading?: boolean;
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (status: RhChatConversationStatus | "all") => void;
    onSelect: (id: string) => void;
    onNewConversation: () => void;
    selectedStatus?: RhChatConversationStatus | null;
    archiving?: boolean;
    onArchive?: () => void;
    onRestore?: () => void;
};

export const RhChatSidebar = memo(function RhChatSidebar({
    conversations,
    selectedId,
    statusFilter,
    search,
    loading,
    onSearchChange,
    onStatusFilterChange,
    onSelect,
    onNewConversation,
    selectedStatus,
    archiving,
    onArchive,
    onRestore,
}: RhChatSidebarProps) {
    return (
        <aside
            className={cx(
                "flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
                "lg:w-[340px] xl:w-[360px] dark:border-slate-700 dark:bg-slate-900",
            )}
        >
            <div className="border-b border-slate-200 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-4 text-white dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <Sparkles className="size-4" aria-hidden />
                    <p className="text-sm font-bold tracking-tight">Conversations</p>
                </div>
                <button
                    type="button"
                    onClick={onNewConversation}
                    className={cx(
                        "mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/15 px-3 py-2.5 text-xs font-semibold backdrop-blur-sm transition",
                        "hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                    )}
                >
                    <MessageSquarePlus className="size-4" aria-hidden />
                    Nouvelle conversation
                </button>
            </div>

            <div className="border-b border-slate-200 p-3 dark:border-slate-700">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" aria-hidden />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Rechercher une conversation…"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {(["active", "archived", "all"] as const).map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => onStatusFilterChange(s)}
                            className={cx(
                                "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition",
                                statusFilter === s
                                    ? "bg-violet-600 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:bg-slate-800 dark:text-slate-300",
                            )}
                        >
                            {s === "active" ? "Actives" : s === "archived" ? "Archivées" : "Toutes"}
                        </button>
                    ))}
                </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {loading ? (
                    <li className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
                        <Loader2 className="size-4 animate-spin text-violet-600" aria-hidden />
                        Chargement des conversations…
                    </li>
                ) : conversations.length === 0 ? (
                    <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-xs text-slate-500 dark:border-slate-700">
                        Aucune conversation pour le moment.
                    </li>
                ) : (
                    conversations.map((c) => (
                        <li key={c.id}>
                            <RhChatConversationRow
                                conversation={c}
                                active={c.id === selectedId}
                                onSelect={() => onSelect(c.id)}
                            />
                        </li>
                    ))
                )}
            </ul>

            {selectedId && (onArchive || onRestore) ? (
                <div className="border-t border-slate-200 p-3 dark:border-slate-700">
                    {selectedStatus === "archived" ? (
                        <button
                            type="button"
                            disabled={archiving}
                            onClick={onRestore}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <ArchiveRestore className="size-4" aria-hidden />
                            Restaurer
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={archiving}
                            onClick={onArchive}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <Archive className="size-4" aria-hidden />
                            Archiver
                        </button>
                    )}
                </div>
            ) : null}
        </aside>
    );
});
