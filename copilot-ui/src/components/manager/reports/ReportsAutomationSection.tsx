import { Mail, Plus, TrendingUp, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { ReportsEmptyState } from "./EmptyStateIllustration";
import { REPORT_CARD } from "./reports-shared";
import { ReportsAutomationCalendar } from "./ReportsAutomationCalendar";
import { ReportsAutomationCard } from "./ReportsAutomationCard";
import type { ReportAutomation } from "./reports-automation";

type ReportsAutomationSectionProps = {
    automations: ReportAutomation[];
    activeCount: number;
    sentThisMonth: number;
    successRate: number | null;
    lastSentLabel: string;
    emailSection: ReactNode;
    emptyPdfHint?: ReactNode;
    onNewAutomation: () => void;
    onToggle: (id: string, active: boolean) => void;
    onEdit: (automation: ReportAutomation) => void;
    onDelete: (id: string) => void;
};

export function ReportsAutomationSection({
    automations,
    activeCount,
    sentThisMonth,
    successRate,
    lastSentLabel,
    emailSection,
    emptyPdfHint,
    onNewAutomation,
    onToggle,
    onEdit,
    onDelete,
}: ReportsAutomationSectionProps) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: "Planifications actives", value: activeCount, icon: Zap },
                    { label: "Rapports envoyés ce mois", value: sentThisMonth, icon: Mail },
                    { label: "Taux de succès", value: successRate != null ? `${successRate}%` : "—", icon: TrendingUp },
                    { label: "Dernier envoi", value: lastSentLabel, icon: Mail, small: true },
                ].map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={kpi.label} className={REPORT_CARD + " p-4"}>
                            <div className="flex items-center gap-2 text-slate-500">
                                <Icon className="size-4 text-primary-600 dark:text-primary-400" />
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

            <ReportsAutomationCalendar automations={automations} />

            <section>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Automatisations actives</h2>
                        <p className="mt-1 text-sm text-slate-500">Envois récurrents configurés pour votre périmètre.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onNewAutomation}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
                    >
                        <Plus className="size-4" />
                        Nouvelle automatisation
                    </button>
                </div>
                {automations.length ? (
                    <div className="space-y-3">
                        {automations.map((a) => (
                            <ReportsAutomationCard
                                key={a.id}
                                automation={a}
                                onToggle={onToggle}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <ReportsEmptyState
                        variant="automation"
                        title="Aucune automatisation configurée"
                        description="Créez une planification pour envoyer vos rapports PDF de façon récurrente à votre équipe."
                        actionLabel="Nouvelle automatisation"
                        onAction={onNewAutomation}
                    />
                )}
            </section>

            {emptyPdfHint}

            <section className={REPORT_CARD + " p-5 sm:p-6"}>
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                    <Mail className="size-4 text-primary-600" />
                    Partager par e-mail
                </h2>
                <p className="mt-1 text-sm text-slate-500">Envoi ponctuel d&apos;un rapport PDF déjà généré.</p>
                <div className="mt-4">{emailSection}</div>
            </section>
        </div>
    );
}
