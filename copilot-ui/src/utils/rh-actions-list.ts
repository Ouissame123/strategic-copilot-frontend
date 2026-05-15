import { asRecord, unwrapDataPayload } from "@/utils/unwrap-api-payload";

/** Extrait le tableau d’items depuis les réponses n8n (liste manager, formes variables). */
function extractItemsArray(raw: unknown): unknown[] {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw;

    const r = asRecord(raw);
    let items: unknown = r.items ?? r.actions ?? r.rows ?? r.records ?? r.results;
    if (Array.isArray(items)) return items;

    const inner = unwrapDataPayload(raw);
    const ir = asRecord(inner);
    items = ir.items ?? ir.actions ?? ir.rows ?? ir.records ?? ir.results;
    if (Array.isArray(items)) return items;

    if (Array.isArray(r.data)) return r.data;

    const dataField = r.data;
    if (dataField && typeof dataField === "object" && !Array.isArray(dataField)) {
        const d = asRecord(dataField);
        const nested = d.items ?? d.actions ?? d.rows;
        if (Array.isArray(nested)) return nested;
    }

    return [];
}

/** Liste brute renvoyée par GET actions RH (forme variable, ex. `WF_Manager_RH_Actions` → `items`). */
export function rowsFromRhActionsPayload(raw: unknown): Array<Record<string, unknown> & { id: string }> {
    const items = extractItemsArray(raw);
    return items.map((x, i) => {
        const row = asRecord(x);
        const type = row.type ?? row.request_type;
        return {
            ...row,
            type,
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
