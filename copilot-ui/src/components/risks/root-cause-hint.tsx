import { Info } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import type { MissionControlWorkspaceTabId } from "@/utils/workspace-routes";

export type AlertRootCauseTargetTab = Extract<MissionControlWorkspaceTabId, "team" | "competences" | "budget">;

type AlertRootCauseHint = {
    cause_label: string;
    action_recommended: string;
    action_target_tab?: AlertRootCauseTargetTab;
};

export const ROOT_CAUSE_HINTS: Record<string, AlertRootCauseHint> = {
    overload: {
        cause_label: "Le talent est surchargé sur plusieurs projets",
        action_recommended: "Désassigner le talent d'au moins un projet",
        action_target_tab: "team",
    },
    resource_overload: {
        cause_label: "Le projet est en surcharge globale",
        action_recommended: "Réduire l'allocation totale de l'équipe",
        action_target_tab: "team",
    },
    turnover: {
        cause_label: "Contrat ou absences en risque",
        action_recommended: "Vérifier avec RH pour renouvellement ou remplacement",
    },
    critical_skills_gap: {
        cause_label: "Une compétence critique n'est pas couverte",
        action_recommended: "Affecter un talent qualifié OU ajuster les exigences",
        action_target_tab: "competences",
    },
    conflict: {
        cause_label: "Conflit d'affectation sur projet high-priority",
        action_recommended: "Arbitrer la priorité avec le manager portfolio",
        action_target_tab: "team",
    },
    key_talent_dependency: {
        cause_label: "Le projet dépend trop d'un seul talent",
        action_recommended: "Diversifier l'équipe pour réduire le risque clé",
        action_target_tab: "team",
    },
    schedule_drift: {
        cause_label: "Le planning est en dérive",
        action_recommended: "Ajuster l'échéance ou réduire le scope",
    },
    fragility_high: {
        cause_label: "Le projet est structurellement fragile",
        action_recommended: "Analyser le détail dans l'onglet Risques",
    },
    health_warning: {
        cause_label: "Données amont incomplètes",
        action_recommended: "Compléter les champs manquants (skills, allocations, dates)",
        action_target_tab: "competences",
    },
    budget_overshoot: {
        cause_label: "Le budget actuel dépasse 90% du planifié",
        action_recommended: "Ajuster l'allocation budgétaire planifiée",
        action_target_tab: "budget",
    },
    data_quality_gap: {
        cause_label: "Aucun signal disponible — analyses manquantes",
        action_recommended: "Lancer une analyse complète du projet",
    },
};

export function resolveAlertRiskType(alert: { risk_type?: string | null; riskType?: string | null }): string | undefined {
    const raw = (alert.risk_type ?? alert.riskType ?? "").trim().toLowerCase();
    return raw || undefined;
}

type RootCauseHintProps = {
    riskType: string | undefined | null;
    onNavigateTab?: (tab: AlertRootCauseTargetTab) => void;
};

export function RootCauseHint({ riskType, onNavigateTab }: RootCauseHintProps) {
    const key = (riskType ?? "").trim().toLowerCase();
    const hint = key ? ROOT_CAUSE_HINTS[key] : undefined;
    if (!hint) return null;

    return (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs dark:border-amber-800/60 dark:bg-amber-950/30">
            <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <div className="min-w-0 flex-1">
                    <p className="text-amber-800 dark:text-amber-100">
                        <strong>Cause root :</strong> {hint.cause_label}.
                    </p>
                    <p className="mt-1 text-amber-700 dark:text-amber-200/90">
                        <strong>Action recommandée :</strong> {hint.action_recommended}.
                    </p>
                    <p className="mt-1 italic text-amber-600 dark:text-amber-300/80">
                        ⓘ Cliquer « Résoudre » sans agir sur la cause re-créera l&apos;alerte au prochain scan Watchdog.
                    </p>
                </div>
                {hint.action_target_tab && onNavigateTab ? (
                    <Button
                        type="button"
                        color="tertiary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => onNavigateTab(hint.action_target_tab!)}
                    >
                        Agir →
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
