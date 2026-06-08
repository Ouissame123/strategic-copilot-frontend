import { extractNineBoxGridPayload, normalizeRhNineBoxFromGrid } from "@/lib/rh-analyst-nine-box";
import type {
    DashboardAnalyst,
    DashboardAnalystAtRiskTalent,
    DashboardAnalystIpiTopPerformer,
} from "@/types/api.types";
import type {
    ManagerAnalystIpiResponse,
    ManagerAnalystMobilityResponse,
    ManagerAnalystMobilityTalent,
    ManagerAnalystNineBoxResponse,
} from "@/types/manager-analyst.types";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function recordNumbers(raw: unknown): Record<string, number> {
    const o = asRecord(raw);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(o)) {
        if (v != null && typeof v === "object") continue;
        out[k] = num(v);
    }
    return out;
}

export function normalizeManagerAnalystIpi(raw: unknown): ManagerAnalystIpiResponse | null {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") {
        throw new Error(str(root.message ?? root.error) || "Erreur analyse IPI");
    }
    const block = asRecord(root.data ?? root);
    const distRaw = block.distribution ?? root.distribution;
    const topRaw = block.top_5 ?? block.top5 ?? root.top_5 ?? block.top_talents ?? root.topTalents;
    const top_5 = (Array.isArray(topRaw) ? topRaw : [])
        .map((row): ManagerAnalystIpiTopRow | null => {
            const r = asRecord(row);
            const talent_name = str(r.talent_name ?? r.name);
            if (!talent_name) return null;
            return {
                talent_id: str(r.talent_id ?? r.id) || null,
                talent_name,
                ipi_score: num(r.ipi_score ?? r.ipi),
                ipi_band: str(r.ipi_band ?? r.band) || undefined,
                band: str(r.band ?? r.ipi_band) || undefined,
                workload_ratio: num(r.workload_ratio ?? r.allocation_pct),
            };
        })
        .filter((x): x is ManagerAnalystIpiTopRow => x != null);

    return {
        status: str(root.status) || undefined,
        avg_ipi: num(block.avg_ipi ?? root.avg_ipi),
        total_talents: num(block.total_talents ?? root.total_talents, top_5.length),
        distribution: {
            top: num(recordNumbers(distRaw).top),
            strong: num(recordNumbers(distRaw).strong),
            average: num(recordNumbers(distRaw).average ?? recordNumbers(distRaw).avg),
            at_risk: num(recordNumbers(distRaw).at_risk ?? recordNumbers(distRaw).atRisk),
        },
        top_5,
    };
}

export function normalizeManagerAnalystNineBox(raw: unknown): ManagerAnalystNineBoxResponse | null {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") {
        throw new Error(str(root.message ?? root.error) || "Erreur analyse 9-Box");
    }
    const grid = extractNineBoxGridPayload(root, raw);
    const normalized = normalizeRhNineBoxFromGrid(grid, num(root.total_talents ?? asRecord(root.data).total_talents), str(root.status) || undefined);

    const flat: Record<string, number> = {};
    for (const item of normalized.distribution) {
        flat[item.box_label] = item.count;
    }
    if (num(flat.stars) === 0 && flat.star == null) {
        const stars = num(asRecord(grid.distribution).stars ?? asRecord(grid.distribution).star);
        if (stars) flat.stars = stars;
    }
    if (num(flat.underperformers) === 0 && flat.underperformer == null) {
        const up = num(asRecord(grid.distribution).underperformers ?? asRecord(grid.distribution).underperformer);
        if (up) flat.underperformers = up;
    }

    return {
        status: normalized.status,
        total_talents: normalized.total_talents,
        grid: {
            distribution: flat,
            boxes: grid.boxes ?? normalized.matrix,
            talents: grid.talents,
        },
    };
}

export function normalizeManagerAnalystMobility(raw: unknown): ManagerAnalystMobilityResponse | null {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") {
        throw new Error(str(root.message ?? root.error) || "Erreur analyse mobilité");
    }
    const block = asRecord(root.data ?? root);
    const distRaw = block.distribution ?? root.distribution;
    const dist = recordNumbers(distRaw);
    const talentsRaw = block.talents ?? root.talents;
    const talents = (Array.isArray(talentsRaw) ? talentsRaw : [])
        .map((row): ManagerAnalystMobilityTalent | null => {
            const r = asRecord(row);
            const talent_name = str(r.talent_name ?? r.name);
            if (!talent_name) return null;
            return {
                talent_id: str(r.talent_id ?? r.id) || null,
                talent_name,
                mobility_score: num(r.mobility_score ?? r.score),
                mobility_bucket: str(r.mobility_bucket ?? r.bucket) || "unknown",
                mobility_flag: str(r.mobility_flag ?? r.flag) || undefined,
            };
        })
        .filter((x): x is ManagerAnalystMobilityTalent => x != null);

    return {
        status: str(root.status) || undefined,
        total_talents: num(block.total_talents ?? root.total_talents, talents.length),
        distribution: {
            ready_to_move: num(dist.ready_to_move ?? dist.readyToMove ?? dist.stable),
            anchored: num(dist.anchored),
            mobile: num(dist.mobile ?? dist.ready_to_move),
            ...dist,
        },
        talents,
    };
}

function mapNineBoxDistributionForUi(flat: Record<string, number>): Record<string, number> {
    const stars = num(flat.stars ?? flat.star ?? flat.high_performer ?? flat.high_performers);
    const under = num(flat.underperformers ?? flat.underperformer ?? flat.low_performer);
    return {
        star: stars,
        stars,
        future_star: num(flat.future_star ?? flat.high_potential ?? flat.rising_star),
        key_contributor: num(flat.key_contributor ?? flat.solid_contributor ?? flat.workhorse ?? flat.workhorses),
        dependable: num(flat.dependable ?? flat.solid_contributor),
        underperformer: under,
        underperformers: under,
        high_performer: stars,
    };
}

function mobilityTalentsToWatch(talents: ManagerAnalystMobilityTalent[]): DashboardAnalystAtRiskTalent[] {
    return talents
        .filter((t) => {
            const bucket = t.mobility_bucket.toLowerCase();
            if (bucket === "anchored") return true;
            const score = t.mobility_score;
            return score > 0 && score < 5;
        })
        .map((t) => ({
            talent_name: t.talent_name,
            mobility_flag: t.mobility_flag ?? t.mobility_bucket,
            mobility_score: t.mobility_score,
            mobility_drivers: [],
        }));
}

/** Fusionne IPI + 9-Box + Mobility en structure `DashboardAnalyst` pour l’UI existante. */
export function buildDashboardAnalystView(
    ipi: ManagerAnalystIpiResponse | null,
    nineBox: ManagerAnalystNineBoxResponse | null,
    mobility: ManagerAnalystMobilityResponse | null,
): DashboardAnalyst | undefined {
    if (!ipi && !nineBox && !mobility) return undefined;

    const ipi_top_performers: DashboardAnalystIpiTopPerformer[] = (ipi?.top_5 ?? []).map((row) => ({
        talent_name: row.talent_name,
        ipi_score: row.ipi_score,
        band: row.band ?? row.ipi_band,
    }));

    const nineBoxDist = nineBox?.grid?.distribution ?? {};
    const stars = num(nineBoxDist.stars ?? nineBoxDist.star ?? nineBoxDist.high_performer);
    const under = num(nineBoxDist.underperformers ?? nineBoxDist.underperformer);

    const at_risk_talents = mobility ? mobilityTalentsToWatch(mobility.talents) : [];

    return {
        stats: {
            team_size: ipi?.total_talents ?? nineBox?.total_talents ?? mobility?.total_talents,
            ipi_avg: ipi?.avg_ipi,
            stable_count: mobility ? (mobility.distribution.anchored ?? 0) : undefined,
            at_risk_count: ipi?.distribution.at_risk ?? at_risk_talents.length,
            stars_count: stars,
            critical_box_count: under,
        },
        ipi_top_performers,
        at_risk_talents,
        nine_box_distribution: mapNineBoxDistributionForUi(nineBoxDist),
        nine_box_matrix: nineBox?.grid
            ? { boxes: nineBox.grid.boxes, talents: nineBox.grid.talents }
            : undefined,
    };
}
