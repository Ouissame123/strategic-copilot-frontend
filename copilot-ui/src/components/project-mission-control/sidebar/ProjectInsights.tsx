import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MissionControlInsightCard } from "@/lib/mission-control-insights";
import type { AssignmentItem } from "@/types/api.types";
import type { MissionControlWorkspaceTabId } from "@/utils/workspace-routes";
import { InsightCard } from "./InsightCard";

type ProjectInsightsProps = {
    projectId: string;
    insights: MissionControlInsightCard[];
    assignments?: AssignmentItem[];
    onRunMatchmaker: () => void;
    onTabChange: (tab: MissionControlWorkspaceTabId) => void;
};

export function ProjectInsights({ projectId, insights, assignments, onRunMatchmaker, onTabChange }: ProjectInsightsProps) {
    const assignedTalentIds = useMemo(
        () => new Set((assignments ?? []).map((a) => String(a.talent_id ?? "").trim()).filter(Boolean)),
        [assignments],
    );
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);

    return (
        <section className="rounded-xl border border-secondary bg-primary p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
                <Sparkles className="size-4 text-primary-600" aria-hidden />
                {tm("sidebarInsightsTitle")}
            </h2>
            {insights.length === 0 ? (
                <p className="mt-3 text-sm text-fg-tertiary">{tm("sidebarInsightsEmpty")}</p>
            ) : (
                <ul className="mt-3 space-y-3">
                    {insights.map((ins) => (
                        <InsightCard
                            key={ins.id}
                            insight={ins}
                            projectId={projectId}
                            assignedTalentIds={assignedTalentIds}
                            onRunMatchmaker={onRunMatchmaker}
                            onTabChange={onTabChange}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}
