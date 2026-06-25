import { getRecommendationConfig } from "@/lib/recommendation-mapping";
import { cx } from "@/utils/cx";

type RecommendationBadgeProps = {
    type: string;
    size?: "sm" | "md";
    showIcon?: boolean;
    className?: string;
};

export function RecommendationBadge({
    type,
    size = "md",
    showIcon = true,
    className,
}: RecommendationBadgeProps) {
    const config = getRecommendationConfig(type);
    const Icon = config.icon;

    return (
        <span
            className={cx(
                "inline-flex items-center gap-1 rounded-md border font-medium",
                size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
                config.badgeCls,
                className,
            )}
            aria-label={`Recommandation : ${config.label} — ${config.description}`}
            title={config.description}
        >
            {showIcon ? <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden /> : null}
            {config.label}
        </span>
    );
}
