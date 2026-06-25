import type { ObserverForecast, ObserverTrends } from "@/features/manager/types/observer";

function pickOptionalString(value: unknown): string | null {
    if (value == null) return null;
    const s = String(value).trim();
    return s || null;
}

function pickOptionalNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

export function normalizeObserverTrends(raw: unknown): ObserverTrends | null {
    if (raw == null) return null;
    if (typeof raw !== "object" || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    return {
        health_trend: pickOptionalString(r.health_trend) as ObserverTrends["health_trend"],
        health_delta: pickOptionalNumber(r.health_delta),
        days_since_last_analysis: pickOptionalNumber(r.days_since_last_analysis),
        previous_health_score: pickOptionalNumber(r.previous_health_score),
        previous_computed_at: pickOptionalString(r.previous_computed_at),
        progress_delta: pickOptionalNumber(r.progress_delta),
        capacity_delta: pickOptionalNumber(r.capacity_delta),
        skill_gap_delta: pickOptionalNumber(r.skill_gap_delta),
        delay_delta: pickOptionalNumber(r.delay_delta),
    };
}

export function normalizeObserverForecast(raw: unknown): ObserverForecast | null {
    if (raw == null) return null;
    if (typeof raw !== "object" || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    return {
        projected_health_30d: pickOptionalNumber(r.projected_health_30d),
        direction: pickOptionalString(r.direction) as ObserverForecast["direction"],
        confidence: pickOptionalNumber(r.confidence),
        daily_change_rate: pickOptionalNumber(r.daily_change_rate),
    };
}
