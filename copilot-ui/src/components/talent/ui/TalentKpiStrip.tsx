import type { ReactNode } from "react";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import {
    TALENT_KPI_CELL,
    TALENT_KPI_CELL_DIVIDER,
    TALENT_KPI_LABEL,
    TALENT_KPI_STRIP,
    TALENT_KPI_TONE_CELL,
    TALENT_KPI_VALUE,
    type TalentKpiTone,
} from "./talent-workspace-ui";
import { cx } from "@/utils/cx";

export type TalentKpiStripItem = {
    key: string;
    label: string;
    value: ReactNode;
    badge?: ReactNode;
    hint?: string;
    tone?: TalentKpiTone;
    tooltip?: string;
};

type TalentKpiStripProps = {
    items: TalentKpiStripItem[];
    isLoading?: boolean;
    skeletonCount?: number;
    className?: string;
};

function KpiCellContent({ item }: { item: TalentKpiStripItem }) {
    return (
        <>
            <p className={TALENT_KPI_LABEL}>{item.label}</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                <span className={TALENT_KPI_VALUE}>{item.value}</span>
                {item.badge}
            </div>
            {item.hint ? <p className="mt-0.5 truncate text-[10px] text-tertiary">{item.hint}</p> : null}
        </>
    );
}

export function TalentKpiStrip({ items, isLoading, skeletonCount = 4, className }: TalentKpiStripProps) {
    if (isLoading) {
        return (
            <div className={cx(TALENT_KPI_STRIP, className)}>
                {Array.from({ length: skeletonCount }).map((_, i) => (
                    <div
                        key={i}
                        className={cx(TALENT_KPI_CELL, TALENT_KPI_CELL_DIVIDER, "h-[3.25rem] animate-pulse bg-secondary/40")}
                    />
                ))}
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className={cx(TALENT_KPI_STRIP, "scrollbar-thin", className)}>
            {items.map((item) => {
                const cellClass = cx(
                    TALENT_KPI_CELL,
                    TALENT_KPI_CELL_DIVIDER,
                    item.tone ? TALENT_KPI_TONE_CELL[item.tone] : undefined,
                );
                const inner = (
                    <div className={cellClass}>
                        <KpiCellContent item={item} />
                    </div>
                );

                if (!item.tooltip) {
                    return <div key={item.key} className="contents">{inner}</div>;
                }

                return (
                    <Tooltip key={item.key} title={item.tooltip} delay={300}>
                        <TooltipTrigger className={cx(cellClass, "cursor-help text-left outline-hidden")}>
                            <KpiCellContent item={item} />
                        </TooltipTrigger>
                    </Tooltip>
                );
            })}
        </div>
    );
}
