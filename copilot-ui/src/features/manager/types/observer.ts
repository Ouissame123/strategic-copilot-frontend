export type HealthTrend = "improving" | "degrading" | "stable" | "first_analysis";

export type ForecastDirection = "rising" | "falling" | "flat";

export interface ObserverTrends {
    health_trend?: HealthTrend | null;
    health_delta?: number | null;
    days_since_last_analysis?: number | null;
    previous_health_score?: number | null;
    previous_computed_at?: string | null;
    progress_delta?: number | null;
    capacity_delta?: number | null;
    skill_gap_delta?: number | null;
    delay_delta?: number | null;
}

export interface ObserverForecast {
    projected_health_30d?: number | null;
    direction?: ForecastDirection | null;
    confidence?: number | null;
    daily_change_rate?: number | null;
}
