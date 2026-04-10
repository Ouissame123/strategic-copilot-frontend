/**
 * Mapping décision IA → couleurs et libellés UI.
 * Centralise la normalisation Continue / Adjust / Stop pour tout le frontend.
 */

export type DecisionType = "Continue" | "Adjust" | "Stop";

export const DECISION_CONFIG: Record<
    DecisionType,
    { color: "success" | "warning" | "error"; label: string; badgeColor: "success" | "warning" | "error" }
> = {
    Continue: { color: "success", label: "Continuer", badgeColor: "success" },
    Adjust: { color: "warning", label: "Ajuster", badgeColor: "warning" },
    Stop: { color: "error", label: "Stopper", badgeColor: "error" },
};

export function getDecisionConfig(decision: string | undefined): (typeof DECISION_CONFIG)[DecisionType] {
    const normalized = (decision ?? "").trim();
    if (normalized === "Continue") return DECISION_CONFIG.Continue;
    if (normalized === "Adjust") return DECISION_CONFIG.Adjust;
    if (normalized === "Stop") return DECISION_CONFIG.Stop;
    return DECISION_CONFIG.Adjust;
}

export function normalizeDecision(value: unknown): DecisionType {
    const s = typeof value === "string" ? value.trim() : "";
    if (s === "Continue") return "Continue";
    if (s === "Adjust") return "Adjust";
    if (s === "Stop") return "Stop";
    return "Adjust";
}
