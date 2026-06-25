import { useMemo } from "react";
import { CheckCircle } from "lucide-react";
import type { Risk } from "@/api/rh-risks.api";
import { RiskCard } from "@/components/rh/risks/RiskCard";
import type { RhRisksDensity } from "@/components/rh/risks/use-rh-risks-density";
import { EmptyState } from "@/components/ui/EmptyState";
import { SEVERITY_ORDER, SEVERITY_SECTION_LABELS } from "@/lib/rh-risks-display";

type RisksListProps = {
    risks: Risk[];
    isLoading: boolean;
    density: RhRisksDensity;
    onTalentClick: (talentId: string) => void;
};

function RisksListSkeleton() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
                <div
                    key={i}
                    className="h-14 animate-pulse rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                />
            ))}
        </div>
    );
}

export function RisksList({ risks, isLoading, density, onTalentClick }: RisksListProps) {
    const grouped = useMemo(() => {
        const groups: Record<string, Risk[]> = { critical: [], high: [], medium: [], low: [] };
        for (const r of risks) {
            const bucket = groups[r.severity] ? r.severity : "low";
            groups[bucket].push(r);
        }
        return groups;
    }, [risks]);

    if (isLoading) return <RisksListSkeleton />;

    if (risks.length === 0) {
        return (
            <EmptyState size="md" className="py-12">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon color="success" icon={CheckCircle} />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>Aucun risque détecté</EmptyState.Title>
                    <EmptyState.Description>Le Watchdog continue de surveiller en arrière-plan.</EmptyState.Description>
                </EmptyState.Content>
            </EmptyState>
        );
    }

    return (
        <div className="space-y-5">
            {SEVERITY_ORDER.map((sev) => {
                const list = grouped[sev];
                if (!list?.length) return null;
                return (
                    <section key={sev}>
                        <h3 className="mb-2 text-xs uppercase tracking-widest text-slate-500">
                            {SEVERITY_SECTION_LABELS[sev]}{" "}
                            <span className="text-slate-400">({list.length})</span>
                        </h3>
                        <div className="space-y-1.5">
                            {list.map((r) => (
                                <RiskCard key={r.id} risk={r} density={density} onTalentClick={onTalentClick} />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
