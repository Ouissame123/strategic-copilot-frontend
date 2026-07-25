import { cx } from "@/utils/cx";
import { REPORT_CARD } from "./reports-shared";

type Variant = "reports" | "history" | "automation";

type EmptyStateIllustrationProps = {
    variant?: Variant;
    className?: string;
};

export function EmptyStateIllustration({ variant = "reports", className }: EmptyStateIllustrationProps) {
    return (
        <svg
            viewBox="0 0 200 140"
            className={cx("mx-auto h-32 w-auto text-primary-200 dark:text-primary-900/60", className)}
            aria-hidden
        >
            <rect x="40" y="20" width="120" height="100" rx="12" fill="currentColor" opacity="0.15" />
            <rect x="52" y="32" width="96" height="12" rx="4" fill="currentColor" opacity="0.35" />
            {variant === "history" ? (
                <>
                    <circle cx="70" cy="70" r="6" fill="#6366f1" />
                    <rect x="82" y="64" width="50" height="4" rx="2" fill="currentColor" opacity="0.4" />
                    <rect x="82" y="74" width="36" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
                    <circle cx="70" cy="92" r="6" fill="#a5b4fc" />
                    <rect x="82" y="86" width="50" height="4" rx="2" fill="currentColor" opacity="0.4" />
                </>
            ) : variant === "automation" ? (
                <>
                    <path d="M100 55 L115 75 L85 75 Z" fill="#8b5cf6" opacity="0.8" />
                    <rect x="60" y="82" width="80" height="6" rx="3" fill="currentColor" opacity="0.3" />
                    <rect x="70" y="94" width="60" height="6" rx="3" fill="currentColor" opacity="0.2" />
                </>
            ) : (
                <>
                    <rect x="60" y="58" width="28" height="36" rx="4" fill="#6366f1" opacity="0.5" />
                    <rect x="94" y="58" width="28" height="36" rx="4" fill="#8b5cf6" opacity="0.4" />
                    <rect x="128" y="58" width="20" height="36" rx="4" fill="#c4b5fd" opacity="0.35" />
                </>
            )}
        </svg>
    );
}

type ReportsEmptyStateProps = {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: Variant;
};

export function ReportsEmptyState({ title, description, actionLabel, onAction, variant = "reports" }: ReportsEmptyStateProps) {
    return (
        <div className={REPORT_CARD + " flex flex-col items-center px-6 py-12 text-center"}>
            <EmptyStateIllustration variant={variant} />
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
            {actionLabel && onAction ? (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
                >
                    {actionLabel}
                </button>
            ) : null}
        </div>
    );
}
