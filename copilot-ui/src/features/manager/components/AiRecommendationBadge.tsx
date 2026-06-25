import type { FC, SVGProps } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, HelpCircle, SlashCircle01, Tool01 } from "@untitledui/icons";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import type { AiRecommendation } from "@/features/manager/types/ai-recommendation";
import { cx } from "@/utils/cx";

type IconComponent = FC<SVGProps<SVGSVGElement>>;

const DECISION_ICON_BY_KEY: Record<string, IconComponent> = {
    check: CheckCircle,
    tool: Tool01,
    stop: SlashCircle01,
    help: HelpCircle,
};

const DECISION_COLOR_BY_KEY: Record<string, { text: string; bg: string }> = {
    green: { text: "text-green-600", bg: "bg-green-50" },
    orange: { text: "text-orange-600", bg: "bg-orange-50" },
    red: { text: "text-red-600", bg: "bg-red-50" },
    gray: { text: "text-gray-500", bg: "bg-gray-50" },
};

const SIZE_CLASS = {
    sm: { root: "text-[10px] gap-1 px-1.5 py-0.5", icon: "size-3", action: "text-[10px]" },
    md: { root: "text-[11px] gap-1 px-1.5 py-0.5", icon: "size-3.5", action: "text-[10px]" },
    lg: { root: "text-sm gap-1.5 px-2 py-1", icon: "size-4", action: "text-xs" },
} as const;

export type AiRecommendationBadgeProps = {
    recommendation: AiRecommendation | null | undefined;
    size?: keyof typeof SIZE_CLASS;
    showAction?: boolean;
    className?: string;
};

export function AiRecommendationBadge({
    recommendation,
    size = "md",
    showAction = false,
    className,
}: AiRecommendationBadgeProps) {
    const { t } = useTranslation("common");
    const sizeClass = SIZE_CLASS[size];

    if (recommendation == null || recommendation.decision == null) {
        return (
            <span
                className={cx(
                    "inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 font-medium text-gray-500",
                    sizeClass.root,
                    className,
                )}
            >
                {t("managerWorkspace.projects.aiNotAnalyzed")}
            </span>
        );
    }

    const iconKey = String(recommendation.decision_icon ?? "").trim().toLowerCase();
    const Icon = DECISION_ICON_BY_KEY[iconKey] ?? HelpCircle;
    const colorKey = String(recommendation.decision_color ?? "gray").trim().toLowerCase();
    const colorClass = DECISION_COLOR_BY_KEY[colorKey] ?? DECISION_COLOR_BY_KEY.gray;
    const explanation = recommendation.explanation?.trim() ?? "";
    const topAction = recommendation.top_action;
    const topActionType = topAction?.type?.trim() ?? "";
    const topActionConfidence = topAction?.confidence;

    const labelParts = [recommendation.decision_label, recommendation.reason_label].filter(
        (part) => part != null && String(part).trim() !== "",
    );
    if (recommendation.confidence != null && Number.isFinite(recommendation.confidence)) {
        labelParts.push(t("managerWorkspace.projects.aiConfidence", { percent: Math.round(recommendation.confidence) }));
    }

    const badge = (
        <span className={cx("inline-flex max-w-full min-w-0 flex-col rounded-md font-medium", colorClass.bg, className)}>
            <span className={cx("inline-flex min-w-0 items-center", sizeClass.root, colorClass.text)}>
                <Icon className={cx("shrink-0", sizeClass.icon)} aria-hidden />
                <span className="truncate">{labelParts.join(" · ")}</span>
            </span>
            {showAction && topActionType ? (
                <span className={cx("px-1.5 pb-0.5 font-normal text-secondary", sizeClass.action)}>
                    → {topActionType}
                    {topActionConfidence != null && Number.isFinite(topActionConfidence)
                        ? ` (${Math.round(topActionConfidence)}%)`
                        : null}
                </span>
            ) : null}
        </span>
    );

    if (!explanation) return badge;

    return (
        <Tooltip title={explanation} placement="top">
            {badge}
        </Tooltip>
    );
}
