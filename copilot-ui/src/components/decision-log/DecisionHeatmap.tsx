import type { DecisionLogHeatmapRow } from "@/services/decisions.api";
import { ConfidenceHeatmap } from "./ConfidenceHeatmap";

type DecisionHeatmapProps = {
    heatmap: Record<string, DecisionLogHeatmapRow>;
};

/** Wrapper sidebar — réutilise la heatmap existante. */
export function DecisionHeatmap({ heatmap }: DecisionHeatmapProps) {
    const hasData = Object.values(heatmap).some((row) => (row?.low ?? 0) + (row?.medium ?? 0) + (row?.high ?? 0) > 0);
    if (!hasData) return null;
    return <ConfidenceHeatmap heatmap={heatmap} />;
}
