import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AlertItem } from "@/types/api.types";
import { cx } from "@/utils/cx";

export type RiskMatrixProps = {
    alerts: AlertItem[];
    loading?: boolean;
    onAlertClick?: (alert: AlertItem) => void;
};

type SeverityLevel = "critical" | "high" | "medium" | "low";

function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

function normalizeSeverity(alert: AlertItem): SeverityLevel {
    const v = String(alert.severity ?? "")
        .trim()
        .toLowerCase();
    if (v === "critical") return "critical";
    if (v === "high") return "high";
    if (v === "medium") return "medium";
    return "low";
}

function severityWeight(level: SeverityLevel): number {
    if (level === "critical") return 1;
    if (level === "high") return 0.78;
    if (level === "medium") return 0.52;
    return 0.28;
}

/** Abscisse : ancienneté de l’alerte (jours) ou proxy via `risk_score`. */
function alertDelayDays(alert: AlertItem): number {
    const detected = alert.detected_at;
    if (detected) {
        const t = Date.parse(String(detected));
        if (!Number.isNaN(t)) {
            return clamp(Math.floor((Date.now() - t) / 86_400_000), 0, 60);
        }
    }
    const score = alert.risk_score;
    if (score != null && Number.isFinite(Number(score))) {
        return clamp(Number(score) * 3, 0, 30);
    }
    return 0;
}

function severityDotClass(level: SeverityLevel): string {
    if (level === "critical") return "bg-red-600 border-red-300 dark:bg-red-500";
    if (level === "high") return "bg-orange-500 border-orange-300 dark:bg-orange-400";
    if (level === "medium") return "bg-amber-500 border-amber-300 dark:bg-amber-400";
    return "bg-emerald-500 border-emerald-300 dark:bg-emerald-400";
}

type PlottedAlert = {
    alert: AlertItem;
    leftPct: number;
    topPct: number;
    title: string;
    severity: SeverityLevel;
};

const MAX_DELAY_DAYS = 30;

function buildPoints(alerts: AlertItem[], tm: (key: string, opts?: Record<string, string | number>) => string): PlottedAlert[] {
    const open = alerts.filter((a) => {
        const status = String(a.status ?? "open")
            .trim()
            .toLowerCase();
        return status !== "resolved" && status !== "closed" && status !== "dismissed";
    });
    const source = open.length > 0 ? open : alerts;
    const buckets = new Map<string, number>();

    return source.map((alert) => {
        const sev = normalizeSeverity(alert);
        const delay = alertDelayDays(alert);
        const dx = clamp(delay / MAX_DELAY_DAYS, 0, 1);
        const dy = severityWeight(sev);
        const bucketKey = `${Math.round(dx * 10)}-${Math.round(dy * 10)}`;
        const stack = buckets.get(bucketKey) ?? 0;
        buckets.set(bucketKey, stack + 1);
        const jitter = stack * 4;
        const leftPct = clamp(dx * 100 + (stack % 2 === 0 ? jitter : -jitter), 6, 94);
        const topPct = clamp((1 - dy) * 100 + (stack % 2 === 0 ? -jitter : jitter), 6, 94);
        const title =
            String(alert.title ?? alert.message ?? alert.category ?? alert.risk_type ?? alert.id).trim() ||
            tm("matrixDotTitle", { days: delay, count: 1 });
        return { alert, leftPct, topPct, title, severity: sev };
    });
}

export function RiskMatrix({ alerts, loading = false, onAlertClick }: RiskMatrixProps) {
    const { t } = useTranslation("common");
    const tm = (key: string, opts?: Record<string, string | number>) => {
        const k = `managerWorkspace.missionControl.${key}`;
        return String(opts ? t(k, opts as never) : t(k));
    };

    const counts = useMemo(() => {
        const c = { critical: 0, high: 0, medium: 0, low: 0 };
        for (const a of alerts) {
            const sev = normalizeSeverity(a);
            c[sev]++;
        }
        return c;
    }, [alerts]);

    const points = useMemo(() => buildPoints(alerts, tm), [alerts, t]);

    return (
        <section className="rounded-xl border border-secondary bg-primary p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-tertiary">{tm("matrixTitle")}</h4>
            <p className="mb-2 text-[10px] text-fg-tertiary">{tm("matrixHint")}</p>
            <MatrixPlot loading={loading} plotted={points} counts={counts} tm={tm} onAlertClick={onAlertClick} />
        </section>
    );
}

function MatrixPlot({
    loading,
    plotted,
    counts,
    tm,
    onAlertClick,
}: {
    loading: boolean;
    plotted: PlottedAlert[];
    counts: Record<SeverityLevel, number>;
    tm: (key: string, opts?: Record<string, string | number>) => string;
    onAlertClick?: (alert: AlertItem) => void;
}) {
    return (
        <>
            <MotionlessMatrixPlotContainer>
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 text-[9px] text-fg-tertiary/80">
                    <span className="p-1">{tm("matrixLowSlow")}</span>
                    <span className="p-1 text-right">{tm("matrixHighSlow")}</span>
                    <span className="p-1 self-end">{tm("matrixLowFast")}</span>
                    <span className="p-1 self-end text-right">{tm("matrixHighFast")}</span>
                </div>

                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center" aria-busy="true">
                        <div className="size-6 animate-pulse rounded-full bg-secondary_subtle" aria-hidden />
                    </div>
                ) : null}

                {!loading && plotted.length === 0 ? (
                    <p className="absolute inset-0 flex items-center justify-center px-2 text-center text-[10px] text-fg-tertiary">
                        {tm("matrixNoAlerts")}
                    </p>
                ) : null}

                {!loading
                    ? plotted.map(({ alert, leftPct, topPct, title, severity }) => (
                          <button
                              key={alert.id}
                              type="button"
                              className={cx(
                                  "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary shadow-md transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid",
                                  severityDotClass(severity),
                                  onAlertClick ? "cursor-pointer" : "cursor-default",
                              )}
                              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                              title={title}
                              aria-label={title}
                              onClick={() => onAlertClick?.(alert)}
                          />
                      ))
                    : null}
            </MotionlessMatrixPlotContainer>

            {!loading ? <SeverityCounts counts={counts} /> : null}
        </>
    );
}

function MotionlessMatrixPlotContainer({ children }: { children: ReactNode }) {
    return (
        <div className="relative aspect-square w-full max-w-[200px] rounded-lg border border-dashed border-secondary bg-gradient-to-br from-emerald-500/5 via-amber-500/10 to-red-500/15">
            {children}
        </div>
    );
}

function SeverityCounts({ counts }: { counts: Record<SeverityLevel, number> }) {
    return (
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] tabular-nums text-fg-tertiary">
            <span>
                <span className="font-semibold text-red-600 dark:text-red-400">C</span> {counts.critical}
            </span>
            <span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">H</span> {counts.high}
            </span>
            <span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">M</span> {counts.medium}
            </span>
            <span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">L</span> {counts.low}
            </span>
        </div>
    );
}
