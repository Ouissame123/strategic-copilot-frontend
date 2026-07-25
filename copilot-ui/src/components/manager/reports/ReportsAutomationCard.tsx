import {
    BarChart3,
    CalendarClock,
    FileSpreadsheet,
    FileText,
    Pencil,
    Trash2,
    Users,
} from "lucide-react";
import { cx } from "@/utils/cx";
import { REPORT_CARD } from "./reports-shared";
import {
    dotColorForTemplate,
    frequencyLabel,
    recipientCount,
    type ReportAutomation,
} from "./reports-automation";

const TEMPLATE_ICON: Record<string, typeof FileText> = {
    board_pack: BarChart3,
    project_dossier: FileText,
    risks_alerts: FileSpreadsheet,
    hr_talents: Users,
    global_enterprise: BarChart3,
    decisions_ai: FileSpreadsheet,
};

type ReportsAutomationCardProps = {
    automation: ReportAutomation;
    onToggle: (id: string, active: boolean) => void;
    onEdit: (automation: ReportAutomation) => void;
    onDelete: (id: string) => void;
};

export function ReportsAutomationCard({ automation, onToggle, onEdit, onDelete }: ReportsAutomationCardProps) {
    const Icon = TEMPLATE_ICON[automation.templateKey] ?? FileText;
    const count = recipientCount(automation.recipients);
    const accent = dotColorForTemplate(automation.templateKey);

    return (
        <article
            className={cx(
                REPORT_CARD,
                "flex flex-col gap-4 p-4 transition-all duration-200 hover:scale-[1.005] hover:shadow-lg sm:flex-row sm:items-center sm:gap-6 sm:p-5",
                !automation.active && "opacity-60",
            )}
        >
            <div
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-sm"
                style={{ backgroundColor: `${accent}18`, color: accent }}
            >
                <Icon className="size-6" aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50">{automation.title}</h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">· {frequencyLabel(automation)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {automation.audienceLabel}
                    </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                    {count} destinataire{count > 1 ? "s" : ""}
                    <span className="mx-2 text-slate-300">|</span>
                    <CalendarClock className="mr-0.5 inline size-3" />
                    Dernier :{" "}
                    {automation.lastSentLabel === "—" || !automation.lastSentLabel.trim()
                        ? "Jamais envoyé"
                        : automation.lastSentLabel}
                    <span className="mx-2 text-slate-300">·</span>
                    Prochain : {automation.nextSentLabel}
                </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end lg:flex-row">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <span>{automation.active ? "ON" : "OFF"}</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={automation.active}
                        onClick={() => onToggle(automation.id, !automation.active)}
                        className={cx(
                            "relative h-6 w-11 rounded-full transition-colors duration-200",
                            automation.active ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-600",
                        )}
                    >
                        <span
                            className={cx(
                                "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200",
                                automation.active && "translate-x-5",
                            )}
                        />
                    </button>
                </label>
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={() => onEdit(automation)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-primary-200 hover:text-primary-700 dark:border-slate-700 dark:text-slate-300"
                    >
                        <Pencil className="size-3.5" /> Éditer
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(automation.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200/80 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
                    >
                        <Trash2 className="size-3.5" /> Supprimer
                    </button>
                </div>
            </div>
        </article>
    );
}
