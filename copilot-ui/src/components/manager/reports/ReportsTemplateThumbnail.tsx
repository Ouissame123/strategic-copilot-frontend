import type { ReportType } from "@/components/reports/types";

type ReportsTemplateThumbnailProps = {
    type: ReportType;
    className?: string;
};

export function ReportsTemplateThumbnail({ type, className }: ReportsTemplateThumbnailProps) {
    const common = {
        width: 56,
        height: 72,
        viewBox: "0 0 56 72",
        className: className ?? "shrink-0",
        xmlns: "http://www.w3.org/2000/svg",
    } as const;
    const sheet = (
        <>
            <rect x="2" y="2" width="52" height="68" rx="4" className="fill-white stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-600" strokeWidth="1" />
            <rect x="2" y="2" width="52" height="10" rx="4" className="fill-slate-800 dark:fill-slate-600" />
        </>
    );

    switch (type) {
        case "board_pack":
            return (
                <svg {...common} aria-hidden>
                    {sheet}
                    <rect x="8" y="18" width="40" height="2.5" rx="1" className="fill-slate-800 dark:fill-slate-200" />
                    <rect x="8" y="24" width="14" height="10" rx="1.5" fill="#6366f1" opacity="0.35" />
                    <rect x="24" y="24" width="14" height="10" rx="1.5" fill="#f59e0b" opacity="0.35" />
                    <rect x="40" y="24" width="8" height="10" rx="1.5" fill="#f43f5e" opacity="0.35" />
                </svg>
            );
        case "project_dossier":
            return (
                <svg {...common} aria-hidden>
                    {sheet}
                    <rect x="8" y="18" width="32" height="2.5" rx="1" className="fill-slate-800 dark:fill-slate-200" />
                    <circle cx="46" cy="20" r="2.5" fill="#10b981" />
                    <rect x="8" y="38" width="18" height="14" rx="1.5" fill="#6366f1" opacity="0.3" />
                    <rect x="30" y="38" width="18" height="14" rx="1.5" fill="#10b981" opacity="0.3" />
                </svg>
            );
        case "risks_alerts":
            return (
                <svg {...common} aria-hidden>
                    {sheet}
                    <path d="M28 18 L36 32 L20 32 Z" fill="#f59e0b" />
                    <rect x="8" y="38" width="40" height="3" rx="1" fill="#fecaca" className="dark:fill-rose-900/50" />
                    <rect x="8" y="44" width="36" height="3" rx="1" fill="#fde68a" className="dark:fill-amber-900/40" />
                </svg>
            );
        case "hr_talents":
            return (
                <svg {...common} aria-hidden>
                    {sheet}
                    <circle cx="16" cy="24" r="4" fill="#818cf8" />
                    <circle cx="28" cy="24" r="4" fill="#34d399" />
                    <circle cx="40" cy="24" r="4" fill="#fbbf24" />
                    <rect x="8" y="40" width="28" height="3" rx="1" fill="#6366f1" opacity="0.5" />
                </svg>
            );
        case "decisions_ai":
            return (
                <svg {...common} aria-hidden>
                    {sheet}
                    <circle cx="28" cy="32" r="11" fill="none" stroke="#94a3b8" strokeWidth="2" />
                    <path d="M28 21 A11 11 0 0 1 38.5 35" fill="none" stroke="#10b981" strokeWidth="2.5" />
                    <path d="M38.5 35 A11 11 0 0 1 22 41" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
                    <path d="M22 41 A11 11 0 0 1 28 21" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
                </svg>
            );
        case "global_enterprise":
        default:
            return (
                <svg {...common} aria-hidden>
                    {sheet}
                    <rect x="8" y="26" width="18" height="10" rx="1.5" fill="#6366f1" opacity="0.3" />
                    <rect x="30" y="26" width="18" height="10" rx="1.5" fill="#8b5cf6" opacity="0.3" />
                    <polyline points="8,58 18,54 28,56 38,50 48,52" fill="none" stroke="#6366f1" strokeWidth="1.5" />
                </svg>
            );
    }
}
