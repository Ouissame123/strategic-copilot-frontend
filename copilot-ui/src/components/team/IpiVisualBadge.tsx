export function IpiVisualBadge({ score }: { score: number | null | undefined }) {
    if (score == null || !Number.isFinite(score)) {
        return <span className="text-sm text-slate-400">—</span>;
    }

    const filled = Math.max(0, Math.min(10, Math.round(score)));
    const color =
        score >= 7
            ? "text-emerald-600 dark:text-emerald-400"
            : score >= 4
              ? "text-amber-600 dark:text-amber-400"
              : "text-rose-600 dark:text-rose-400";
    const band = score >= 7 ? "Top" : score >= 4 ? "OK" : "Risque";

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold dark:border-slate-600 dark:bg-slate-800/60 ${color}`}
            title="Indice Performance Individuelle (1–10)"
        >
            <span className="tabular-nums">{score.toFixed(1)}</span>
            <svg viewBox="0 0 40 8" className="h-2 w-10" aria-hidden>
                {Array.from({ length: 10 }, (_, i) => (
                    <circle key={i} cx={2 + i * 4} cy={4} r={1.5} fill={i < filled ? "currentColor" : "#cbd5e1"} />
                ))}
            </svg>
            <span className="text-[10px] uppercase opacity-80">{band}</span>
        </span>
    );
}
