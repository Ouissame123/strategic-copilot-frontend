import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Search } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { AccountsHealthEmptyState, SkeletonRows } from "@/components/rh/accounts-health/EmptyState";
import { EventBadge } from "@/components/rh/accounts-health/EventBadge";
import { useAccountsAudit } from "@/hooks/use-rh-accounts-audit";
import { formatDateRelative } from "@/utils/format";
import { cx } from "@/utils/cx";

const PERIOD_OPTIONS = [
    { value: "7", label: "7 derniers jours" },
    { value: "30", label: "30 derniers jours" },
    { value: "90", label: "90 derniers jours" },
    { value: "365", label: "1 an" },
];

const INPUT_CLASS =
    "h-9 w-full rounded-lg border border-secondary bg-primary px-2.5 py-1.5 text-sm text-primary outline-none focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25";

function StatusPill({ status }: { status: string }) {
    const s = status.toLowerCase();
    const cls =
        s === "active"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : s === "disabled"
              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              : "bg-secondary_subtle text-secondary";

    return (
        <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", cls)}>{status}</span>
    );
}

export function AuditTimelineTab() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sinceDays, setSinceDays] = useState(30);
    const [offset, setOffset] = useState(0);
    const limit = 50;

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
        return () => window.clearTimeout(t);
    }, [search]);

    const { data, isLoading, isFetching } = useAccountsAudit({
        since_days: sinceDays,
        search: debouncedSearch || undefined,
        limit,
        offset,
    });

    const events = data?.items ?? [];

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1 max-w-md">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-tertiary" />
                    <input
                        type="search"
                        placeholder="Rechercher nom ou email…"
                        className={INPUT_CLASS + " pl-9"}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setOffset(0);
                        }}
                    />
                </div>
                <NativeSelect
                    value={String(sinceDays)}
                    onChange={(e) => {
                        setSinceDays(Number(e.target.value));
                        setOffset(0);
                    }}
                    options={PERIOD_OPTIONS}
                    selectClassName="!h-9 !py-1.5 !text-sm w-44"
                />
            </div>

            {isLoading ? <SkeletonRows count={8} /> : null}

            {!isLoading && events.length === 0 ? (
                <AccountsHealthEmptyState
                    icon={<Clock className="size-12 text-tertiary" aria-hidden />}
                    title="Aucune activité sur cette période"
                    description={`Aucun événement dans les ${sinceDays} derniers jours${debouncedSearch ? ` pour « ${debouncedSearch} »` : ""}.`}
                />
            ) : null}

            {!isLoading && events.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-secondary bg-primary">
                    {events.map((e, idx) => (
                        <div
                            key={`${e.entity_id}-${e.updated_at}-${idx}`}
                            className="flex items-center gap-3 border-b border-secondary px-3 py-2.5 last:border-b-0 hover:bg-secondary_subtle/30"
                        >
                            <EventBadge eventType={e.event_type} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-primary">
                                    <strong>{e.name}</strong>{" "}
                                    <span className="text-tertiary">
                                        ({e.entity_type === "user" ? "utilisateur" : "talent"}
                                        {e.role ? ` · ${e.role}` : ""})
                                    </span>
                                </p>
                                <p className="truncate text-xs text-tertiary">
                                    {e.email} · {formatDateRelative(e.updated_at)}
                                </p>
                            </div>
                            <StatusPill status={e.status} />
                        </div>
                    ))}
                </div>
            ) : null}

            {!isLoading && (data?.count ?? 0) > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-tertiary">
                    <span>
                        {events.length} événement(s) affiché(s)
                        {data && data.count >= limit ? ` · page ${Math.floor(offset / limit) + 1}` : ""}
                        {isFetching ? " · Chargement…" : ""}
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            color="secondary"
                            size="sm"
                            isDisabled={offset === 0}
                            onClick={() => setOffset(Math.max(0, offset - limit))}
                            iconLeading={ChevronLeft}
                        >
                            Précédent
                        </Button>
                        <Button
                            type="button"
                            color="secondary"
                            size="sm"
                            isDisabled={events.length < limit}
                            onClick={() => setOffset(offset + limit)}
                            iconTrailing={ChevronRight}
                        >
                            Suivant
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
