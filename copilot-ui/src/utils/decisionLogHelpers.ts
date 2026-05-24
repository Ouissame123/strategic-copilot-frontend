import type { DecisionLogDecision, DecisionLogStatus } from "@/services/decisions.api";

export function decisionLogStatus(decision: { status?: DecisionLogStatus }): DecisionLogStatus {
    return decision.status ?? "open";
}

export function isDecisionVisibleInLog(decision: DecisionLogDecision): boolean {
    return decisionLogStatus(decision) !== "dismissed";
}

export type DateBucketKey = "today" | "yesterday" | "thisWeek" | "older";

export const DATE_BUCKET_ORDER: DateBucketKey[] = ["today", "yesterday", "thisWeek", "older"];

export const DATE_BUCKET_LABELS: Record<DateBucketKey, string> = {
    today: "Aujourd'hui",
    yesterday: "Hier",
    thisWeek: "Cette semaine",
    older: "Plus ancien",
};

export type DecisionKind = "continue" | "adjust" | "stop" | "other";

export function normalizeDecisionKind(raw: string): DecisionKind {
    const k = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (k === "continue") return "continue";
    if (k === "adjust") return "adjust";
    if (k === "stop") return "stop";
    return "other";
}

/** KPI confiance moyenne (0–100) depuis `avg_confidence_pct` ou `avg_confidence`. */
export function kpiAvgConfidencePercent(kpis: {
    avg_confidence_pct?: number | null;
    avg_confidence?: number | null;
}): number {
    const raw = kpis.avg_confidence_pct ?? kpis.avg_confidence;
    const n = Number(raw);
    if (raw == null || !Number.isFinite(n)) return 0;
    if (n > 0 && n <= 1) return Math.round(n * 100);
    return Math.round(n);
}

export function confidencePercent(c: number | null | undefined): number {
    const n = Number(c ?? 0);
    if (!Number.isFinite(n)) return 0;
    if (n > 0 && n <= 1) return Math.round(n * 100);
    return Math.round(n);
}

export function bucketByDate(decisions: DecisionLogDecision[]): Record<DateBucketKey, DecisionLogDecision[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    const weekday = startOfWeek.getDay();
    const mondayOffset = weekday === 0 ? 6 : weekday - 1;
    startOfWeek.setDate(startOfWeek.getDate() - mondayOffset);

    const buckets: Record<DateBucketKey, DecisionLogDecision[]> = {
        today: [],
        yesterday: [],
        thisWeek: [],
        older: [],
    };

    for (const d of decisions) {
        const t = new Date(d.created_at).getTime();
        if (Number.isNaN(t)) {
            buckets.older.push(d);
            continue;
        }
        const date = new Date(t);
        if (date >= startOfToday) buckets.today.push(d);
        else if (date >= startOfYesterday) buckets.yesterday.push(d);
        else if (date >= startOfWeek) buckets.thisWeek.push(d);
        else buckets.older.push(d);
    }

    return buckets;
}

export function computeSparkline(decisions: DecisionLogDecision[], days = 14): number[] {
    const dayMs = 86_400_000;
    const now = Date.now();
    const counts = Array.from({ length: days }, () => 0);

    for (const d of decisions) {
        const t = new Date(d.created_at).getTime();
        if (Number.isNaN(t)) continue;
        const ageDays = Math.floor((now - t) / dayMs);
        if (ageDays < 0 || ageDays >= days) continue;
        const idx = days - 1 - ageDays;
        counts[idx] += 1;
    }

    return counts;
}

export function computeWatchCount(decisions: DecisionLogDecision[]): number {
    return decisions.filter((d) => {
        const score = Number(d.score ?? 0);
        const conf = confidencePercent(d.confidence);
        return (Number.isFinite(score) && score < 5) || conf < 50;
    }).length;
}

export function computePrevWeekDelta(
    decisions: DecisionLogDecision[],
    key: "confidence" | "score" = "confidence",
): number | null {
    const now = Date.now();
    const week = 7 * 86_400_000;

    const recent = decisions.filter((d) => {
        const t = new Date(d.created_at).getTime();
        return Number.isFinite(t) && t >= now - week;
    });
    const previous = decisions.filter((d) => {
        const t = new Date(d.created_at).getTime();
        return Number.isFinite(t) && t >= now - 2 * week && t < now - week;
    });

    const average = (rows: DecisionLogDecision[]) => {
        if (!rows.length) return null;
        const sum = rows.reduce(
            (acc, d) => acc + (key === "confidence" ? confidencePercent(d.confidence) : Number(d.score ?? 0)),
            0,
        );
        return sum / rows.length;
    };

    const current = average(recent);
    const prior = average(previous);
    if (current == null || prior == null) return null;
    return Math.round((current - prior) * 10) / 10;
}

function escapeCsvCell(value: string): string {
    const v = String(value).replace(/"/g, '""');
    if (/[",\n\r]/.test(v)) return `"${v}"`;
    return v;
}

export function exportToCsv(decisions: DecisionLogDecision[], filename: string): void {
    const header = [
        "decision_id",
        "decision",
        "project_id",
        "project_name",
        "score",
        "confidence",
        "reason_code",
        "scope",
        "created_at",
        "synthesis",
    ];
    const lines = [header.map(escapeCsvCell).join(",")];

    for (const d of decisions) {
        lines.push(
            [
                d.decision_id,
                d.decision,
                d.project_id,
                d.project_name,
                String(d.score ?? ""),
                String(confidencePercent(d.confidence)),
                d.reason_code ?? "",
                d.scope ?? "",
                d.created_at,
                (d.synthesis ?? "").replace(/\s+/g, " ").trim(),
            ]
                .map(escapeCsvCell)
                .join(","),
        );
    }

    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function lowestScoreDecision(decisions: DecisionLogDecision[]): DecisionLogDecision | null {
    const eligible = decisions.filter((d) => decisionLogStatus(d) === "open");
    if (!eligible.length) return null;
    return [...eligible].sort((a, b) => Number(a.score ?? 0) - Number(b.score ?? 0))[0] ?? null;
}

export function timeAgo(iso: string): string {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "—";
    const m = Math.floor((Date.now() - t) / 60_000);
    if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    return `il y a ${d} j`;
}

export function watchBorderClass(score: number): string {
    if (score < 4) return "border-l-red-500";
    if (score < 7) return "border-l-amber-500";
    return "border-l-slate-400";
}
