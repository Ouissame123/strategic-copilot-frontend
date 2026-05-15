import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardAnalyst, DashboardAnalystAtRiskTalent, DashboardAnalystIpiTopPerformer } from "@/types/api.types";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";

type NineBoxTone = "red" | "blue" | "purple" | "orange" | "green" | "neutral";

type NineBoxBoxKey = "future_star" | "key_contributor" | "star" | "dependable" | "underperformer";

interface NineBoxGridCell {
    /** `null` = case structurelle ou catégorie absente des données (affichage « — » pour l’effectif). */
    count: number | null;
    label: string;
    tone: NineBoxTone;
    /** Cases vides de la grille 3×3 (non cliquables). */
    isStructuralSlot?: boolean;
    /** Catégorie métier cliquable ; absent pour la matrice API brute. */
    boxKey?: NineBoxBoxKey | null;
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

/** Synonymes normalisés (sans séparateur, minuscules) pour faire correspondre les clés API. */
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

/**
 * Aplatit `nine_box_distribution` : JSON string, tableau { category, count }, ou objet imbriqué
 * (`distribution`, `boxes`, `categories`, `data`, `breakdown`).
 */
function normalizeNineBoxDistribution(raw: unknown): Record<string, unknown> {
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

function formatAnalystStatDisplay(n: number | null): string {
    if (n === null) return "—";
    return String(Math.round(n));
}

function formatAnalystIpi(n: number | null): string {
    if (n === null) return "—";
    return n.toFixed(1);
}

function formatMobilityScore(n: number | null): string {
    if (n === null) return "—";
    return n.toFixed(1);
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

function cellBackgroundStyle(tone: NineBoxTone, ratio: number): CSSProperties {
    const [r, g, b] = TONE_RGB[tone];
    const t = Math.min(1, Math.max(0, ratio));
    const alpha = tone === "neutral" && t === 0 ? 0.06 : 0.1 + 0.42 * t;
    return { backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha})` };
}

function parseMatrixCell(cell: unknown, r: number, c: number): NineBoxGridCell {
    if (cell == null) {
        return { count: 0, label: "—", tone: "neutral" };
    }
    if (typeof cell === "number" || typeof cell === "string") {
        const count = readAnalystNumber(cell) ?? 0;
        return { count, label: "", tone: "neutral" };
    }
    if (typeof cell === "object") {
        const o = cell as Record<string, unknown>;
        const count = extractCountValue(o.count ?? o.value ?? o.headcount ?? o.n ?? o);
        const rawKey = typeof o.key === "string" ? o.key : typeof o.box_key === "string" ? o.box_key : "";
        const labelRaw = typeof o.label === "string" ? o.label : typeof o.name === "string" ? o.name : "";
        const label = labelRaw.trim() || (rawKey ? rawKey.replace(/_/g, " ") : "");
        const tone = rawKey || labelRaw ? inferToneFromKey((rawKey || labelRaw).replace(/\s+/g, "_")) : "neutral";
        return {
            count,
            label: label || `—`,
            tone,
        };
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

function canParseNineBoxMatrix(raw: unknown): boolean {
    const rows = matrixRowsFromUnknown(raw);
    return !!rows && rows.length === 3 && rows.every((row) => Array.isArray(row) && row.length === 3);
}

function parseNineBoxMatrixFromApi(raw: unknown, tZone: (i: number) => string): NineBoxGridCell[][] | null {
    const rows = matrixRowsFromUnknown(raw);
    if (!rows || rows.length !== 3) return null;
    for (const row of rows) {
        if (!Array.isArray(row) || row.length !== 3) return null;
    }
    const grid: NineBoxGridCell[][] = rows.map((row, r) => row.map((cell, c) => parseMatrixCell(cell, r, c)));
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const cell = grid[r][c];
            if (!cell.label.trim()) {
                cell.label = tZone(r * 3 + c + 1);
            }
        }
    }
    return grid;
}

function nineBoxMatrixSumCounts(grid: NineBoxGridCell[][]): number {
    return grid.flat().reduce((sum, cell) => sum + (cell.count ?? 0), 0);
}

const NINE_BOX_DIST_LABEL_KEYS = {
    future_star: "analystNineBoxLabelFutureStar",
    key_contributor: "analystNineBoxLabelKeyContributor",
    star: "analystNineBoxLabelStar",
    dependable: "analystNineBoxLabelDependable",
    underperformer: "analystNineBoxLabelUnderperformer",
} as const;

function buildNineBoxFromDistribution(dist: Record<string, unknown>, tCell: (k: NineBoxBoxKey) => string): NineBoxGridCell[][] {
    const fs = distGetCountNullable(dist, "future_star");
    const kc = distGetCountNullable(dist, "key_contributor");
    const st = distGetCountNullable(dist, "star");
    const dep = distGetCountNullable(dist, "dependable");
    const up = distGetCountNullable(dist, "underperformer");
    return [
        [
            { count: fs, label: tCell("future_star"), tone: "orange", boxKey: "future_star" },
            { count: kc, label: tCell("key_contributor"), tone: "purple", boxKey: "key_contributor" },
            { count: st, label: tCell("star"), tone: "green", boxKey: "star" },
        ],
        [
            { count: null, label: "—", tone: "neutral", isStructuralSlot: true, boxKey: null },
            { count: dep, label: tCell("dependable"), tone: "blue", boxKey: "dependable" },
            { count: null, label: "—", tone: "neutral", isStructuralSlot: true, boxKey: null },
        ],
        [
            { count: up, label: tCell("underperformer"), tone: "red", boxKey: "underperformer" },
            { count: null, label: "—", tone: "neutral", isStructuralSlot: true, boxKey: null },
            { count: null, label: "—", tone: "neutral", isStructuralSlot: true, boxKey: null },
        ],
    ];
}

function hasAnalystContent(analyst: DashboardAnalyst | undefined): boolean {
    if (!analyst) return false;
    const s = analyst.stats;
    if (s) {
        const keys: (keyof typeof s)[] = [
            "team_size",
            "ipi_avg",
            "stable_count",
            "at_risk_count",
            "stars_count",
            "critical_box_count",
        ];
        if (keys.some((k) => readAnalystNumber(s[k]) !== null)) return true;
    }
    const performers = analyst.ipi_top_performers ?? [];
    if (performers.length > 0) return true;
    const risks = analyst.at_risk_talents ?? [];
    if (risks.length > 0) return true;
    if (canParseNineBoxMatrix(analyst.nine_box_matrix)) return true;
    const rawDist = analyst.nine_box_distribution;
    if (Array.isArray(rawDist) && rawDist.length > 0) return true;
    const distNorm = normalizeNineBoxDistribution(rawDist);
    if (Object.keys(distNorm).length > 0) return true;
    return false;
}

function AnalystMiniKpiCard({ label, value }: { label: string; value: string }) {
    return (
        <article className="rounded-xl border border-secondary/90 bg-primary px-4 py-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-primary">{value}</p>
        </article>
    );
}

function analystBadgeClassName(): string {
    return "shrink-0 rounded-full border border-brand-secondary/35 bg-brand-primary/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary";
}

function formatFlagDisplay(raw: string): string {
    if (!raw.trim()) return "—";
    return raw
        .replace(/_/g, " ")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function readAtRiskDrivers(row: DashboardAnalystAtRiskTalent): string[] {
    const raw =
        row.mobility_drivers ??
        row.drivers ??
        row.risk_drivers ??
        (row as Record<string, unknown>).mobilityDrivers ??
        (row as Record<string, unknown>).riskDrivers;
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, 2);
}

function AnalystBlockShell({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    const { t } = useTranslation("common");
    return (
        <article className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-secondary/80 bg-primary shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <div className="border-b border-secondary/60 bg-gradient-to-r from-secondary_subtle/40 to-transparent px-5 py-4 dark:from-secondary_subtle/15">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold tracking-tight text-primary">{title}</h4>
                    <span className={analystBadgeClassName()}>{t("managerWorkspace.dashboard.analystBadge")}</span>
                </div>
            </div>
            <div className="flex flex-1 flex-col p-4">{children}</div>
        </article>
    );
}

function EmptyBlock() {
    const { t } = useTranslation("common");
    return (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-12 text-center dark:bg-secondary_subtle/10">
            <p className="max-w-xs text-sm leading-relaxed text-tertiary">{t("managerWorkspace.dashboard.analystEmpty")}</p>
        </div>
    );
}

function boxLabelMatchesCanonical(boxLabel: string, canonical: keyof typeof NINE_BOX_CATEGORY_SYNONYMS): boolean {
    const targets = new Set(NINE_BOX_CATEGORY_SYNONYMS[canonical].map((s) => fingerprintKey(s)));
    return targets.has(fingerprintKey(boxLabel));
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

/** Extrait les noms affichables pour une case 9-box depuis `nine_box_matrix` (formats tableau ou objet). */
function extractTalentsForBox(matrix: unknown, canonical: NineBoxBoxKey): string[] {
    const out: string[] = [];
    const push = (s: string | null) => {
        if (s) out.push(s);
    };

    if (!matrix) return [];

    if (Array.isArray(matrix)) {
        for (const item of matrix) {
            if (!item || typeof item !== "object") continue;
            const o = item as Record<string, unknown>;
            const bl =
                (typeof o.box_label === "string" && o.box_label) ||
                (typeof o.boxLabel === "string" && o.boxLabel) ||
                (typeof o.box === "string" && o.box) ||
                "";
            if (!bl || !boxLabelMatchesCanonical(bl, canonical)) continue;
            push(talentNameFromRow(o));
            const lists = [o.talents, o.members, o.items] as const;
            for (const list of lists) {
                if (!Array.isArray(list)) continue;
                for (const el of list) {
                    push(talentNameFromRow(el) ?? (typeof el === "string" ? el.trim() || null : null));
                }
            }
        }
        return [...new Set(out)];
    }

    if (typeof matrix === "object") {
        const o = matrix as Record<string, unknown>;
        const buckets = o.talents_by_box ?? o.by_box ?? o.boxes ?? o.data;
        if (Array.isArray(buckets)) {
            return extractTalentsForBox(buckets, canonical);
        }
        if (buckets && typeof buckets === "object" && !Array.isArray(buckets)) {
            for (const [k, v] of Object.entries(buckets as Record<string, unknown>)) {
                if (!boxLabelMatchesCanonical(k, canonical)) continue;
                if (Array.isArray(v)) {
                    for (const el of v) {
                        push(talentNameFromRow(el) ?? (typeof el === "string" ? el.trim() || null : null));
                    }
                }
            }
            return [...new Set(out)];
        }
        if (Array.isArray(o.rows)) {
            return extractTalentsForBox(o.rows, canonical);
        }
        for (const [k, v] of Object.entries(o)) {
            if (!boxLabelMatchesCanonical(k, canonical)) continue;
            if (Array.isArray(v)) {
                for (const el of v) {
                    push(talentNameFromRow(el) ?? (typeof el === "string" ? el.trim() || null : null));
                }
            }
        }
        return [...new Set(out)];
    }

    return [];
}

function NineBoxMatrixGrid({
    grid,
    onSelectBox,
}: {
    grid: NineBoxGridCell[][];
    onSelectBox: (key: NineBoxBoxKey, title: string) => void;
}) {
    const flat = grid.flat();
    const numeric = flat.map((c) => (c.count == null ? 0 : c.count));
    const maxCount = Math.max(1, ...numeric);

    return (
        <div className="grid flex-1 grid-cols-3 gap-2 sm:gap-2.5">
            {grid.map((row, ri) =>
                row.map((cell, ci) => {
                    const n = cell.count ?? 0;
                    const ratio = maxCount > 0 ? n / maxCount : 0;
                    const borderTone = cell.tone === "neutral" ? "border-secondary/60" : "border-secondary/40";
                    const countDisplay = cell.count == null ? "—" : String(cell.count);
                    const isStructural = cell.isStructuralSlot === true;
                    const canOpenTalents = !isStructural && cell.boxKey != null;
                    const inner = (
                        <>
                            {!isStructural ? (
                                <span className="text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-secondary">
                                    {cell.label}
                                </span>
                            ) : null}
                            <span className="flex flex-1 items-center justify-center text-2xl font-semibold tabular-nums tracking-tight text-primary">
                                {isStructural ? "—" : countDisplay}
                            </span>
                        </>
                    );
                    return (
                        <div
                            key={`${ri}-${ci}`}
                            className={`flex min-h-[88px] flex-col rounded-xl border ${borderTone} p-2 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05] ${
                                canOpenTalents ? "transition hover:ring-2 hover:ring-brand-secondary/30" : ""
                            }`}
                            style={cellBackgroundStyle(cell.tone, ratio)}
                        >
                            {canOpenTalents ? (
                                <button
                                    type="button"
                                    className="flex h-full min-h-0 w-full flex-1 flex-col gap-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/50"
                                    onClick={() => {
                                        if (cell.boxKey) onSelectBox(cell.boxKey, cell.label);
                                    }}
                                    aria-label={cell.label}
                                >
                                    {inner}
                                </button>
                            ) : (
                                <div className="flex flex-1 flex-col gap-1">{inner}</div>
                            )}
                        </div>
                    );
                }),
            )}
        </div>
    );
}

export function AnalystSection({ analyst }: { analyst?: DashboardAnalyst }) {
    const { t } = useTranslation("common");
    const stats = analyst?.stats;
    const topPerformers = analyst?.ipi_top_performers ?? [];
    const atRiskTalents = analyst?.at_risk_talents ?? [];
    const [talentModal, setTalentModal] = useState<{ key: NineBoxBoxKey; title: string } | null>(null);

    const nineBoxDistNormalized = useMemo(
        () => normalizeNineBoxDistribution(analyst?.nine_box_distribution),
        [analyst?.nine_box_distribution],
    );

    const nineBoxGrid = useMemo(() => {
        const rawDist = analyst?.nine_box_distribution;
        const hasNineBoxDist =
            (Array.isArray(rawDist) && rawDist.length > 0) || Object.keys(nineBoxDistNormalized).length > 0;

        if (hasNineBoxDist) {
            return buildNineBoxFromDistribution(nineBoxDistNormalized, (key) =>
                t(`managerWorkspace.dashboard.${NINE_BOX_DIST_LABEL_KEYS[key]}`),
            );
        }

        const matrixRaw = analyst?.nine_box_matrix;
        const parsed = parseNineBoxMatrixFromApi(matrixRaw, (i) =>
            t("managerWorkspace.dashboard.analystNineBoxZoneFallback", { index: i }),
        );
        const matrixSum = parsed ? nineBoxMatrixSumCounts(parsed) : 0;
        if (parsed && matrixSum > 0) {
            return parsed;
        }
        return parsed ?? null;
    }, [analyst?.nine_box_matrix, analyst?.nine_box_distribution, nineBoxDistNormalized, t]);

    const talentsInModal = useMemo(() => {
        if (!talentModal || !analyst?.nine_box_matrix) return [];
        return extractTalentsForBox(analyst.nine_box_matrix, talentModal.key);
    }, [talentModal, analyst?.nine_box_matrix]);

    const showEmpty = !hasAnalystContent(analyst);

    return (
        <section className="space-y-5 rounded-2xl border border-secondary bg-primary p-5 shadow-sm">
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-primary">{t("managerWorkspace.dashboard.analystTitle")}</h3>
                    <span className="rounded-full border border-brand-secondary/40 bg-brand-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-brand-secondary">
                        {t("managerWorkspace.dashboard.analystBadge")}
                    </span>
                </div>
                <p className="max-w-3xl text-sm text-secondary">{t("managerWorkspace.dashboard.analystSubtitle")}</p>
            </div>

            {showEmpty ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-16 text-center dark:bg-secondary_subtle/10">
                    <p className="max-w-md text-sm leading-relaxed text-tertiary">{t("managerWorkspace.dashboard.analystEmpty")}</p>
                </div>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiTeam")}
                            value={formatAnalystStatDisplay(readAnalystNumber(stats?.team_size))}
                        />
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiIpiAvg")}
                            value={formatAnalystIpi(readAnalystNumber(stats?.ipi_avg))}
                        />
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiStables")}
                            value={formatAnalystStatDisplay(readAnalystNumber(stats?.stable_count))}
                        />
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiAtRisk")}
                            value={formatAnalystStatDisplay(readAnalystNumber(stats?.at_risk_count))}
                        />
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiStars")}
                            value={formatAnalystStatDisplay(readAnalystNumber(stats?.stars_count))}
                        />
                        <AnalystMiniKpiCard
                            label={t("managerWorkspace.dashboard.analystKpiCriticalBoxes")}
                            value={formatAnalystStatDisplay(readAnalystNumber(stats?.critical_box_count))}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
                        <AnalystBlockShell title={t("managerWorkspace.dashboard.analystBlockTopPerformers")}>
                            {topPerformers.length === 0 ? (
                                <EmptyBlock />
                            ) : (
                                <ul className="flex flex-1 flex-col gap-3">
                                    {topPerformers.map((row: DashboardAnalystIpiTopPerformer, i: number) => {
                                        const name = row.talent_name?.trim() || "—";
                                        const ipi = readAnalystNumber(row.ipi_score);
                                        const band = row.band?.trim().toLowerCase() ?? "";
                                        const pct = ipi != null ? Math.min(100, Math.max(0, (ipi / 10) * 100)) : 0;
                                        return (
                                            <li
                                                key={`${name}-${i}`}
                                                className="rounded-xl border border-secondary/70 border-l-[3px] border-l-violet-600 bg-primary_alt/70 px-4 py-3 dark:bg-secondary_subtle/25"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-bold tabular-nums text-tertiary">
                                                        {i + 1}.
                                                    </span>
                                                    <div className="min-w-0 flex-1 space-y-2">
                                                        <p className="text-sm font-semibold leading-snug text-primary">{name}</p>
                                                        <p className="text-xs leading-relaxed text-secondary">
                                                            {t("managerWorkspace.dashboard.analystIpiLine", {
                                                                ipi: formatAnalystIpi(ipi),
                                                                band: band || "—",
                                                            })}
                                                        </p>
                                                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary_subtle/80 dark:bg-secondary_subtle/40">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-brand-secondary"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </AnalystBlockShell>

                        <AnalystBlockShell title={t("managerWorkspace.dashboard.analystBlockAtRisk")}>
                            {atRiskTalents.length === 0 ? (
                                <EmptyBlock />
                            ) : (
                                <ul className="flex flex-1 flex-col gap-3">
                                    {atRiskTalents.map((row: DashboardAnalystAtRiskTalent, i: number) => {
                                        const name = row.talent_name?.trim() || "—";
                                        const flagRaw = row.mobility_flag?.trim() ?? "";
                                        const score = readAnalystNumber(row.mobility_score);
                                        const drivers = readAtRiskDrivers(row);
                                        return (
                                            <li
                                                key={`${name}-${i}`}
                                                className="rounded-xl border border-secondary/70 border-l-[3px] border-l-amber-600 bg-primary_alt/70 px-4 py-3 dark:bg-secondary_subtle/25"
                                            >
                                                <p className="text-sm font-semibold leading-snug text-primary">{name}</p>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    {flagRaw ? (
                                                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
                                                            {formatFlagDisplay(flagRaw)}
                                                        </span>
                                                    ) : null}
                                                    <span className="text-xs text-secondary">
                                                        {t("managerWorkspace.dashboard.analystAtRiskScoreLine", {
                                                            score: formatMobilityScore(score),
                                                        })}
                                                    </span>
                                                </div>
                                                {drivers.length > 0 ? (
                                                    <ul className="mt-2 space-y-0.5 border-t border-secondary/50 pt-2 text-[11px] text-tertiary">
                                                        {drivers.map((d) => (
                                                            <li key={d} className="leading-snug">
                                                                · {d}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : null}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </AnalystBlockShell>

                        <AnalystBlockShell title={t("managerWorkspace.dashboard.analystBlockNineBox")}>
                            {nineBoxGrid == null ? (
                                <EmptyBlock />
                            ) : (
                                <NineBoxMatrixGrid
                                    grid={nineBoxGrid}
                                    onSelectBox={(key, title) => setTalentModal({ key, title })}
                                />
                            )}
                        </AnalystBlockShell>
                    </div>
                </>
            )}
            <ModalOverlay
                isOpen={talentModal != null}
                onOpenChange={(open) => {
                    if (!open) setTalentModal(null);
                }}
                isDismissable
            >
                <Modal>
                    <Dialog className="max-w-md rounded-2xl border border-secondary bg-primary p-6 shadow-xl">
                        <div className="flex w-full max-w-md flex-col gap-4">
                            <h3 className="text-base font-semibold text-primary">{talentModal?.title}</h3>
                            {talentsInModal.length === 0 ? (
                                <p className="text-sm text-tertiary">{t("managerWorkspace.dashboard.analystNineBoxTalentEmpty")}</p>
                            ) : (
                                <ul className="max-h-[50vh] space-y-2 overflow-y-auto text-sm">
                                    {talentsInModal.map((name) => (
                                        <li
                                            key={name}
                                            className="rounded-lg border border-secondary/60 bg-primary_alt/80 px-3 py-2 text-primary dark:bg-secondary_subtle/20"
                                        >
                                            {name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <button
                                type="button"
                                className="self-end rounded-lg border border-secondary bg-primary_alt px-3 py-2 text-sm font-semibold text-secondary hover:bg-secondary_subtle"
                                onClick={() => setTalentModal(null)}
                            >
                                {t("managerWorkspace.dashboard.analystNineBoxModalClose")}
                            </button>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </section>
    );
}
