import { useCallback, useState } from "react";
import type { RiskType } from "@/api/rh-risks.api";
import { RisksFilters } from "@/components/rh/risks/RisksFilters";
import { RisksInsightBar } from "@/components/rh/risks/RisksInsightBar";
import { RisksList } from "@/components/rh/risks/RisksList";
import { TalentRiskDrawer } from "@/components/rh/risks/TalentRiskDrawer";
import { useRisksList, useRisksSummary } from "@/hooks/useRhRisks";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";

export default function RhRisksPage() {
    const [riskType, setRiskType] = useState<"all" | RiskType>("all");
    const [severity, setSeverity] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [drawerTalent, setDrawerTalent] = useState<string | null>(null);

    const summary = useRisksSummary();
    const risks = useRisksList({ riskType, severity, search });

    const resetFilters = useCallback(() => {
        setSearch("");
        setSeverity("all");
        setRiskType("all");
    }, []);

    useWorkspaceTopbarMeta("Risques RH", "Watchdog talents — lecture stricte backend WF_RH_Risks_Watchdog_v1");

    return (
        <div className="space-y-4">
            <RisksInsightBar summary={summary.data?.summary} onFilterRiskType={setRiskType} />

            <RisksFilters
                riskType={riskType}
                onRiskTypeChange={setRiskType}
                severity={severity}
                onSeverityChange={setSeverity}
                search={search}
                onSearchChange={setSearch}
                counts={summary.data?.summary}
                onReset={resetFilters}
            />

            <RisksList
                risks={risks.data?.risks ?? []}
                isLoading={risks.isLoading}
                onTalentClick={setDrawerTalent}
            />

            {drawerTalent ? <TalentRiskDrawer talentId={drawerTalent} onClose={() => setDrawerTalent(null)} /> : null}
        </div>
    );
}
