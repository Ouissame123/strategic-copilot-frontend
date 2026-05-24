import { Briefcase, AlertTriangle, Gauge, FileText } from "lucide-react";
import { TALENT_CARD, TALENT_LABEL, formatTalentDate } from "@/components/talent/talent-detail-shared";

export interface TalentKpiCardsProps {
    allocationPct: number;
    alertsCount: number;
    ipiScore: number | null;
    contractEndDate: string | null | undefined;
    contractEndingSoon?: boolean;
}

function KpiCard({
    icon: Icon,
    label,
    value,
    hint,
    tone = "default",
}: {
    icon: typeof Briefcase;
    label: string;
    value: string;
    hint?: string;
    tone?: "default" | "warn" | "danger";
}) {
    const toneClass =
        tone === "danger"
            ? "text-rose-600 dark:text-rose-400"
            : tone === "warn"
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-900 dark:text-slate-100";

    return (
        <div className={`${TALENT_CARD} p-4`}>
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                    <p className={TALENT_LABEL}>{label}</p>
                    <p className={`mt-1 text-lg font-bold tabular-nums tracking-tight ${toneClass}`}>{value}</p>
                    {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
                </div>
            </div>
        </div>
    );
}

export function TalentKpiCards({
    allocationPct,
    alertsCount,
    ipiScore,
    contractEndDate,
    contractEndingSoon,
}: TalentKpiCardsProps) {
    const allocTone = allocationPct >= 160 ? "danger" : allocationPct >= 100 ? "warn" : "default";
    const contractLabel = contractEndDate ? formatTalentDate(contractEndDate) || "Non défini" : "Non défini";

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
                icon={Briefcase}
                label="Allocation"
                value={`${Math.round(allocationPct)}%`}
                hint={allocationPct >= 100 ? "Charge élevée" : "Capacité disponible"}
                tone={allocTone}
            />
            <KpiCard
                icon={AlertTriangle}
                label="Alertes"
                value={String(alertsCount)}
                hint={alertsCount > 0 ? "À traiter" : "Aucune alerte"}
                tone={alertsCount >= 3 ? "danger" : alertsCount >= 1 ? "warn" : "default"}
            />
            <KpiCard icon={Gauge} label="IPI" value={ipiScore != null ? `${ipiScore.toFixed(1)}/10` : "—"} />
            <KpiCard
                icon={FileText}
                label="Contrat"
                value={contractLabel}
                hint={contractEndingSoon ? "Échéance proche" : undefined}
                tone={contractEndingSoon ? "warn" : "default"}
            />
        </div>
    );
}
