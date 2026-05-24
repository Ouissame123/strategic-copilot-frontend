import { useState } from "react";
import {
    FileText,
    FileSpreadsheet,
    Printer,
    Eye,
    Calendar,
    ChevronDown,
    Loader2,
    Server,
    Cloud,
} from "lucide-react";
import type { ReportTemplate, ReportFormat } from "./types";
import { FavoriteButton } from "@/components/manager/reports/FavoriteButton";
import { DISPLAY_FORMATS } from "@/components/manager/reports/reports-shared";
import { cn, formatRelativeDate, labelFormat } from "./utils";

interface Props {
    template: ReportTemplate;
    onGenerate: (template: ReportTemplate) => void | Promise<void>;
    onPreview?: (template: ReportTemplate) => void;
    onSchedule?: (template: ReportTemplate) => void;
    loading?: boolean;
    disabled?: boolean;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
    onFormatSelect?: (format: ReportFormat) => void;
}

const FORMAT_ICON: Record<ReportFormat, typeof FileText> = {
    pdf: FileText,
    csv: FileSpreadsheet,
    excel: FileSpreadsheet,
    print: Printer,
};

const FORMAT_BADGE_STYLE: Record<ReportFormat, string> = {
    pdf: "bg-rose-50 text-rose-700 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/50",
    csv: "bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50",
    excel: "bg-sky-50 text-sky-700 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/50",
    print: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};

function ThumbnailPreview({ type }: { type: ReportTemplate["type"] }) {
    const common = {
        width: 56,
        height: 72,
        viewBox: "0 0 56 72",
        className: "shrink-0",
        xmlns: "http://www.w3.org/2000/svg",
    } as const;
    const sheet = (
        <>
            <rect x="2" y="2" width="52" height="68" rx="4" fill="white" stroke="#cbd5e1" strokeWidth="1" />
            <rect x="2" y="2" width="52" height="10" rx="4" fill="#1e293b" />
        </>
    );

    switch (type) {
        case "board_pack":
            return (
                <svg {...common}>
                    {sheet}
                    <rect x="8" y="18" width="40" height="2.5" rx="1" fill="#1e293b" />
                    <rect x="8" y="24" width="14" height="10" rx="1.5" fill="#e0e7ff" />
                    <rect x="24" y="24" width="14" height="10" rx="1.5" fill="#fef3c7" />
                    <rect x="40" y="24" width="8" height="10" rx="1.5" fill="#fee2e2" />
                    <rect x="8" y="38" width="40" height="1.5" rx="0.5" fill="#cbd5e1" />
                    <rect x="8" y="42" width="34" height="1.5" rx="0.5" fill="#cbd5e1" />
                    <rect x="8" y="46" width="38" height="1.5" rx="0.5" fill="#cbd5e1" />
                    <rect x="8" y="56" width="40" height="6" rx="1" fill="#4f46e5" opacity="0.15" />
                </svg>
            );
        case "project_dossier":
            return (
                <svg {...common}>
                    {sheet}
                    <rect x="8" y="18" width="32" height="2.5" rx="1" fill="#1e293b" />
                    <circle cx="46" cy="20" r="2.5" fill="#10b981" />
                    <rect x="8" y="26" width="40" height="1.5" rx="0.5" fill="#cbd5e1" />
                    <rect x="8" y="30" width="36" height="1.5" rx="0.5" fill="#cbd5e1" />
                    <rect x="8" y="38" width="18" height="14" rx="1.5" fill="#e0e7ff" />
                    <rect x="30" y="38" width="18" height="14" rx="1.5" fill="#dcfce7" />
                    <rect x="8" y="56" width="40" height="1.5" rx="0.5" fill="#cbd5e1" />
                    <rect x="8" y="60" width="28" height="1.5" rx="0.5" fill="#cbd5e1" />
                </svg>
            );
        case "risks_alerts":
            return (
                <svg {...common}>
                    {sheet}
                    <path d="M28 18 L36 32 L20 32 Z" fill="#f97316" />
                    <rect x="27" y="22" width="2" height="6" fill="white" />
                    <rect x="27" y="29" width="2" height="2" fill="white" />
                    <rect x="8" y="38" width="40" height="3" rx="1" fill="#fee2e2" />
                    <rect x="8" y="44" width="36" height="3" rx="1" fill="#fef3c7" />
                    <rect x="8" y="50" width="38" height="3" rx="1" fill="#fef3c7" />
                    <rect x="8" y="56" width="32" height="3" rx="1" fill="#e0f2fe" />
                </svg>
            );
        case "hr_talents":
            return (
                <svg {...common}>
                    {sheet}
                    <circle cx="16" cy="24" r="4" fill="#a5b4fc" />
                    <circle cx="28" cy="24" r="4" fill="#86efac" />
                    <circle cx="40" cy="24" r="4" fill="#fcd34d" />
                    <rect x="8" y="34" width="40" height="2" rx="1" fill="#cbd5e1" />
                    <rect x="8" y="40" width="40" height="3" rx="1" fill="#e2e8f0" />
                    <rect x="8" y="40" width="28" height="3" rx="1" fill="#6366f1" opacity="0.5" />
                    <rect x="8" y="48" width="40" height="3" rx="1" fill="#e2e8f0" />
                    <rect x="8" y="48" width="16" height="3" rx="1" fill="#10b981" />
                    <rect x="8" y="56" width="40" height="3" rx="1" fill="#e2e8f0" />
                    <rect x="8" y="56" width="34" height="3" rx="1" fill="#f59e0b" opacity="0.7" />
                </svg>
            );
        case "decisions_ai":
            return (
                <svg {...common}>
                    {sheet}
                    <circle cx="28" cy="32" r="11" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <path d="M28 21 A11 11 0 0 1 38.5 35" fill="none" stroke="#10b981" strokeWidth="3" />
                    <path d="M38.5 35 A11 11 0 0 1 22 41" fill="none" stroke="#f59e0b" strokeWidth="3" />
                    <path d="M22 41 A11 11 0 0 1 28 21" fill="none" stroke="#ef4444" strokeWidth="3" />
                    <rect x="8" y="50" width="40" height="2" rx="1" fill="#cbd5e1" />
                    <rect x="8" y="56" width="34" height="2" rx="1" fill="#cbd5e1" />
                    <rect x="8" y="62" width="38" height="2" rx="1" fill="#cbd5e1" />
                </svg>
            );
        case "global_enterprise":
        default:
            return (
                <svg {...common}>
                    {sheet}
                    <rect x="8" y="18" width="40" height="2.5" rx="1" fill="#1e293b" />
                    <rect x="8" y="26" width="18" height="10" rx="1.5" fill="#e0e7ff" />
                    <rect x="30" y="26" width="18" height="10" rx="1.5" fill="#e0e7ff" />
                    <rect x="8" y="40" width="40" height="1.5" rx="0.5" fill="#cbd5e1" />
                    <rect x="8" y="44" width="36" height="1.5" rx="0.5" fill="#cbd5e1" />
                    <rect x="8" y="48" width="38" height="1.5" rx="0.5" fill="#cbd5e1" />
                    <polyline points="8,62 18,58 28,60 38,54 48,56" fill="none" stroke="#4f46e5" strokeWidth="1.5" />
                </svg>
            );
    }
}

function FormatBadge({ format }: { format: ReportFormat }) {
    const Icon = FORMAT_ICON[format];
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1",
                FORMAT_BADGE_STYLE[format],
            )}
        >
            <Icon className="h-3 w-3" />
            {labelFormat(format)}
        </span>
    );
}

export function ReportTemplateCard({
    template,
    onGenerate,
    onPreview,
    onSchedule,
    loading = false,
    disabled = false,
    isFavorite = false,
    onToggleFavorite,
    onFormatSelect,
}: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const PrimaryIcon = FORMAT_ICON[template.primaryFormat];
    const hasGenerated = Boolean(template.lastGeneratedAt);
    const generationCount = template.generationCount ?? 0;
    const showMenu = Boolean(onSchedule || onFormatSelect);

    return (
        <article className="group relative flex h-full flex-col rounded-3xl border border-slate-200/60 bg-white/90 shadow-sm backdrop-blur transition-all duration-200 hover:scale-[1.01] hover:border-indigo-200/60 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
            {onToggleFavorite ? (
                <div className="absolute right-3 top-3 z-10">
                    <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} />
                </div>
            ) : null}
            <div className="flex items-start gap-4 p-4 pb-3 pr-12">
                <ThumbnailPreview type={template.type} />
                <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        {DISPLAY_FORMATS.map((f) => (
                            <FormatBadge key={f} format={f} />
                        ))}
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1",
                                template.isBackendGenerated
                                    ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                                    : "bg-slate-50 text-slate-600 ring-slate-200",
                            )}
                        >
                            {template.isBackendGenerated ? (
                                <>
                                    <Server className="h-3 w-3" /> Serveur
                                </>
                            ) : (
                                <>
                                    <Cloud className="h-3 w-3" /> Local
                                </>
                            )}
                        </span>
                    </div>
                    <h3 className="font-semibold leading-snug text-slate-900 dark:text-slate-50">{template.title}</h3>
                </div>
            </div>

            <div className="flex-1 px-4 pb-3">
                <p className="mb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{template.description}</p>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-500">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Source : </span>
                    {template.dataSource}
                </p>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                {hasGenerated ? (
                    <span>
                        {generationCount > 0 ? (
                            <>
                                Généré {generationCount} fois
                                {" · "}
                            </>
                        ) : null}
                        dernière fois{" "}
                        <span className="font-medium">{formatRelativeDate(template.lastGeneratedAt!)}</span>
                    </span>
                ) : (
                    <span className="text-slate-500 dark:text-slate-500">Prêt à générer</span>
                )}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
                <button
                    type="button"
                    onClick={() => void onGenerate(template)}
                    disabled={loading || disabled}
                    className={cn(
                        "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                        "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:opacity-95",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PrimaryIcon className="h-4 w-4" />}
                    <span>{loading ? "Génération…" : `Générer ${labelFormat(template.primaryFormat)}`}</span>
                </button>

                {onPreview ? (
                    <button
                        type="button"
                        onClick={() => onPreview(template)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                        title="Aperçu"
                        aria-label="Aperçu"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                ) : null}

                {showMenu ? (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setMenuOpen((v) => !v)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            aria-label="Format et actions"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </button>
                        {menuOpen ? (
                            <>
                                <button
                                    type="button"
                                    className="fixed inset-0 z-10"
                                    onClick={() => setMenuOpen(false)}
                                    aria-label="Fermer menu"
                                />
                                <div
                                    role="menu"
                                    className="absolute bottom-full right-0 z-20 mb-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                                >
                                    {DISPLAY_FORMATS.filter((f) => template.formats.includes(f)).map((f) => (
                                        <button
                                            key={f}
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setMenuOpen(false);
                                                onFormatSelect?.(f);
                                                void onGenerate(template);
                                            }}
                                            className="flex w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            Générer {labelFormat(f)}
                                        </button>
                                    ))}
                                    {onSchedule ? (
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setMenuOpen(false);
                                                onSchedule(template);
                                            }}
                                            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            <Calendar className="h-4 w-4" />
                                            Programmer
                                        </button>
                                    ) : null}
                                </div>
                            </>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </article>
    );
}
