import { useEffect, useState } from "react";
import { Plus, SearchLg } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { RhConversationItem } from "./RhConversationItem";
import { useRhCopilotConversations } from "@/hooks/use-rh-copilot";
import { cx } from "@/utils/cx";

interface Props {
    selectedConversationId?: string;
    onSelectConversation: (id: string | null) => void;
}

export function RhConversationsSidebar({ selectedConversationId, onSelectConversation }: Props) {
    const [statusTab, setStatusTab] = useState<"active" | "archived">("active");
    const [scopeTab, setScopeTab] = useState<"rh" | "manager" | "all">("rh");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const { data, isLoading } = useRhCopilotConversations({
        status: statusTab,
        scope: scopeTab,
        search: debouncedSearch || undefined,
        limit: 50,
    });

    const conversations = data?.conversations ?? [];

    return (
        <div className="flex h-full w-80 shrink-0 flex-col border-r border-secondary">
            <div className="space-y-2 border-b border-secondary p-3">
                <Button
                    type="button"
                    color="secondary"
                    size="sm"
                    className="w-full justify-start"
                    iconLeading={Plus}
                    onClick={() => onSelectConversation(null)}
                >
                    Nouvelle conversation
                </Button>

                <Input
                    size="sm"
                    placeholder="Rechercher…"
                    value={search}
                    onChange={setSearch}
                    icon={SearchLg}
                    aria-label="Rechercher une conversation RH"
                />

                <div className="grid h-8 grid-cols-2 gap-1 rounded-lg bg-secondary_subtle p-0.5">
                    {(["active", "archived"] as const).map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setStatusTab(value)}
                            className={cx(
                                "rounded-md text-xs font-medium transition-colors",
                                statusTab === value
                                    ? "bg-primary text-primary shadow-xs"
                                    : "text-fg-tertiary hover:text-primary",
                            )}
                        >
                            {value === "active"
                                ? `Actives (${data?.distribution.active ?? 0})`
                                : `Archivées (${data?.distribution.archived ?? 0})`}
                        </button>
                    ))}
                </div>

                <div className="grid h-7 grid-cols-3 gap-1 rounded-lg bg-secondary_subtle p-0.5">
                    {(
                        [
                            { value: "rh" as const, label: "Mes conv." },
                            { value: "manager" as const, label: "Managers" },
                            { value: "all" as const, label: "Toutes" },
                        ] as const
                    ).map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setScopeTab(value)}
                            className={cx(
                                "rounded-md text-[10px] font-medium transition-colors",
                                scopeTab === value
                                    ? "bg-primary text-primary shadow-xs"
                                    : "text-fg-tertiary hover:text-primary",
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                    {isLoading ? (
                        <div className="p-4 text-center text-xs text-fg-quaternary">Chargement…</div>
                    ) : null}
                    {!isLoading && conversations.length === 0 ? (
                        <div className="p-4 text-center text-xs text-fg-quaternary">Aucune conversation</div>
                    ) : null}
                    {conversations.map((c) => (
                        <RhConversationItem
                            key={c.id}
                            conversation={c}
                            isActive={c.id === selectedConversationId}
                            onClick={() => onSelectConversation(c.id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
