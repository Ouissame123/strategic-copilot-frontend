/**
 * 9-Box Analyst RH — `response.grid.{distribution, boxes, talents}`.
 */
import { asRecord } from "@/utils/unwrap-api-payload";
import type {
    RhAnalystNineBoxCell,
    RhAnalystNineBoxDistributionItem,
    RhAnalystNineBoxResponse,
    RhAnalystNineBoxTalent,
} from "@/types/rh-analyst.types";

export const RH_NINE_BOX_DISTRIBUTION_ORDER: readonly { key: string; display: string }[] = [
    { key: "high_performer", display: "High performers" },
    { key: "workhorse", display: "Workhorses" },
    { key: "solid_contributor", display: "Solid contributors" },
    { key: "dependable", display: "Dependable" },
    { key: "underperformer", display: "Underperformers" },
] as const;

const BOX_LABEL_DISPLAY: Record<string, string> = {
    high_performer: "High performers",
    workhorse: "Workhorses",
    workhorses: "Workhorses",
    solid_contributor: "Solid contributors",
    dependable: "Dependable",
    underperformer: "Underperformers",
    underperformers: "Underperformers",
};

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function fingerprintKey(k: string): string {
    return k.replace(/[_\s-]/g, "").toLowerCase();
}

function extractCount(v: unknown): number {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }
    if (v && typeof v === "object") {
        const o = asRecord(v);
        return num(o.count ?? o.total ?? o.value ?? o.headcount ?? o.n);
    }
    return 0;
}

/** Lit uniquement `grid.distribution` (objet clé→count ou tableau { box_label, count }). */
export function parseGridDistribution(raw: unknown): Record<string, number> {
    if (raw == null) return {};

    if (Array.isArray(raw)) {
        const out: Record<string, number> = {};
        for (const item of raw) {
            if (!item || typeof item !== "object") continue;
            const o = asRecord(item);
            const label = str(o.box_label ?? o.boxLabel).toLowerCase();
            if (!label) continue;
            out[label] = extractCount(o.count ?? o.value ?? o.total);
        }
        return out;
    }

    if (typeof raw === "object") {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(asRecord(raw))) {
            if (v != null && typeof v === "object") continue;
            const label = k.trim().toLowerCase();
            if (!label) continue;
            out[label] = extractCount(v);
        }
        return out;
    }

    return {};
}

export function displayLabelForBoxLabel(box_label: string): string {
    const key = box_label.trim().toLowerCase();
    return BOX_LABEL_DISPLAY[key] ?? box_label.replace(/_/g, " ");
}

function countForLabel(flat: Record<string, number>, key: string): number {
    if (flat[key] != null) return flat[key];
    const fp = fingerprintKey(key);
    for (const [k, v] of Object.entries(flat)) {
        if (fingerprintKey(k) === fp) return v;
    }
    return 0;
}

export function buildDistributionItems(flat: Record<string, number>): RhAnalystNineBoxDistributionItem[] {
    const hasAny = Object.values(flat).some((c) => c > 0);
    if (!hasAny) return [];

    const items = RH_NINE_BOX_DISTRIBUTION_ORDER.map(({ key, display }) => ({
        box_label: key,
        count: countForLabel(flat, key),
        display_label: display,
    })).filter((item) => item.count > 0);

    const seen = new Set(items.map((i) => fingerprintKey(i.box_label)));
    for (const [label, count] of Object.entries(flat)) {
        if (count <= 0 || seen.has(fingerprintKey(label))) continue;
        items.push({
            box_label: label,
            count,
            display_label: displayLabelForBoxLabel(label),
        });
    }

    return items;
}

export function boxIndexToRowCol(box_index: number): { row: number; col: number } | null {
    if (box_index < 1 || box_index > 9) return null;
    const zero = box_index - 1;
    return { row: Math.floor(zero / 3), col: zero % 3 };
}

function parseTalent(row: unknown): RhAnalystNineBoxTalent | null {
    const o = asRecord(row);
    const talent_name = str(o.talent_name ?? o.name ?? o.full_name);
    const box_index = num(o.box_index ?? o.boxIndex);
    if (!talent_name || box_index < 1 || box_index > 9) return null;
    return {
        talent_id: str(o.talent_id ?? o.id) || null,
        talent_name,
        box_index,
        box_label: str(o.box_label ?? o.boxLabel) || null,
    };
}

function parseBoxMeta(row: unknown): Partial<RhAnalystNineBoxCell> | null {
    const o = asRecord(row);
    const box_index = num(o.box_index ?? o.boxIndex);
    if (box_index < 1 || box_index > 9) return null;
    return {
        box_index,
        box_label: str(o.box_label ?? o.boxLabel) || null,
        performance: str(o.performance ?? o.performance_level) || null,
        potential: str(o.potential ?? o.potential_level) || null,
    };
}

export function buildRhNineBoxMatrix(
    boxes: unknown,
    talents: unknown,
): RhAnalystNineBoxCell[][] {
    const cellMap = new Map<number, RhAnalystNineBoxCell>();

    for (let box_index = 1; box_index <= 9; box_index++) {
        cellMap.set(box_index, {
            box_index,
            box_label: null,
            performance: null,
            potential: null,
            talents: [],
        });
    }

    if (Array.isArray(boxes)) {
        for (const row of boxes) {
            const meta = parseBoxMeta(row);
            if (!meta?.box_index) continue;
            const cell = cellMap.get(meta.box_index)!;
            cellMap.set(meta.box_index, {
                ...cell,
                box_label: meta.box_label ?? cell.box_label,
                performance: meta.performance ?? cell.performance,
                potential: meta.potential ?? cell.potential,
            });
        }
    }

    if (Array.isArray(talents)) {
        for (const row of talents) {
            const t = parseTalent(row);
            if (!t) continue;
            const cell = cellMap.get(t.box_index);
            if (!cell) continue;
            cell.talents.push(t);
            if (!cell.box_label && t.box_label) cell.box_label = t.box_label;
        }
    }

    const matrix: RhAnalystNineBoxCell[][] = [[], [], []];
    for (let box_index = 1; box_index <= 9; box_index++) {
        const pos = boxIndexToRowCol(box_index)!;
        matrix[pos.row][pos.col] = cellMap.get(box_index)!;
    }
    return matrix;
}

function gridFromRecord(r: Record<string, unknown>): Record<string, unknown> {
    const g = asRecord(r.grid);
    if (Object.keys(g).length > 0) return g;
    const data = r.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
        const nested = asRecord((data as Record<string, unknown>).grid);
        if (Object.keys(nested).length > 0) return nested;
    }
    const json = asRecord(r.json);
    return asRecord(json.grid);
}

export function extractNineBoxGridPayload(root: Record<string, unknown>, raw?: unknown): Record<string, unknown> {
    const fromRoot = gridFromRecord(root);
    if (Object.keys(fromRoot).length > 0) return fromRoot;

    if (raw != null && raw !== root) {
        if (Array.isArray(raw) && raw.length > 0) {
            for (const item of raw) {
                const nested = extractNineBoxGridPayload(asRecord(item), item);
                if (Object.keys(nested).length > 0) return nested;
            }
        }
        if (typeof raw === "object" && !Array.isArray(raw)) {
            return gridFromRecord(raw as Record<string, unknown>);
        }
    }

    return {};
}

export function normalizeRhNineBoxFromGrid(
    grid: Record<string, unknown>,
    totalFromApi: number,
    status?: string,
): RhAnalystNineBoxResponse {
    const flat = parseGridDistribution(grid.distribution);
    const distribution = buildDistributionItems(flat);
    const matrix = buildRhNineBoxMatrix(grid.boxes, grid.talents);

    const sumDist = distribution.reduce((s, d) => s + d.count, 0);
    const talentCount = matrix.flat().reduce((s, c) => s + c.talents.length, 0);
    const total_talents = totalFromApi > 0 ? totalFromApi : sumDist > 0 ? sumDist : talentCount;

    return {
        status,
        total_talents,
        distribution,
        matrix,
    };
}
