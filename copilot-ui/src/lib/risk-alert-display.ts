/** Longueur max du message affiché comme titre (au-delà : titre = type / sévérité). */
export const ALERT_TITLE_MAX_LEN = 100;

export type AlertTextLike = {
    description?: string;
    rationale?: string;
    reason?: string;
    message?: string;
    title?: string;
    riskType?: string;
    category?: string;
    severity?: string;
};

function trimText(value: string | undefined): string | undefined {
    const s = (value ?? "").trim();
    return s || undefined;
}

export function readOptionalAlertText(raw: Record<string, unknown>): {
    description?: string;
    rationale?: string;
    reason?: string;
} {
    return {
        description: trimText(typeof raw.description === "string" ? raw.description : undefined),
        rationale: trimText(typeof raw.rationale === "string" ? raw.rationale : undefined),
        reason: trimText(typeof raw.reason === "string" ? raw.reason : undefined),
    };
}

export function getAlertDescription(alert: AlertTextLike): string {
    const dedicated =
        trimText(alert.description) || trimText(alert.rationale) || trimText(alert.reason);
    if (dedicated) return dedicated;

    const msg = trimText(alert.message);
    const title = trimText(alert.title);
    const useMsgAsTitle = Boolean(msg && msg !== "—" && msg.length <= ALERT_TITLE_MAX_LEN);

    if (msg && msg !== "—" && !useMsgAsTitle) return msg;
    if (title && title !== msg) return title;

    return "Aucun détail disponible";
}

export function getAlertTitle(alert: AlertTextLike): string {
    const msg = trimText(alert.message);
    const riskType = trimText(alert.riskType) || trimText(alert.category);

    if (msg && msg !== "—") {
        if (msg.length <= ALERT_TITLE_MAX_LEN) return msg;
        return riskType || trimText(alert.severity) || "Alerte prioritaire";
    }

    return riskType || "Alerte prioritaire";
}

export type ImpactLevel = "high" | "medium" | "low";
export type UrgencyLevel = "urgent" | "today" | "watch";

/** Champs utilisés pour la matrice impact × urgence (heatmap). */
export type HeatmapAlertLike = {
    severity?: string;
    risk_score?: number;
    riskScore?: number;
    priority_order?: number;
    priorityOrder?: number;
    detected_at?: string;
    created_at?: string;
    detectedAt?: string;
    age_hours?: number;
    ageHours?: number;
};

export type HeatmapBucketsNested<T> = Record<UrgencyLevel, Record<ImpactLevel, T[]>>;

export const HEATMAP_URGENCY_ROWS: UrgencyLevel[] = ["watch", "today", "urgent"];
export const HEATMAP_IMPACT_COLS: ImpactLevel[] = ["low", "medium", "high"];

const URGENCY_ROW_INDEX: Record<UrgencyLevel, number> = { watch: 0, today: 1, urgent: 2 };
const IMPACT_COL_INDEX: Record<ImpactLevel, number> = { low: 0, medium: 1, high: 2 };

function readRiskScore(alert: HeatmapAlertLike): number {
    const raw = alert.riskScore ?? alert.risk_score;
    const score = Number(raw);
    if (!Number.isFinite(score)) return Number.NaN;
    if (score > 0 && score <= 1) return score * 10;
    return score;
}

function readPriorityOrderRaw(alert: HeatmapAlertLike): number | string | undefined {
    return alert.priorityOrder ?? alert.priority_order;
}

function readAgeHours(alert: HeatmapAlertLike): number | null {
    const raw = alert.ageHours ?? alert.age_hours;
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    return Math.max(0, raw);
}

function readDetectedAtMs(alert: HeatmapAlertLike): number | null {
    const raw = alert.detectedAt ?? alert.detected_at ?? alert.created_at;
    if (!raw) return null;
    const ms = new Date(raw).getTime();
    return Number.isNaN(ms) ? null : ms;
}

/** Impact : risk_score puis severity (jamais utilisé pour l’urgence). */
export function getImpactLevel(alert: HeatmapAlertLike): ImpactLevel {
    const score = readRiskScore(alert);

    if (Number.isFinite(score)) {
        if (score >= 8) return "high";
        if (score >= 5) return "medium";
        return "low";
    }

    const severity = String(alert.severity ?? "").toLowerCase();

    if (severity === "critical" || severity === "high") return "high";
    if (severity === "medium") return "medium";
    return "low";
}

/** Urgence : priority_order puis age_hours ou detected_at / created_at (jamais severity). */
export function getUrgencyLevel(alert: HeatmapAlertLike): UrgencyLevel {
    const rawPriority = readPriorityOrderRaw(alert);
    if (rawPriority !== undefined && rawPriority !== null && String(rawPriority).trim() !== "") {
        const priorityOrder = Number(rawPriority);
        if (Number.isFinite(priorityOrder) && priorityOrder <= 2) {
            return "urgent";
        }
    }

    let ageHours = readAgeHours(alert);
    if (ageHours == null) {
        const detectedAt = readDetectedAtMs(alert);
        if (detectedAt == null) return "watch";
        ageHours = (Date.now() - detectedAt) / (1000 * 60 * 60);
    }

    if (ageHours <= 24) return "urgent";
    if (ageHours <= 24 * 7) return "today";
    return "watch";
}

export function createEmptyHeatmapBuckets<T>(): HeatmapBucketsNested<T> {
    return {
        urgent: { high: [], medium: [], low: [] },
        today: { high: [], medium: [], low: [] },
        watch: { high: [], medium: [], low: [] },
    };
}

export function buildHeatmapNestedBuckets<T extends HeatmapAlertLike>(alerts: T[]): HeatmapBucketsNested<T> {
    const buckets = createEmptyHeatmapBuckets<T>();
    for (const alert of alerts) {
        const urgency = getUrgencyLevel(alert);
        const impact = getImpactLevel(alert);
        buckets[urgency][impact].push(alert);
    }
    return buckets;
}

export function heatmapBucketIndex(alert: HeatmapAlertLike): number {
    const urgency = getUrgencyLevel(alert);
    const impact = getImpactLevel(alert);
    return URGENCY_ROW_INDEX[urgency] * 3 + IMPACT_COL_INDEX[impact];
}

export function buildHeatmapFlatBuckets<T extends HeatmapAlertLike>(alerts: T[]): T[][] {
    const buckets: T[][] = Array.from({ length: 9 }, () => []);
    for (const alert of alerts) {
        buckets[heatmapBucketIndex(alert)].push(alert);
    }
    return buckets;
}

export function logHeatmapBucketDebug(
    alerts: Array<HeatmapAlertLike & { project_name?: string; projectName?: string }>,
): void {
    console.table(
        alerts.map((a) => ({
            project: a.projectName ?? a.project_name,
            severity: a.severity,
            risk_score: a.riskScore ?? a.risk_score,
            priority_order: a.priorityOrder ?? a.priority_order,
            detected_at: a.detectedAt ?? a.detected_at ?? a.created_at,
            age_hours: a.ageHours ?? a.age_hours,
            impact: getImpactLevel(a),
            urgency: getUrgencyLevel(a),
        })),
    );
}
