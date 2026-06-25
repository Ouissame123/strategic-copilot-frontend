import type { ProjectTab, TalentProjectsSummary } from "@/types/talent-projects";
import { TALENT_SEGMENT_ACTIVE, TALENT_SEGMENT_IDLE, TALENT_SEGMENTED } from "@/components/talent/ui/talent-workspace-ui";
import { PROJECT_TABS } from "./talent-projects-ui";
import { cx } from "@/utils/cx";

type ProjectsTabsProps = {
    tab: ProjectTab;
    summary?: TalentProjectsSummary;
    onTabChange: (tab: ProjectTab) => void;
};

function tabCount(tab: ProjectTab, summary?: TalentProjectsSummary): number | undefined {
    if (!summary) return undefined;
    if (tab === "all") return summary.total;
    return summary.by_tab[tab];
}

export function ProjectsTabs({ tab, summary, onTabChange }: ProjectsTabsProps) {
    return (
        <div className={TALENT_SEGMENTED}>
            {PROJECT_TABS.map((item) => {
                const count = tabCount(item.value, summary);
                return (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => onTabChange(item.value)}
                        className={cx(
                            "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition",
                            tab === item.value ? TALENT_SEGMENT_ACTIVE : TALENT_SEGMENT_IDLE,
                        )}
                    >
                        {item.label}
                        {count != null ? (
                            <span
                                className={cx(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                                    tab === item.value ? "bg-brand-primary/15 text-brand-secondary" : "bg-secondary text-tertiary",
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
