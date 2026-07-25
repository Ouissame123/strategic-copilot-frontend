import { Plus, Search } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { TALENT_SEGMENT_ACTIVE, TALENT_SEGMENT_IDLE, TALENT_SEGMENTED } from "@/components/talent/ui/talent-workspace-ui";
import type { TalentRequestType, TalentRequestsSummary } from "@/types/talent-requests";
import { cx } from "@/utils/cx";
import {
    REQUEST_TYPE_OPTIONS,
    TALENT_REQUEST_TABS,
    tabCountFromSummary,
    type TalentRequestsTab,
} from "./talent-requests-ui";

type RequestsToolbarProps = {
    tab: TalentRequestsTab;
    typeFilter: TalentRequestType | "all";
    search: string;
    summary?: TalentRequestsSummary;
    onTabChange: (tab: TalentRequestsTab) => void;
    onTypeChange: (type: TalentRequestType | "all") => void;
    onSearchChange: (value: string) => void;
    onNewRequest: () => void;
};

export function RequestsToolbar({
    tab,
    typeFilter,
    search,
    summary,
    onTabChange,
    onTypeChange,
    onSearchChange,
    onNewRequest,
}: RequestsToolbarProps) {
    return (
        <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
            <div className={TALENT_SEGMENTED} role="group" aria-label="Filtrer par statut">
                {TALENT_REQUEST_TABS.map((item) => {
                    const count = tabCountFromSummary(item.value, summary);
                    const pressed = tab === item.value;
                    return (
                        <button
                            key={item.value}
                            type="button"
                            aria-pressed={pressed}
                            onClick={() => onTabChange(item.value)}
                            className={cx(
                                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition",
                                pressed ? TALENT_SEGMENT_ACTIVE : TALENT_SEGMENT_IDLE,
                            )}
                        >
                            {item.label}
                            {count != null ? (
                                <span
                                    className={cx(
                                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                                        pressed
                                            ? "bg-brand-primary/15 text-brand-secondary"
                                            : "bg-secondary text-tertiary",
                                    )}
                                >
                                    {count}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            <NativeSelect
                label="Type de demande"
                value={typeFilter}
                onChange={(e) => onTypeChange(e.target.value as TalentRequestType | "all")}
                className="w-auto shrink-0 **:data-label:sr-only"
                selectClassName="py-2 text-sm"
                options={REQUEST_TYPE_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
            />

            <div className="relative w-full max-w-xs min-w-[10rem] flex-1 sm:flex-none">
                <label htmlFor="talent-requests-search" className="sr-only">
                    Rechercher une demande
                </label>
                <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary"
                    aria-hidden
                />
                <input
                    id="talent-requests-search"
                    type="search"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Rechercher…"
                    className="w-full rounded-lg border border-secondary bg-primary py-2 pl-9 pr-3 text-sm text-primary outline-none placeholder:text-placeholder focus:border-brand-secondary dark:border-secondary"
                />
            </div>

            <Button
                type="button"
                color="primary"
                size="sm"
                iconLeading={Plus}
                className="ml-auto shrink-0"
                onClick={onNewRequest}
            >
                Nouvelle demande
            </Button>
        </div>
    );
}
