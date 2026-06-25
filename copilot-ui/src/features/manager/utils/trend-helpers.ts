import type { FC, SVGProps } from "react";
import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
    InfoCircle,
    Minus,
    TrendDown01,
    TrendUp01,
} from "@untitledui/icons";
import type { ForecastDirection, HealthTrend } from "@/features/manager/types/observer";

type IconComponent = FC<SVGProps<SVGSVGElement>>;

export type TrendMeta = {
    labelKey: string;
    colorClass: string;
    Icon: IconComponent;
};

export const TREND_META: Record<HealthTrend, TrendMeta> = {
    improving: { labelKey: "improving", colorClass: "text-green-600", Icon: TrendUp01 },
    degrading: { labelKey: "degrading", colorClass: "text-red-600", Icon: TrendDown01 },
    stable: { labelKey: "stable", colorClass: "text-gray-500", Icon: Minus },
    first_analysis: { labelKey: "firstAnalysis", colorClass: "text-blue-600", Icon: InfoCircle },
};

export const FORECAST_META: Record<ForecastDirection, TrendMeta> = {
    rising: { labelKey: "rising", colorClass: "text-green-600", Icon: ArrowUp },
    falling: { labelKey: "falling", colorClass: "text-red-600", Icon: ArrowDown },
    flat: { labelKey: "flat", colorClass: "text-gray-500", Icon: ArrowRight },
};

export function formatDelta(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return "—";
    if (value === 0) return "0";
    return value > 0 ? `+${value}` : String(value);
}

export function formatRelativeDate(iso: string | null | undefined, locale: string): string {
    if (!iso?.trim()) return "—";
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return "—";
    const diffMs = Date.now() - ts;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "day");
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-diffDays, "day");
}

export function deltaColor(value: number | null | undefined, inverted = false): string {
    if (value == null || value === 0 || !Number.isFinite(value)) return "text-gray-500";
    const positive = value > 0;
    const favorable = inverted ? !positive : positive;
    return favorable ? "text-green-600" : "text-red-600";
}

export function deltaIcon(value: number | null | undefined): IconComponent {
    if (value == null || value === 0 || !Number.isFinite(value)) return Minus;
    return value > 0 ? ArrowUp : ArrowDown;
}

export const DELTA_FIELDS = [
    { key: "progress_delta" as const, labelKey: "progressDelta", inverted: false },
    { key: "capacity_delta" as const, labelKey: "capacityDelta", inverted: true },
    { key: "skill_gap_delta" as const, labelKey: "skillGapDelta", inverted: true },
    { key: "delay_delta" as const, labelKey: "delayDelta", inverted: true },
];
