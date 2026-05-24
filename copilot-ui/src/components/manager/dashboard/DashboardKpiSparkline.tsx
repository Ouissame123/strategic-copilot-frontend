type DashboardKpiSparklineProps = {
    points: number[];
    className?: string;
};

const W = 60;
const H = 16;

/** Sparkline SVG native 60×16 — 7 points max. */
export function DashboardKpiSparkline({ points, className }: DashboardKpiSparklineProps) {
    const safe = points.filter((p) => Number.isFinite(p));
    if (safe.length < 2) {
        return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden />;
    }

    const series = safe.length > 7 ? safe.slice(-7) : safe;
    const max = Math.max(...series);
    const min = Math.min(...series);
    const range = max - min || 1;
    const step = W / (series.length - 1);
    const padY = 2;

    const d = series
        .map((p, i) => {
            const x = i * step;
            const y = H - padY - ((p - min) / range) * (H - padY * 2);
            return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ");

    return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden>
            <path d={d} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
