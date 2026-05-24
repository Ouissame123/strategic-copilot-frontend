/**
 * Primitives UI partagées — Dashboard RH (présentation uniquement).
 */
import type { ReactNode } from "react";
import type { RhAnalyticsAlertLevel, RhAnalyticsKpis } from "@/types/rh-dashboard.types";
import {
    RH_CARD,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TEXT_SECONDARY,
    WS_MUTED_SURFACE,
    WS_TEXT_FAINT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export const RH_DASH_SECTION =
    "overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/90 dark:bg-slate-900";

export const SEV_META: Record<
    RhAnalyticsAlertLevel | "info",
    { dot: string; text: string; bg: string; border: string }
> = {
    critical: {
        dot: "bg-rose-500",
        text: "text-rose-700 dark:text-rose-300",
        bg: "bg-rose-50/80 dark:bg-rose-950/30",
        border: "border-rose-200/80 dark:border-rose-900/50",
    },
    high: {
        dot: "bg-orange-500",
        text: "text-orange-700 dark:text-orange-300",
        bg: "bg-orange-50/80 dark:bg-orange-950/30",
        border: "border-orange-200/80 dark:border-orange-900/50",
    },
    medium: {
        dot: "bg-amber-500",
        text: "text-amber-700 dark:text-amber-300",
        bg: "bg-amber-50/80 dark:bg-amber-950/30",
        border: "border-amber-200/80 dark:border-amber-900/50",
    },
    low: {
        dot: "bg-slate-400",
        text: RH_TEXT_SECONDARY,
        bg: WS_MUTED_SURFACE,
        border: "border-slate-200 dark:border-slate-700",
    },
    info: {
        dot: "bg-sky-500",
        text: "text-sky-700 dark:text-sky-300",
        bg: "bg-sky-50/80 dark:bg-sky-950/30",
        border: "border-sky-200/80 dark:border-sky-900/50",
    },
};

export function scoreColor(s: number): string {
    if (s >= 80) return "#10b981";
    if (s >= 60) return "#f59e0b";
    if (s >= 40) return "#f97316";
    return "#ef4444";
}

export function levelStars(n: number): string {
    const full = Math.round(Math.max(0, Math.min(5, n)));
    return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
}

export function DashboardSection({
    eyebrow,
    title,
    description,
    action,
    children,
    className,
    variant = "default",
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    variant?: "default" | "ai";
}) {
    return (
        <section
            className={cx(
                RH_DASH_SECTION,
                variant === "ai" &&
                    "border-violet-200/70 bg-gradient-to-br from-white via-white to-violet-50/30 dark:border-violet-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/15",
                className,
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="min-w-0">
                    {eyebrow ? (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                            {eyebrow}
                        </p>
                    ) : null}
                    <h2 className={cx("text-sm font-semibold tracking-tight", RH_TEXT_PRIMARY)}>{title}</h2>
                    {description ? <p className={cx("mt-0.5 text-xs leading-snug", RH_TEXT_MUTED)}>{description}</p> : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

export function CompactKpi({
    icon,
    label,
    value,
    hint,
    tone = "neutral",
}: {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    hint?: string;
    tone?: "neutral" | "violet" | "amber" | "emerald" | "rose" | "sky";
}) {
    const toneCls = {
        neutral: "from-slate-50/80 to-white dark:from-slate-800/50 dark:to-slate-900",
        violet: "from-violet-50/90 to-white dark:from-violet-950/25 dark:to-slate-900",
        amber: "from-amber-50/90 to-white dark:from-amber-950/20 dark:to-slate-900",
        emerald: "from-emerald-50/90 to-white dark:from-emerald-950/20 dark:to-slate-900",
        rose: "from-rose-50/90 to-white dark:from-rose-950/20 dark:to-slate-900",
        sky: "from-sky-50/90 to-white dark:from-sky-950/20 dark:to-slate-900",
    }[tone];

    const iconCls = {
        neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
        amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
        sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    }[tone];

    return (
        <div
            className={cx(
                "flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-gradient-to-br p-3 dark:border-slate-700/80",
                toneCls,
            )}
        >
            <div className={cx("flex size-9 shrink-0 items-center justify-center rounded-lg", iconCls)}>{icon}</div>
            <div className="min-w-0 flex-1">
                <div className={cx("text-lg font-bold tabular-nums leading-none tracking-tight", RH_TEXT_PRIMARY)}>{value}</div>
                <div className={cx("mt-0.5 text-[11px] font-medium", RH_TEXT_MUTED)}>{label}</div>
                {hint ? <div className={cx("mt-0.5 text-[10px] leading-tight", WS_TEXT_FAINT)}>{hint}</div> : null}
            </div>
        </div>
    );
}

export function MiniScoreRing({ score, size = 56 }: { score: number; size?: number }) {
    const r = (size - 8) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, score)) / 100;
    const color = scoreColor(score);
    const cx0 = size / 2;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90" aria-hidden>
                <circle
                    cx={cx0}
                    cy={cx0}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={5}
                    className="text-slate-200 dark:text-slate-700"
                />
                <circle
                    cx={cx0}
                    cy={cx0}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={5}
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - pct)}
                    strokeLinecap="round"
                />
            </svg>
            <span
                className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums"
                style={{ color }}
            >
                {Math.round(score)}
            </span>
        </div>
    );
}

export function LoadBar({ data }: { data: RhAnalyticsKpis["load"] }) {
    const segs = [
        { k: "unassigned", v: data.unassigned, c: "bg-slate-300 dark:bg-slate-600", l: "Sans mission" },
        { k: "light_load", v: data.light_load, c: "bg-emerald-400", l: "Charge légère" },
        { k: "heavy_load", v: data.heavy_load, c: "bg-amber-400", l: "Charge forte" },
        { k: "overloaded", v: data.overloaded, c: "bg-rose-500", l: "Surchargés" },
    ];
    const total = segs.reduce((s, x) => s + x.v, 0) || 1;
    return (
        <div>
            <div className={cx("flex h-2.5 overflow-hidden rounded-full", WS_MUTED_SURFACE)}>
                {segs.map(
                    (s) =>
                        s.v > 0 && (
                            <div
                                key={s.k}
                                className={s.c}
                                style={{ width: `${(s.v / total) * 100}%` }}
                                title={`${s.l}: ${s.v}`}
                            />
                        ),
                )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {segs.map((s) => (
                    <div key={s.k} className={cx("flex items-center gap-1 text-[10px]", RH_TEXT_MUTED)}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.c}`} />
                        {s.l} <b className={RH_TEXT_SECONDARY}>{s.v}</b>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function MiniDist({ title, data, hint }: { title: string; data: Record<string, number>; hint?: string }) {
    const entries = Object.entries(data || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
    const max = Math.max(1, ...entries.map((e) => e[1]));
    if (!entries.length) {
        return (
            <div>
                <p className={cx("mb-1 text-[11px] font-semibold", RH_TEXT_SECONDARY)}>{title}</p>
                <p className={cx("text-[11px]", WS_TEXT_FAINT)}>Aucune donnée</p>
                {hint ? <p className={cx("mt-1 text-[10px] leading-snug", WS_TEXT_FAINT)}>{hint}</p> : null}
            </div>
        );
    }
    return (
        <div>
            {title ? <p className={cx("mb-2 text-[11px] font-semibold", RH_TEXT_SECONDARY)}>{title}</p> : null}
            <div className="space-y-1.5">
                {entries.map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                        <span className={cx("w-20 truncate text-[10px]", RH_TEXT_MUTED)} title={k}>
                            {k}
                        </span>
                        <div className={cx("h-1.5 flex-1 overflow-hidden rounded-full", WS_MUTED_SURFACE)}>
                            <div
                                className="h-full rounded-full bg-violet-400/80 dark:bg-violet-500/70"
                                style={{ width: `${(v / max) * 100}%` }}
                            />
                        </div>
                        <span className={cx("w-5 text-right text-[10px] tabular-nums", RH_TEXT_MUTED)}>{v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TalentMicroList({
    title,
    items,
    valueKey,
    valueClassName,
}: {
    title: string;
    items: { name: string; load_pct?: number; available_pct?: number }[];
    valueKey: "load_pct" | "available_pct";
    valueClassName: string;
}) {
    return (
        <div>
            {title ? <p className={cx("mb-2 text-[11px] font-semibold", RH_TEXT_SECONDARY)}>{title}</p> : null}
            <div className="space-y-1">
                {items.length === 0 ? (
                    <p className={cx("text-[11px]", WS_TEXT_FAINT)}>—</p>
                ) : (
                    items.slice(0, 5).map((t, i) => (
                        <div key={`${t.name}-${i}`} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className={cx("min-w-0 truncate", RH_TEXT_SECONDARY)}>{t.name}</span>
                            <span className={cx("shrink-0 font-semibold tabular-nums", valueClassName)}>
                                {t[valueKey] ?? "—"}%
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
