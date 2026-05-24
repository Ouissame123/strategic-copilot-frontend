import { CalendarPlus, Mail, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import type { MockSchedule } from "./reports-shared";
import { REPORT_CARD } from "./reports-shared";
import { ScheduleCard } from "./ScheduleCard";

type AutomationOverviewProps = {
    activeSchedules: number;
    sentThisMonth: number;
    successRate: number;
    lastSentLabel: string;
    schedules: MockSchedule[];
    emailSection: ReactNode;
    scheduleFormSection: ReactNode;
    onCreateSchedule: () => void;
    onScheduleEdit?: (id: string) => void;
    onScheduleDelete?: (id: string) => void;
    onScheduleRun?: (id: string) => void;
    onScheduleToggle?: (id: string, active: boolean) => void;
    emptyHint?: ReactNode;
};

export function AutomationOverview({
    activeSchedules,
    sentThisMonth,
    successRate,
    lastSentLabel,
    schedules,
    emailSection,
    scheduleFormSection,
    onCreateSchedule,
    onScheduleEdit,
    onScheduleDelete,
    onScheduleRun,
    onScheduleToggle,
    emptyHint,
}: AutomationOverviewProps) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: "Planifications actives", value: activeSchedules, icon: CalendarPlus },
                    { label: "Rapports envoyés ce mois", value: sentThisMonth, icon: Mail },
                    { label: "Taux de succès", value: `${successRate}%`, icon: TrendingUp },
                    { label: "Dernier envoi", value: lastSentLabel, icon: Mail, small: true },
                ].map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={kpi.label} className={REPORT_CARD + " p-4"}>
                            <div className="flex items-center gap-2 text-slate-500">
                                <Icon className="size-4 text-indigo-600" />
                                <span className="text-xs font-medium uppercase tracking-wide">{kpi.label}</span>
                            </div>
                            <p
                                className={
                                    kpi.small
                                        ? "mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200"
                                        : "mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50"
                                }
                            >
                                {kpi.value}
                            </p>
                        </div>
                    );
                })}
            </div>

            {emptyHint}

            <section className={REPORT_CARD + " p-5 sm:p-6"}>
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                    <Mail className="size-4 text-indigo-600" />
                    Partager par e-mail
                </h2>
                <div className="mt-4">{emailSection}</div>
            </section>

            <section>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Planifications récurrentes</h2>
                        <p className="mt-1 text-sm text-slate-500">Envoi automatique vers vos destinataires.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onCreateSchedule}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
                    >
                        <CalendarPlus className="size-4" />
                        Créer une planification
                    </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {schedules.map((s) => (
                        <ScheduleCard
                            key={s.id}
                            schedule={s}
                            onEdit={onScheduleEdit}
                            onDelete={onScheduleDelete}
                            onRunNow={onScheduleRun}
                            onToggleActive={onScheduleToggle}
                        />
                    ))}
                </div>
            </section>

            <section className={REPORT_CARD + " p-5 sm:p-6"}>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Nouvelle planification (API)</h2>
                <p className="mt-1 text-sm text-slate-500">Enregistrement côté serveur via n8n.</p>
                <div className="mt-4">{scheduleFormSection}</div>
            </section>
        </div>
    );
}
