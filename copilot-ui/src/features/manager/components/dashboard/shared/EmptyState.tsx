import type { ComponentType, SVGProps } from "react";
import { cx } from "@/utils/cx";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
}: {
    icon?: IconComponent;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <div className="px-4 py-6 text-center">
            {Icon ? <Icon className="mx-auto mb-2 size-8 text-gray-300" aria-hidden /> : null}
            <p className="text-sm font-medium text-gray-700">{title}</p>
            {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
            {actionLabel && onAction ? (
                <button type="button" onClick={onAction} className="mt-3 text-sm font-medium text-purple-600 hover:text-purple-800">
                    {actionLabel} →
                </button>
            ) : null}
        </div>
    );
}

export function WidgetStatRow({
    label,
    value,
    colored,
}: {
    label: string;
    value: string | number;
    colored?: "red" | "orange" | "green";
}) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{label}</span>
            <span
                className={cx(
                    "font-medium tabular-nums",
                    colored === "red" && "text-red-600",
                    colored === "orange" && "text-orange-600",
                    colored === "green" && "text-green-600",
                    !colored && "text-gray-900",
                )}
            >
                {value}
            </span>
        </div>
    );
}
