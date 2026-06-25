import type { DecisionLogKpis } from "@/services/decisions.api";
import { DecisionStackedBar } from "./DecisionStackedBar";

type DecisionDistributionBarProps = {
    kpis: DecisionLogKpis;
};

/** Barre de distribution — wrapper autour du stacked bar existant. */
export function DecisionDistributionBar({ kpis }: DecisionDistributionBarProps) {
    if (!kpis.total) return null;
    return <DecisionStackedBar kpis={kpis} />;
}
