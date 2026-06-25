/** Source affichée d'une action RH (manager ou agent IA). */
export type RhActionSource = "manager" | "watchdog" | "strategist" | "analyst" | "matchmaker";

export const RH_ACTION_SOURCES: RhActionSource[] = [
    "manager",
    "watchdog",
    "strategist",
    "analyst",
    "matchmaker",
];

function readPayloadSource(item: Record<string, unknown>): string {
    const payload = item.payload;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        return String((payload as Record<string, unknown>).source ?? "").trim();
    }
    return "";
}

/** Classifie la source d'une demande RH pour l'inbox (tabs + badges). */
export function classifySource(item: Record<string, unknown>): RhActionSource {
    const src = readPayloadSource(item).toLowerCase();

    if (src === "wf_strategist") return "strategist";
    if (src === "rh_risks_watchdog" || src === "wf_watchdog" || src === "wf_rh_risks_watchdog") {
        return "watchdog";
    }
    if (src === "wf_analyst") return "analyst";
    if (src === "wf_matchmaker") return "matchmaker";

    const managerId = item.manager_user_id ?? item.manager_id;
    if (managerId && !readPayloadSource(item)) return "manager";

    return "manager";
}

export function countBySource(items: Record<string, unknown>[]): Record<RhActionSource | "all", number> {
    const counts: Record<RhActionSource | "all", number> = {
        all: items.length,
        manager: 0,
        watchdog: 0,
        strategist: 0,
        analyst: 0,
        matchmaker: 0,
    };
    for (const item of items) {
        counts[classifySource(item)] += 1;
    }
    return counts;
}
