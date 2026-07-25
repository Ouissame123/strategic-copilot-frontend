import { useTranslation } from "react-i18next";
import { SimulationTab as ProjectSimulationTab } from "@/components/projects/simulation/SimulationTab";
import { StrategistArbitrageOptions } from "@/components/manager/strategist-arbitrage-options";
import { useProjectStrategistArbitrage } from "@/hooks/use-project-strategist-arbitrage";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import type { ProjectDetailResponse } from "@/types/api.types";

type SimulationTabProps = {
    projectId: string;
    projectStatus?: string | null;
    detail?: ProjectDetailResponse;
};

/** Onglet Mission Control — simulation What-If + options d'arbitrage Strategist. */
export function SimulationTab({ projectId, projectStatus, detail }: SimulationTabProps) {
    const { user } = useAuth();
    const { push: pushToast } = useToast();
    const { t } = useTranslation("common");
    const tm = (key: string, opts?: Record<string, string | number>) =>
        String(opts ? t(`managerWorkspace.missionControl.${key}`, opts as never) : t(`managerWorkspace.missionControl.${key}`));

    const strategistArbitrage = useProjectStrategistArbitrage({
        open: true,
        projectId,
        enterpriseId: user?.enterpriseId,
        detail,
        detailLoading: false,
        simulationTabActive: true,
    });

    return (
        <div className="space-y-6">
            <ProjectSimulationTab projectId={projectId} projectStatus={projectStatus} detail={detail} />
            <StrategistArbitrageOptions
                options={strategistArbitrage.displayOptions}
                proposeLoading={strategistArbitrage.proposeLoading}
                managerSummary={strategistArbitrage.managerSummary}
                topRecommendationId={strategistArbitrage.topRecommendationId}
                onAccept={async (opt) => {
                    if (!user?.enterpriseId?.trim()) {
                        pushToast(tm("arbitrageErrorNoEnterprise"), "error");
                        return;
                    }
                    try {
                        const response = await strategistArbitrage.acceptOption(opt);
                        const summary =
                            response.decision_executed?.summary?.trim() ||
                            response.user_message?.trim() ||
                            tm("arbitrageAcceptedToast", { label: opt.label || opt.id });
                        pushToast(summary, "success", 8000);
                    } catch (error) {
                        pushToast(strategistArbitrage.readError(error), "error");
                        throw error;
                    }
                }}
                onReject={async (opt) => {
                    if (!user?.enterpriseId?.trim()) {
                        pushToast(tm("arbitrageErrorNoEnterprise"), "error");
                        return;
                    }
                    try {
                        await strategistArbitrage.rejectOption(opt);
                        pushToast(tm("arbitrageRejectedToast"), "neutral");
                    } catch (error) {
                        pushToast(strategistArbitrage.readError(error), "error");
                        throw error;
                    }
                }}
                onPropose={async () => {
                    if (!user?.enterpriseId?.trim()) {
                        pushToast(tm("arbitrageErrorNoEnterprise"), "error");
                        return;
                    }
                    try {
                        await strategistArbitrage.requestPropose();
                        pushToast(tm("arbitrageProposeToast"), "success");
                    } catch (error) {
                        pushToast(strategistArbitrage.readError(error), "error");
                    }
                }}
            />
        </div>
    );
}
