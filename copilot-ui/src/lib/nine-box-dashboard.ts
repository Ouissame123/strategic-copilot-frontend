import type { CSSProperties } from "react";
import type { DashboardAnalyst } from "@/types/api.types";

export type NineBoxTone = "red" | "blue" | "purple" | "orange" | "green" | "neutral";

/** @deprecated Ancien modèle 5 cases — préférer `NineBoxBackendLabel`. */
export type NineBoxBoxKey = "future_star" | "key_contributor" | "star" | "dependable" | "underperformer";

/** Labels `box_label` renvoyés par n8n (snake_case). */
export type NineBoxBackendLabel =
    | "star"
    | "high_performer"
    | "workhorse"
    | "key_contributor"
    | "solid_contributor"
    | "dependable"
    | "inconsistent_star"
    | "up_or_out"
    | "underperformer";

export const NINE_BOX_BACKEND_LABELS: readonly NineBoxBackendLabel[] = [
    "star",
    "high_performer",
    "workhorse",
    "key_contributor",
    "solid_contributor",
    "dependable",
    "inconsistent_star",
    "up_or_out",
    "underperformer",
] as const;

/** Grille 3×3 : performance ↓ (lignes), potentiel → (colonnes). */
export const NINE_BOX_GRID_LAYOUT: readonly (readonly NineBoxBackendLabel[])[] = [
    ["inconsistent_star", "workhorse", "star"],
    ["up_or_out", "solid_contributor", "key_contributor"],
    ["underperformer", "dependable", "high_performer"],
] as const;

export const NINE_BOX_BACKEND_I18N_KEYS: Record<NineBoxBackendLabel, string> = {
    star: "analystNineBoxLabelStar",
    high_performer: "analystNineBoxLabelHighPerformer",
    workhorse: "analystNineBoxLabelWorkhorse",
    key_contributor: "analystNineBoxLabelKeyContributor",
    solid_contributor: "analystNineBoxLabelSolidContributor",
    dependable: "analystNineBoxLabelDependable",
    inconsistent_star: "analystNineBoxLabelInconsistentStar",
    up_or_out: "analystNineBoxLabelUpOrOut",
    underperformer: "analystNineBoxLabelUnderperformer",
};

const BOX_LABEL_ALIASES: Record<string, NineBoxBackendLabel> = {
    stars: "star",
    high_performers: "high_performer",
    workhorses: "workhorse",
    underperformers: "underperformer",
};

/** Normalise `box_label` pour comparaison stricte avec le backend. */
export function normalizeBoxLabel(raw: string): string {
    const n = raw.trim().toLowerCase().replace(/\s+/g, "_");
    return BOX_LABEL_ALIASES[n] ?? n;
}

/** @deprecated Utiliser `NINE_BOX_BACKEND_I18N_KEYS`. */
export const NINE_BOX_UI_KEY_TO_BACKEND_LABEL: Record<NineBoxBoxKey, string> = {
    star: "star",
    key_contributor: "high_performer",
    future_star: "key_contributor",
    dependable: "solid_contributor",
    underperformer: "underperformer",
};

export type NineBoxTalentEntry = {
    box_label: string;
    talent_name: string;
};

export interface NineBoxGridCell {
    count: number | null;
    label: string;
    tone: NineBoxTone;
    isStructuralSlot?: boolean;
    boxKey?: NineBoxBoxKey | null;
    /** `box_label` exact pour filtrer `grid.talents` au clic. */
    backendBoxLabel?: string | null;
}

/** @deprecated Utiliser `NINE_BOX_BACKEND_I18N_KEYS`. */
export const NINE_BOX_DIST_LABEL_KEYS = {
    future_star: "analystNineBoxLabelKeyContributor",
    key_contributor: "analystNineBoxLabelHighPerformer",
    star: "analystNineBoxLabelStar",
    dependable: "analystNineBoxLabelSolidContributor",
    underperformer: "analystNineBoxLabelUnderperformer",
} as const;

const NINE_BOX_LABEL_TONES: Record<NineBoxBackendLabel, NineBoxTone> = {
    star: "green",
    high_performer: "green",
    workhorse: "blue",
    key_contributor: "orange",
    solid_contributor: "blue",
    dependable: "blue",
    inconsistent_star: "orange",
    up_or_out: "red",
    underperformer: "red",
};

const NINE_BOX_CATEGORY_SYNONYMS: Record<string, readonly string[]> = {
    future_star: ["futurestar", "future_star", "risingstar", "rising_star", "highpotential"],
    key_contributor: ["keycontributor", "key_contributor", "keycontributer", "pillar", "corecontributor"],
    star: ["star", "stars", "topstar", "top_star"],
    dependable: ["dependable", "solid", "coreprofessional"],
    underperformer: ["underperformer", "underperformers", "under_performer", "lowperformer", "low_performer"],
} as const;

function fingerprintKey(k: string): string {
    return k.replace(/[_\s-]/g, "").toLowerCase();
}

function readAnalystNumber(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function extractCountValue(v: unknown): number {
    const direct = readAnalystNumber(v);
    if (direct !== null) return direct;
    if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        return readAnalystNumber(o.count ?? o.total ?? o.value ?? o.headcount ?? o.n) ?? 0;
    }
    return 0;
}

export function normalizeNineBoxDistribution(raw: unknown): Record<string, unknown> {
    if (raw == null || raw === "") return {};
    if (typeof raw === "string") {
        try {
            return normalizeNineBoxDistribution(JSON.parse(raw) as unknown);
        } catch {
            return {};
        }
    }
    if (Array.isArray(raw)) {
        const out: Record<string, unknown> = {};
        for (const item of raw) {
            if (!item || typeof item !== "object") continue;
            const o = item as Record<string, unknown>;
            const key =
                (typeof o.box_label === "string" && o.box_label.trim()) ||
                (typeof o.boxLabel === "string" && o.boxLabel.trim()) ||
                (typeof o.key === "string" && o.key.trim()) ||
                (typeof o.category === "string" && o.category.trim()) ||
                (typeof o.box === "string" && o.box.trim()) ||
                (typeof o.id === "string" && o.id.trim()) ||
                (typeof o.label === "string" && o.label.trim());
            if (!key) continue;
            out[key] = o.count ?? o.value ?? o.total ?? o;
        }
        return out;
    }
    if (typeof raw === "object") {
        const o = raw as Record<string, unknown>;
        const nestedKeys = ["distribution", "boxes", "categories", "data", "breakdown"] as const;
        for (const nk of nestedKeys) {
            const inner = o[nk];
            if (inner && typeof inner === "object" && !Array.isArray(inner)) {
                const normalized = normalizeNineBoxDistribution(inner);
                if (Object.keys(normalized).length > 0) return normalized;
            }
        }
        return { ...o };
    }
    return {};
}

function distGetCountNullable(dist: Record<string, unknown>, canonical: keyof typeof NINE_BOX_CATEGORY_SYNONYMS): number | null {
    const targets = new Set(NINE_BOX_CATEGORY_SYNONYMS[canonical].map((s) => fingerprintKey(s)));
    for (const [k, v] of Object.entries(dist)) {
        if (targets.has(fingerprintKey(k))) {
            return extractCountValue(v);
        }
    }
    return null;
}

function inferToneFromKey(key: string): NineBoxTone {
    const k = key.replace(/_/g, "").toLowerCase();
    if (k.includes("underperform")) return "red";
    if (k === "dependable") return "blue";
    if (k.includes("keycontributor")) return "purple";
    if (k.includes("futurestar")) return "orange";
    if (k === "star" || k === "stars") return "green";
    return "neutral";
}

const TONE_RGB: Record<NineBoxTone, [number, number, number]> = {
    red: [220, 38, 38],
    blue: [37, 99, 235],
    purple: [124, 58, 237],
    orange: [234, 88, 12],
    green: [22, 163, 74],
    neutral: [100, 116, 139],
};

export function nineBoxCellBackgroundStyle(tone: NineBoxTone, ratio: number): CSSProperties {
    const [r, g, b] = TONE_RGB[tone];
    const t = Math.min(1, Math.max(0, ratio));
    const alpha = tone === "neutral" && t === 0 ? 0.06 : 0.1 + 0.42 * t;
    return { backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha})` };
}

function parseMatrixCell(cell: unknown): NineBoxGridCell {
    if (cell == null) return { count: 0, label: "—", tone: "neutral" };
    if (typeof cell === "number" || typeof cell === "string") {
        return { count: readAnalystNumber(cell) ?? 0, label: "", tone: "neutral" };
    }
    if (typeof cell === "object") {
        const o = cell as Record<string, unknown>;
        const count = extractCountValue(o.count ?? o.value ?? o.headcount ?? o.n ?? o);
        const rawKey = typeof o.key === "string" ? o.key : typeof o.box_key === "string" ? o.box_key : "";
        const labelRaw = typeof o.label === "string" ? o.label : typeof o.name === "string" ? o.name : "";
        const label = labelRaw.trim() || (rawKey ? rawKey.replace(/_/g, " ") : "");
        const tone = rawKey || labelRaw ? inferToneFromKey((rawKey || labelRaw).replace(/\s+/g, "_")) : "neutral";
        return { count, label: label || "—", tone };
    }
    return { count: 0, label: "—", tone: "neutral" };
}

function matrixRowsFromUnknown(raw: unknown): unknown[][] | null {
    if (raw == null) return null;
    if (Array.isArray(raw) && raw.length === 9) {
        return [raw.slice(0, 3), raw.slice(3, 6), raw.slice(6, 9)];
    }
    if (Array.isArray(raw) && raw.length === 3 && raw.every((row) => Array.isArray(row))) {
        return raw as unknown[][];
    }
    if (typeof raw === "object" && raw !== null) {
        const o = raw as Record<string, unknown>;
        const flat = o.cells ?? o.items ?? o.values;
        if (Array.isArray(flat) && flat.length === 9) {
            return [flat.slice(0, 3), flat.slice(3, 6), flat.slice(6, 9)];
        }
        const rows = (o.rows ?? o.matrix ?? o.grid) as unknown;
        if (Array.isArray(rows) && rows.length === 3 && rows.every((row) => Array.isArray(row) && (row as unknown[]).length === 3)) {
            return rows as unknown[][];
        }
    }
    return null;
}

function parseNineBoxMatrixFromApi(raw: unknown, tZone: (i: number) => string): NineBoxGridCell[][] | null {
    const rows = matrixRowsFromUnknown(raw);
    if (!rows || rows.length !== 3) return null;
    const grid: NineBoxGridCell[][] = rows.map((row) => row.map((cell) => parseMatrixCell(cell)));
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const cell = grid[r][c];
            if (!cell.label.trim()) cell.label = tZone(r * 3 + c + 1);
        }
    }
    return grid;
}

function nineBoxMatrixSumCounts(grid: NineBoxGridCell[][]): number {
    return grid.flat().reduce((sum, cell) => sum + (cell.count ?? 0), 0);
}

function strField(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function talentNameFromRow(row: unknown): string | null {
    if (!row || typeof row !== "object") return null;
    const o = row as Record<string, unknown>;
    const nested = o.talent;
    const fromNested =
        nested && typeof nested === "object"
            ? (nested as Record<string, unknown>).name ?? (nested as Record<string, unknown>).full_name
            : null;
    const n = o.talent_name ?? o.full_name ?? o.name ?? fromNested;
    if (typeof n === "string" && n.trim()) return n.trim();
    return null;
}

/** Extrait `grid.talents` (ou équivalent) avec `box_label` tel que renvoyé par le backend. */
export function parseNineBoxTalentEntries(matrix: unknown): NineBoxTalentEntry[] {
    if (matrix == null) return [];

    const collectFromArray = (raw: unknown): NineBoxTalentEntry[] => {
        if (!Array.isArray(raw)) return [];
        const out: NineBoxTalentEntry[] = [];
        for (const row of raw) {
            if (!row || typeof row !== "object") continue;
            const o = row as Record<string, unknown>;
            const box_label = normalizeBoxLabel(strField(o.box_label ?? o.boxLabel));
            const talent_name = talentNameFromRow(o);
            if (!box_label || !talent_name) continue;
            out.push({ box_label, talent_name });
        }
        return out;
    };

    if (Array.isArray(matrix)) return collectFromArray(matrix);

    if (typeof matrix === "object") {
        const o = matrix as Record<string, unknown>;
        const fromTalents = collectFromArray(o.talents);
        if (fromTalents.length > 0) return fromTalents;
        const grid = o.grid;
        if (grid && typeof grid === "object" && !Array.isArray(grid)) {
            return collectFromArray((grid as Record<string, unknown>).talents);
        }
    }

    return [];
}

function countTalentsForBackendLabel(talents: NineBoxTalentEntry[], backendLabel: NineBoxBackendLabel): number {
    const target = normalizeBoxLabel(backendLabel);
    return talents.filter((t) => t.box_label === target).length;
}

function distCountForBackendLabel(dist: Record<string, unknown>, backendLabel: NineBoxBackendLabel): number {
    const target = normalizeBoxLabel(backendLabel);
    for (const [k, v] of Object.entries(dist)) {
        if (normalizeBoxLabel(k) === target) return extractCountValue(v);
    }
    return 0;
}

/** Grille 3×3 complète — comptes depuis `grid.talents` uniquement. */
export function buildNineBoxFromTalents(
    talents: NineBoxTalentEntry[],
    tCell: (backendLabel: NineBoxBackendLabel) => string,
): NineBoxGridCell[][] {
    const grid = NINE_BOX_GRID_LAYOUT.map((row) =>
        row.map((backendBoxLabel): NineBoxGridCell => {
            const count = countTalentsForBackendLabel(talents, backendBoxLabel);
            return {
                count,
                label: tCell(backendBoxLabel),
                tone: NINE_BOX_LABEL_TONES[backendBoxLabel],
                backendBoxLabel,
            };
        }),
    );

    const sumCases = grid.flat().reduce((s, c) => s + (c.count ?? 0), 0);
    console.log(talents.map((t) => t.box_label));
    console.log("total matrix", sumCases, "total talents", talents.length);

    const known = new Set<string>(NINE_BOX_BACKEND_LABELS);
    const unmapped = talents.filter((t) => !known.has(t.box_label));
    if (unmapped.length > 0) {
        console.warn(
            "nine-box labels hors grille",
            unmapped.map((t) => t.box_label),
        );
    }

    return grid;
}

export function buildNineBoxFromDistribution(
    dist: Record<string, unknown>,
    tCell: (backendLabel: NineBoxBackendLabel) => string,
): NineBoxGridCell[][] {
    return NINE_BOX_GRID_LAYOUT.map((row) =>
        row.map((backendBoxLabel): NineBoxGridCell => ({
            count: distCountForBackendLabel(dist, backendBoxLabel),
            label: tCell(backendBoxLabel),
            tone: NINE_BOX_LABEL_TONES[backendBoxLabel],
            backendBoxLabel,
        })),
    );
}

export function buildNineBoxGridFromAnalyst(
    analyst: DashboardAnalyst | undefined,
    tCell: (backendLabel: NineBoxBackendLabel) => string,
    tZone: (index: number) => string,
): NineBoxGridCell[][] | null {
    if (!analyst) return null;

    const talentEntries = parseNineBoxTalentEntries(analyst.nine_box_matrix);
    if (talentEntries.length > 0) {
        return buildNineBoxFromTalents(talentEntries, tCell);
    }

    const nineBoxDistNormalized = normalizeNineBoxDistribution(analyst.nine_box_distribution);
    const rawDist = analyst.nine_box_distribution;
    const hasNineBoxDist = (Array.isArray(rawDist) && rawDist.length > 0) || Object.keys(nineBoxDistNormalized).length > 0;

    if (hasNineBoxDist) {
        return buildNineBoxFromDistribution(nineBoxDistNormalized, tCell);
    }

    const parsed = parseNineBoxMatrixFromApi(analyst.nine_box_matrix, tZone);
    const matrixSum = parsed ? nineBoxMatrixSumCounts(parsed) : 0;
    if (parsed && matrixSum > 0) return parsed;
    return parsed ?? null;
}

/** Filtre strict sur `box_label` backend (pas le titre UI). */
export function filterNineBoxTalentsByBoxLabel(matrix: unknown, selectedBoxLabel: string): NineBoxTalentEntry[] {
    if (!selectedBoxLabel) return [];
    const target = normalizeBoxLabel(selectedBoxLabel);
    return parseNineBoxTalentEntries(matrix).filter((t) => t.box_label === target);
}

export function extractTalentsForNineBoxBox(matrix: unknown, backendLabel: NineBoxBackendLabel | NineBoxBoxKey): string[] {
    const label =
        backendLabel in NINE_BOX_UI_KEY_TO_BACKEND_LABEL
            ? NINE_BOX_UI_KEY_TO_BACKEND_LABEL[backendLabel as NineBoxBoxKey]
            : backendLabel;
    return filterNineBoxTalentsByBoxLabel(matrix, label).map((t) => t.talent_name);
}
