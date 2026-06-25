import { useCallback, useState } from "react";
import type { RiskType } from "@/api/rh-risks.api";
import { Button } from "@/components/base/buttons/button";
import { RisksFilters } from "@/components/rh/risks/RisksFilters";
import { RisksInsightBar } from "@/components/rh/risks/RisksInsightBar";
import { RisksList } from "@/components/rh/risks/RisksList";
import { TalentRiskDrawer } from "@/components/rh/risks/TalentRiskDrawer";
import { useRhRisksDensity } from "@/components/rh/risks/use-rh-risks-density";
import { useRisksList, useRisksSummary } from "@/hooks/useRhRisks";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";

export default function RhRisksPage() {
    const [riskType, setRiskType] = useState<"all" | RiskType>("all");
    const [severity, setSeverity] = useState<string>("all");
    const [search, setSearch] = useState("");
    const { density, toggleDensity } = useRhRisksDensity();
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
            <header className="space-y-1.5 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-baseline justify-between gap-3">
                    <h1 className="text-xl font-semibold text-primary">
                        Risques RH
                        {typeof summary.data?.summary.total_risks === "number" ? (
                            <span className="ml-2 text-base font-normal text-slate-400">{summary.data.summary.total_risks}</span>
                        ) : null}
                    </h1>
                    <Button color="tertiary" size="sm" onPress={toggleDensity}>
                        {density === "comfortable" ? "Dense" : "Confort"}
                    </Button>
                </div>
                <RisksInsightBar summary={summary.data?.summary} onFilterRiskType={setRiskType} />
            </header>

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
                density={density}
                onTalentClick={setDrawerTalent}
            />

            {drawerTalent ? <TalentRiskDrawer talentId={drawerTalent} onClose={() => setDrawerTalent(null)} /> : null}
        </div>
    );
}
