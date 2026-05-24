/** Séries sparkline 7 jours + delta semaine (J-7). */

export type KpiSemanticTone = "health" | "info" | "warning" | "danger" | "brand";

export function normalizeSparklineToSevenPoints(raw: number[] | undefined, currentValue: number): number[] {
    const filtered = (raw ?? []).filter((n) => typeof n === "number" && Number.isFinite(n));
    const current = Number.isFinite(currentValue) ? currentValue : 0;

    if (filtered.length >= 7) {
        const slice = filtered.slice(-7);
        slice[6] = current;
        return slice;
    }

    if (filtered.length >= 2) {
        const first = filtered[0];
        const out: number[] = [];
        for (let i = 0; i < 7; i++) {
            const t = i / 6;
            out.push(first + (current - first) * t);
        }
        return out.map((n) => Math.round(n * 10) / 10);
    }

    const drift = Math.max(1, Math.abs(current) * 0.12);
    const start = current - drift;
    const out: number[] = [];
    for (let i = 0; i < 7; i++) {
        out.push(start + ((current - start) * i) / 6);
    }
    return out.map((n) => Math.round(n * 10) / 10);
}

/** Delta = valeur actuelle − valeur il y a 7 jours (premier point de la série). */
export function weekOverWeekDelta(series: number[]): number {
    if (series.length < 2) return 0;
    const first = series[0];
    const last = series[series.length - 1];
    return Math.round((last - first) * 10) / 10;
}

export function deltaToneClass(delta: number, positiveGood: boolean): string {
    if (delta === 0) return "text-slate-500 dark:text-slate-400";
    const improved = positiveGood ? delta > 0 : delta < 0;
    return improved ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
}

export function sparklineStrokeClass(tone: KpiSemanticTone): string {
    switch (tone) {
        case "danger":
            return "text-red-500 dark:text-red-400";
        case "warning":
            return "text-amber-500 dark:text-amber-400";
        case "info":
            return "text-blue-500 dark:text-blue-400";
        case "brand":
            return "text-indigo-500 dark:text-indigo-400";
        case "health":
            return "text-emerald-500 dark:text-emerald-400";
        default:
            return "text-slate-500 dark:text-slate-400";
    }
}

export function kpiValueToneClass(tone: KpiSemanticTone, value?: number): string {
    if (tone === "health" && value != null && Number.isFinite(value)) {
        if (value >= 7.5) return "text-emerald-600 dark:text-emerald-400";
        if (value >= 4) return "text-amber-600 dark:text-amber-400";
        return "text-rose-600 dark:text-rose-400";
    }
    switch (tone) {
        case "danger":
            return "text-red-600 dark:text-red-400";
        case "warning":
            return "text-amber-600 dark:text-amber-400";
        case "info":
            return "text-blue-600 dark:text-blue-400";
        case "brand":
            return "text-indigo-600 dark:text-indigo-400";
        default:
            return "text-slate-900 dark:text-slate-50";
    }
}

export function kpiCardBorderHoverClass(tone: KpiSemanticTone): string {
    switch (tone) {
        case "danger":
            return "hover:border-red-400/60 dark:hover:border-red-500/50";
        case "warning":
            return "hover:border-amber-400/60 dark:hover:border-amber-500/50";
        case "info":
            return "hover:border-blue-400/60 dark:hover:border-blue-500/50";
        case "health":
            return "hover:border-emerald-400/60 dark:hover:border-emerald-500/50";
        case "brand":
            return "hover:border-indigo-400/60 dark:hover:border-indigo-500/50";
        default:
            return "hover:border-slate-300 dark:hover:border-slate-600";
    }
}

export function healthGaugeStrokeColor(score: number): string {
    if (score >= 7.5) return "#10b981";
    if (score >= 4) return "#f59e0b";
    return "#f43f5e";
}
