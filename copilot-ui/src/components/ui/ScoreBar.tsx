import { cx } from "@/utils/cx";

type ScoreBarProps = {
    /** Score sur 10 (ou null) */
    score: number | null | undefined;
    width?: number;
    className?: string;
    showValue?: boolean;
};

function scoreTone(score: number): "critical" | "warn" | "ok" {
    if (score < 6) return "critical";
    if (score <= 8) return "warn";
    return "ok";
}

const TONE_VAR: Record<"critical" | "warn" | "ok", string> = {
    critical: "var(--critical)",
    warn: "var(--warn)",
    ok: "var(--ok)",
};

/** Barre horizontale 40px + valeur mono — seuils rouge &lt;6, ambre 6–8, émeraude &gt;8. */
export function ScoreBar({ score, width = 40, className, showValue = true }: ScoreBarProps) {
    if (score == null || !Number.isFinite(score)) {
        return <span className={cx("font-ops-data text-[12px] text-[color:var(--text-muted)]", className)}>—</span>;
    }

    const clamped = Math.min(10, Math.max(0, score));
    const pct = (clamped / 10) * 100;
    const tone = scoreTone(clamped);

    return (
        <span className={cx("inline-flex items-center gap-1.5", className)}>
            <span
                className="relative inline-block h-[4px] overflow-hidden rounded-sm bg-[color:var(--surface-2)]"
                style={{ width }}
                aria-hidden
            >
                <span
                    className="absolute inset-y-0 left-0 rounded-sm"
                    style={{ width: `${pct}%`, background: TONE_VAR[tone] }}
                />
            </span>
            {showValue ? (
                <span className="font-ops-data text-[12px] tabular-nums" style={{ color: TONE_VAR[tone] }}>
                    {clamped.toFixed(1)}
                </span>
            ) : null}
        </span>
    );
}

type ConfidenceSegmentProps = {
    /** 0–1 ou 0–100 */
    confidence: number;
    className?: string;
    /** Teinte agent via CSS var, défaut accent */
    colorVar?: string;
};

/** Segment confiance 2px + extrémité lumineuse + % mono. */
export function ConfidenceSegment({
    confidence,
    className,
    colorVar = "var(--agent-strategist)",
}: ConfidenceSegmentProps) {
    const raw = Number.isFinite(confidence) ? confidence : 0;
    const pct = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
    const clamped = Math.min(100, Math.max(0, pct));

    return (
        <div className={cx("flex items-center gap-2", className)}>
            <div className="relative h-[2px] flex-1 overflow-visible rounded-full bg-[color:var(--surface-2)]">
                <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                        width: `${clamped}%`,
                        background: colorVar,
                        boxShadow: `0 0 6px ${colorVar}`,
                    }}
                />
                <span
                    className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full"
                    style={{
                        left: `calc(${clamped}% - 3px)`,
                        background: colorVar,
                        boxShadow: `0 0 8px ${colorVar}`,
                    }}
                    aria-hidden
                />
            </div>
            <span className="font-ops-data shrink-0 text-[11px] tabular-nums text-[color:var(--text-muted)]">
                {clamped}%
            </span>
        </div>
    );
}

type HealthDotProps = {
    score: number | null | undefined;
    className?: string;
};

export function HealthDot({ score, className }: HealthDotProps) {
    if (score == null || !Number.isFinite(score)) {
        return (
            <span className={cx("inline-flex items-center gap-1 text-[11px] text-[color:var(--text-muted)]", className)}>
                <span className="size-1.5 rounded-full bg-[color:var(--text-muted)]" aria-hidden />—
            </span>
        );
    }
    const tone = scoreTone(score);
    return (
        <span className={cx("inline-flex items-center gap-1 font-ops-data text-[11px] tabular-nums", className)}>
            <span className="size-1.5 shrink-0 rounded-full" style={{ background: TONE_VAR[tone] }} aria-hidden />
            <span style={{ color: TONE_VAR[tone] }}>{score.toFixed(1)}</span>
        </span>
    );
}
