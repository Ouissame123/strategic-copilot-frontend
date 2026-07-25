import type { SkillsTab } from "@/types/talent-skills";
import { SKILLS_TABS } from "./talent-skills-ui";
import { TALENT_SEGMENT_ACTIVE, TALENT_SEGMENT_IDLE, TALENT_SEGMENTED } from "@/components/talent/ui/talent-workspace-ui";
import { cx } from "@/utils/cx";

type SkillsTabsProps = {
    tab: SkillsTab;
    mineCount?: number;
    gapsCount?: number;
    onTabChange: (tab: SkillsTab) => void;
};

export function SkillsTabs({ tab, mineCount, gapsCount, onTabChange }: SkillsTabsProps) {
    return (
        <div className={TALENT_SEGMENTED} role="tablist" aria-label="Sections compétences">
            {SKILLS_TABS.map((item) => {
                const selected = tab === item.value;
                const count =
                    item.value === "mine" ? mineCount : item.value === "gaps" ? gapsCount : undefined;
                return (
                    <button
                        key={item.value}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        id={`skills-tab-${item.value}`}
                        onClick={() => onTabChange(item.value)}
                        className={cx(
                            "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition",
                            selected ? TALENT_SEGMENT_ACTIVE : TALENT_SEGMENT_IDLE,
                        )}
                    >
                        {item.label}
                        {count != null ? (
                            <span
                                className={cx(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                                    selected ? "bg-brand-primary/15 text-brand-secondary" : "bg-secondary text-tertiary",
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
