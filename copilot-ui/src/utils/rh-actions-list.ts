import { asRecord } from "@/utils/unwrap-api-payload";

/** Liste brute renvoyée par GET `/api/rh/actions` (forme variable). */
export function rowsFromRhActionsPayload(raw: unknown): Array<Record<string, unknown> & { id: string }> {
    const r = asRecord(raw);
    const items = r.items ?? r.data ?? r.actions ?? r.rows;
    if (!Array.isArray(items)) return [];
    return items.map((x, i) => {
        const row = asRecord(x);
        return {
            ...row,
            // ID d'action RH uniquement (éviter tout fallback ambigu type project_id/uuid générique).
            id: String(row.id ?? row.action_id ?? row.rh_action_id ?? row.request_id ?? ""),
            _row_index: i,
        };
    });
}

export function countRhActionsPending(raw: unknown): number {
    const rows = rowsFromRhActionsPayload(raw);
    let n = 0;
    for (const row of rows) {
        const s = String(row.status ?? row.state ?? "")
            .trim()
            .toLowerCase();
        const refused =
            s.includes("refus") || s.includes("reject") || s.includes("declin") || s.includes("cancel");
        const accepted = s.includes("accept") || s.includes("approved") || s.includes("valid");
        if (refused || accepted) continue;
        n++;
    }
    return n;
}
