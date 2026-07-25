import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

export type StatusBadgeVariant = "critical" | "warning" | "ok" | "ai" | "neutral";

const VARIANT_CLASS: Record<StatusBadgeVariant, string> = {
    critical: "bg-[color:color-mix(in_srgb,var(--critical)_14%,transparent)] text-[color:var(--critical)] ring-[color:color-mix(in_srgb,var(--critical)_28%,transparent)]",
    warning: "bg-[color:color-mix(in_srgb,var(--warn)_14%,transparent)] text-[color:var(--warn)] ring-[color:color-mix(in_srgb,var(--warn)_28%,transparent)]",
    ok: "bg-[color:color-mix(in_srgb,var(--ok)_14%,transparent)] text-[color:var(--ok)] ring-[color:color-mix(in_srgb,var(--ok)_28%,transparent)]",
    ai: "bg-[color:var(--accent-muted)] text-[color:var(--accent)] ring-[color:color-mix(in_srgb,var(--accent)_28%,transparent)]",
    neutral: "bg-[color:var(--surface-2)] text-[color:var(--text-muted)] ring-[color:var(--border)]",
};

type StatusBadgeProps = {
    variant?: StatusBadgeVariant;
    children: ReactNode;
    className?: string;
};

export function StatusBadge({ variant = "neutral", children, className }: StatusBadgeProps) {
    return (
        <span
            className={cx(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                VARIANT_CLASS[variant],
                className,
            )}
        >
            {children}
        </span>
    );
}

export function decisionToBadgeVariant(decision: string | null | undefined): StatusBadgeVariant {
    const d = String(decision ?? "").toLowerCase();
    if (d === "continue" || d === "proceed") return "ok";
    if (d === "adjust") return "warning";
    if (d === "stop" || d === "reject") return "critical";
    return "neutral";
}

export function severityToBadgeVariant(severity: string | null | undefined): StatusBadgeVariant {
    const s = String(severity ?? "").toLowerCase();
    if (s === "critical") return "critical";
    if (s === "high" || s === "medium") return "warning";
    if (s === "low") return "ok";
    return "neutral";
}
