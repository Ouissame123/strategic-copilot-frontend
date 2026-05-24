import { TrendingUp } from "lucide-react";
import { MobilityDriverBadges, parseMobilityDrivers } from "@/components/talent/mobility-drivers";
import { TALENT_CARD } from "@/components/talent/talent-detail-shared";

export type AnalystNineBox = {
    performance_score: number;
    potential_score: number;
    box_label: string;
    rationale: string | null;
    computed_at: string;
};

export type AnalystIpi = {
    ipi_score: number;
    tech_score: number;
    exp_score: number;
    stability_score: number;
    band: string;
    computed_at: string;
};

export type AnalystMobility = {
    mobility_flag: string;
    mobility_score: number;
    drivers: Array<string | { key: string; value: string | number | boolean }> | null;
    computed_at: string;
    /** Nombre total de compétences du talent (≠ skill_category_count). */
    total_skills?: number | null;
};

type CardVariant = "drawer" | "page";

const shell = (variant: CardVariant) =>
    variant === "page"
        ? `${TALENT_CARD} p-6 min-h-[220px]`
        : "rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900";

const emptyShell = (variant: CardVariant) =>
    variant === "page"
        ? `flex ${TALENT_CARD} min-h-[220px] items-center justify-center p-6 text-center text-sm italic text-slate-500 dark:text-slate-400`
        : "flex min-h-[160px] items-center justify-center rounded-lg border border-slate-200 p-3 text-center text-xs italic text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400";

const svgClass = (variant: CardVariant) => (variant === "page" ? "h-auto min-h-[200px] w-full" : "h-auto w-full");

export function NineBoxCard({
    nineBox,
    talentName,
    variant = "drawer",
}: {
    nineBox?: AnalystNineBox | null;
    talentName: string;
    variant?: CardVariant;
}) {
    if (!nineBox) {
        return <div className={emptyShell(variant)}>Non évalué</div>;
    }

    const col = nineBox.performance_score >= 7 ? 2 : nineBox.performance_score >= 4 ? 1 : 0;
    const row = nineBox.potential_score >= 7 ? 0 : nineBox.potential_score >= 4 ? 1 : 2;
    const W = variant === "page" ? 280 : 200;
    const H = variant === "page" ? 220 : 160;
    const cellSize = variant === "page" ? 52 : 38;
    const gridStartX = variant === "page" ? 40 : 30;
    const gridStartY = variant === "page" ? 18 : 14;

    return (
        <div className={shell(variant)}>
            <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">9-Box</h4>
                <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                    {nineBox.box_label}
                </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className={svgClass(variant)} role="img" aria-label={`9-Box — ${talentName}`}>
                <text x="8" y="24" fontSize="9" fill="#64748b" transform={`rotate(-90, 8, ${H / 2})`}>
                    Potentiel
                </text>
                {[0, 1, 2].map((r) =>
                    [0, 1, 2].map((c) => {
                        const x = gridStartX + c * cellSize;
                        const y = gridStartY + r * cellSize;
                        const isTarget = c === col && r === row;
                        const fill = isTarget ? "#7c3aed" : r === 0 && c === 2 ? "#dcfce7" : r === 2 && c === 0 ? "#fee2e2" : "#f8fafc";
                        return (
                            <g key={`${r}-${c}`}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={cellSize - 2}
                                    height={cellSize - 2}
                                    fill={fill}
                                    stroke={isTarget ? "#5b21b6" : "#cbd5e1"}
                                    strokeWidth={isTarget ? 2 : 1}
                                    rx="4"
                                />
                                {isTarget ? (
                                    <text
                                        x={x + (cellSize - 2) / 2}
                                        y={y + (cellSize - 2) / 2 + 5}
                                        textAnchor="middle"
                                        fontSize="16"
                                        fontWeight="700"
                                        fill="white"
                                    >
                                        ★
                                    </text>
                                ) : null}
                            </g>
                        );
                    }),
                )}
                <text x={gridStartX + (cellSize * 3) / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="#64748b">
                    Performance →
                </text>
            </svg>
            <div className="mt-2 flex justify-between text-xs tabular-nums text-slate-600 dark:text-slate-400">
                <span>
                    Perf : <b>{nineBox.performance_score.toFixed(1)}</b>/10
                </span>
                <span>
                    Pot : <b>{nineBox.potential_score.toFixed(1)}</b>/10
                </span>
            </div>
        </div>
    );
}

export function IpiRadarCard({ ipi, variant = "drawer" }: { ipi?: AnalystIpi | null; variant?: CardVariant }) {
    if (!ipi) {
        return <div className={emptyShell(variant)}>—</div>;
    }

    const W = variant === "page" ? 280 : 200;
    const H = variant === "page" ? 220 : 160;
    const cx = W / 2;
    const cy = H / 2 + 8;
    const radius = variant === "page" ? 70 : 50;
    const axes = [
        { label: "Tech", angle: -90, value: ipi.tech_score },
        { label: "Exp", angle: 150, value: ipi.exp_score },
        { label: "Stabilité", angle: 30, value: ipi.stability_score },
    ];

    function pointAt(angleDeg: number, distance: number): [number, number] {
        const rad = (angleDeg * Math.PI) / 180;
        return [cx + Math.cos(rad) * distance, cy + Math.sin(rad) * distance];
    }

    const polygonPoints = axes
        .map((a) => pointAt(a.angle, (a.value / 10) * radius))
        .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
        .join(" ");
    const fillColor = ipi.band === "high" ? "#10b981" : ipi.band === "low" ? "#ef4444" : "#f59e0b";
    const bandBadgeClass =
        ipi.band === "high"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
            : ipi.band === "low"
              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";

    return (
        <div className={shell(variant)}>
            <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">IPI · {ipi.ipi_score.toFixed(1)}/10</h4>
                <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${bandBadgeClass}`}>{ipi.band}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className={svgClass(variant)} role="img" aria-label="Radar IPI">
                {[0.33, 0.66, 1].map((r, i) => (
                    <circle key={i} cx={cx} cy={cy} r={radius * r} fill="none" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray={i < 2 ? "2,2" : ""} />
                ))}
                {axes.map((a) => {
                    const [x, y] = pointAt(a.angle, radius);
                    return <line key={a.label} x1={cx} y1={cy} x2={x} y2={y} stroke="#cbd5e1" strokeWidth="0.5" />;
                })}
                <polygon points={polygonPoints} fill={fillColor} fillOpacity="0.25" stroke={fillColor} strokeWidth="1.5" />
                {axes.map((a) => {
                    const [x, y] = pointAt(a.angle, (a.value / 10) * radius);
                    return <circle key={a.label} cx={x} cy={y} r="4" fill={fillColor} stroke="white" strokeWidth="1" />;
                })}
                {axes.map((a) => {
                    const [x, y] = pointAt(a.angle, radius + 14);
                    return (
                        <text key={a.label} x={x} y={y} textAnchor="middle" fontSize="10" fontWeight="600" fill="#475569">
                            {a.label}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
}

export function MobilityCard({
    mobility,
    variant = "drawer",
}: {
    mobility?: AnalystMobility | null;
    variant?: CardVariant;
}) {
    if (!mobility) {
        return <div className={emptyShell(variant)}>Non évalué</div>;
    }

    const config =
        {
            stable: {
                bg: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
                text: "text-emerald-700 dark:text-emerald-200",
                label: "Mobilité stable",
            },
            mobile: {
                bg: "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30",
                text: "text-indigo-700 dark:text-indigo-200",
                label: "Mobile",
            },
            at_risk: {
                bg: "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30",
                text: "text-rose-700 dark:text-rose-200",
                label: "Risque de départ",
            },
        }[mobility.mobility_flag as "stable" | "mobile" | "at_risk"] ?? {
            bg: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50",
            text: "text-slate-700 dark:text-slate-200",
            label: mobility.mobility_flag,
        };

    const drivers = parseMobilityDrivers(mobility.drivers);
    const wrap = variant === "page" ? `${TALENT_CARD} p-6` : `rounded-lg border ${config.bg} p-3`;
    const badgeClass = `inline-flex rounded-md border px-2.5 py-1 text-[11px] font-medium ${config.bg} ${config.text}`;

    return (
        <div className={wrap}>
            <div className="flex items-center gap-3">
                <TrendingUp className={`h-5 w-5 flex-shrink-0 ${config.text}`} />
                <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${config.text}`}>
                        Mobilité · {config.label}
                        <span className="ml-2 text-xs opacity-70 tabular-nums">({mobility.mobility_score.toFixed(1)}/10)</span>
                    </p>
                </div>
            </div>
            <MobilityDriverBadges
                drivers={drivers}
                className="mt-3 flex flex-wrap gap-2"
                badgeClassName={badgeClass}
                max={variant === "page" ? 8 : 4}
            />
            {mobility.total_skills != null && mobility.total_skills > 0 ? (
                <p className={`mt-2 text-xs tabular-nums ${variant === "page" ? "text-slate-600 dark:text-slate-400" : config.text}`}>
                    Compétences totales : <span className="font-semibold">{mobility.total_skills}</span>
                </p>
            ) : null}
        </div>
    );
}
