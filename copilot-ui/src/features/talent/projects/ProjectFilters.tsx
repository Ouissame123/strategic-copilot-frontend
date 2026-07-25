import type { ProjectTab, TalentProjectsSummary } from "@/types/talent-projects";
import { TRIAGE_SEGMENT_ACTIVE, TRIAGE_SEGMENT_IDLE, TRIAGE_SEGMENTED } from "@/components/manager/inbox-triage/triage-ui";
import { PROJECT_TABS } from "./talent-projects-ui";
import { cx } from "@/utils/cx";

type ProjectFiltersProps = {
    tab: ProjectTab;
    summary?: TalentProjectsSummary;
    onTabChange: (tab: ProjectTab) => void;
};

function tabCount(tab: ProjectTab, summary?: TalentProjectsSummary): number | undefined {
    if (!summary) return undefined;
    if (tab === "all") return summary.total;
    return summary.by_tab[tab];
}

export function ProjectFilters({ tab, summary, onTabChange }: ProjectFiltersProps) {
    return (
        <div className={TRIAGE_SEGMENTED} role="group" aria-label="Filtrer les projets">
            {PROJECT_TABS.map((item) => {
                const count = tabCount(item.value, summary);
                const pressed = tab === item.value;
                return (
                    <button
                        key={item.value}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => onTabChange(item.value)}
                        className={cx(
                            "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition",
                            pressed ? TRIAGE_SEGMENT_ACTIVE : TRIAGE_SEGMENT_IDLE,
                        )}
                    >
                        {item.label}
                        {count != null ? (
                            <span
                                className={cx(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                                    pressed ? "bg-brand-primary/15 text-brand-secondary" : "bg-secondary text-tertiary",
                                )}
                            >
                                {count}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
