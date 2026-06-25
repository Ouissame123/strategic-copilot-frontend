import { AlertTriangle, Sparkles } from "lucide-react";
import type { RhActionSource } from "@/lib/classifySource";
import { cx } from "@/utils/cx";

type AiReasoningBlockProps = {
    source: RhActionSource;
    payload: Record<string, unknown> | null | undefined;
    compact?: boolean;
};

function readImpact(payload: Record<string, unknown> | null | undefined) {
    const impact = payload?.impact;
    if (!impact || typeof impact !== "object" || Array.isArray(impact)) return null;
    return impact as Record<string, unknown>;
}

function readOriginalPayload(payload: Record<string, unknown> | null | undefined) {
    const original = payload?.original_payload;
    if (!original || typeof original !== "object" || Array.isArray(original)) return null;
    return original as Record<string, unknown>;
}

export function AiReasoningBlock({ source, payload, compact }: AiReasoningBlockProps) {
    if (source === "strategist") {
        const impact = readImpact(payload);
        if (!impact) return null;
        const gaps = Number(impact.critical_gap_count ?? 0);
        const skills = Number(impact.uncovered_skills_count ?? 0);
        const reduction = impact.expected_risk_reduction;
        return (
            <div
                className={cx(
                    "rounded-sm border-l-2 border-inbox-agent-strategist bg-purple-50 px-3 py-2 dark:bg-purple-950/30",
                    compact ? "mt-2" : "mt-3",
                )}
            >
                <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                    <Sparkles className="size-3" aria-hidden />
                    Raisonnement Strategist
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ws-secondary">
                    {gaps > 0 ? `${gaps} critical gap${gaps > 1 ? "s" : ""}` : null}
                    {gaps > 0 && skills > 0 ? " · " : null}
                    {skills > 0
                        ? `${skills} skill${skills > 1 ? "s" : ""} non couverte${skills > 1 ? "s" : ""}`
                        : null}
                    {reduction != null && reduction !== "" ? (
                        <>
                            {(gaps > 0 || skills > 0) && " · "}
                            Risque réduit -{String(reduction)} pts
                        </>
                    ) : null}
                </p>
            </div>
        );
    }

    if (source === "watchdog") {
        const riskType = String(payload?.risk_type ?? "").trim();
        const original = readOriginalPayload(payload);
        const contractEnd = original?.contract_end_date;
        return (
            <div
                className={cx(
                    "rounded-sm border-l-2 border-inbox-agent-watchdog bg-red-50 px-3 py-2 dark:bg-red-950/30",
                    compact ? "mt-2" : "mt-3",
                )}
            >
                <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-300">
                    <AlertTriangle className="size-3" aria-hidden />
                    Détection Watchdog
                </div>
                <p className="mt-1 text-xs text-ws-secondary">
                    {riskType ? `Type : ${riskType.replace(/_/g, " ")}` : "Alerte détectée"}
                    {contractEnd ? (
                        <>
                            {riskType ? " · " : ""}
                            Échéance : {String(contractEnd)}
                        </>
                    ) : null}
                </p>
            </div>
        );
    }

    return null;
}
