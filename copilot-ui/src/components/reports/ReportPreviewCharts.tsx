import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    BarChart,
    Bar,
    LabelList,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import type { DecisionDistribution, HealthTimelinePoint, FragileProject } from "./types";
import { cn, DECISION_COLOR } from "./utils";

interface Props {
    decisions: DecisionDistribution;
    healthTimeline: HealthTimelinePoint[];
    fragileProjects: FragileProject[];
    loading?: boolean;
    layout?: "grid" | "stack";
}

function DonutDecisions({ data }: { data: DecisionDistribution }) {
    const total = data.continue + data.adjust + data.stop + (data.unscored || 0);
    const chartData = [
        { name: "Continue", value: data.continue, color: DECISION_COLOR.Continue.fill },
        { name: "Adjust", value: data.adjust, color: DECISION_COLOR.Adjust.fill },
        { name: "Stop", value: data.stop, color: DECISION_COLOR.Stop.fill },
        ...(data.unscored ? [{ name: "Non scoré", value: data.unscored, color: "#cbd5e1" }] : []),
    ].filter((d) => d.value > 0);

    const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Répartition des décisions</h4>
                <span className="text-xs text-slate-500 tabular-nums">{total} projets</span>
            </header>

            <div className="relative h-40">
                {total === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-slate-400">
                        <AlertTriangle className="mb-1 h-6 w-6" />
                        Aucune décision
                    </div>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={42}
                                    outerRadius={62}
                                    paddingAngle={2}
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {chartData.map((d, i) => (
                                        <Cell key={i} fill={d.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number, name: string) => [`${value} (${pct(Number(value))}%)`, name]}
                                    contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold tabular-nums text-slate-900">{total}</span>
                            <span className="text-[10px] uppercase tracking-wide text-slate-500">Total</span>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
                {(["Continue", "Adjust", "Stop"] as const).map((d) => {
                    const v = d === "Continue" ? data.continue : d === "Adjust" ? data.adjust : data.stop;
                    const c = DECISION_COLOR[d];
                    return (
                        <div key={d} className={cn("rounded-md px-2 py-1.5 text-center", c.bg)}>
                            <div className={cn("text-sm font-bold tabular-nums", c.text)}>{v}</div>
                            <div className="text-[10px] uppercase tracking-wide text-slate-500">{d}</div>
                            <div className="text-[10px] text-slate-500 tabular-nums">{pct(v)}%</div>
                        </div>
                    );
                })}
            </div>
        </article>
    );
}

function SparklineHealth({ data }: { data: HealthTimelinePoint[] }) {
    const last = data[data.length - 1]?.score ?? 0;
    const first = data[0]?.score ?? 0;
    const delta = last - first;
    const trend = Math.abs(delta) < 0.1 ? "flat" : delta > 0 ? "up" : "down";
    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
    const trendColor =
        trend === "up"
            ? "bg-emerald-50 text-emerald-600"
            : trend === "down"
              ? "bg-rose-50 text-rose-600"
              : "bg-slate-100 text-slate-500";

    const fmt = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    };

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Santé portefeuille</h4>
                <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium", trendColor)}>
                    <TrendIcon className="h-3 w-3" />
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(1)}
                </span>
            </header>

            <div className="mb-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-slate-900">{last.toFixed(1)}</span>
                <span className="text-sm text-slate-500">/ 10</span>
            </div>

            <div className="h-20">
                {data.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">Aucune donnée</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                            <defs>
                                <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <YAxis hide domain={[0, 10]} />
                            <XAxis hide dataKey="date" />
                            <Tooltip
                                formatter={(v: number) => [`${v.toFixed(1)} / 10`, "Santé"]}
                                labelFormatter={(l: string) => fmt(l)}
                                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#4f46e5"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: "#4f46e5" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="mt-1 flex justify-between text-[10px] text-slate-400 tabular-nums">
                <span>{data[0] ? fmt(data[0].date) : ""}</span>
                <span>{data[data.length - 1] ? fmt(data[data.length - 1].date) : ""}</span>
            </div>
        </article>
    );
}

function BarFragileProjects({ projects }: { projects: FragileProject[] }) {
    const top = [...projects].sort((a, b) => a.score - b.score).slice(0, 5);
    const data = top.map((p) => ({
        name: p.name.length > 22 ? `${p.name.slice(0, 22)}…` : p.name,
        score: Number(p.score.toFixed(1)),
        decision: p.decision,
        fill: DECISION_COLOR[p.decision].fill,
    }));

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Top projets fragiles</h4>
                <span className="text-xs text-slate-500">{projects.length} suivis</span>
            </header>

            <div className="h-44">
                {data.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">Aucun projet fragile</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 24, bottom: 2, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis
                                type="number"
                                domain={[0, 10]}
                                tick={{ fontSize: 10, fill: "#64748b" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={110}
                                tick={{ fontSize: 11, fill: "#475569" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                formatter={(v: number, _n, item) => {
                                    const dec = (item?.payload as { decision?: string })?.decision ?? "";
                                    return [`${v} / 10 (${dec})`, "Score viabilité"];
                                }}
                                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
                            />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                {data.map((d, i) => (
                                    <Cell key={i} fill={d.fill} />
                                ))}
                                <LabelList dataKey="score" position="right" style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="mt-2 flex items-center justify-end gap-3 text-[10px] text-slate-500">
                {(["Continue", "Adjust", "Stop"] as const).map((d) => (
                    <span key={d} className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm" style={{ background: DECISION_COLOR[d].fill }} />
                        {d}
                    </span>
                ))}
            </div>
        </article>
    );
}

export function ReportPreviewCharts({
    decisions,
    healthTimeline,
    fragileProjects,
    loading = false,
    layout = "grid",
}: Props) {
    if (loading) {
        return (
            <div className={cn("gap-4", layout === "grid" ? "grid grid-cols-1 md:grid-cols-3" : "space-y-4")}>
                {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200" />
                        <div className="h-40 w-full animate-pulse rounded bg-slate-100" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={cn("gap-4", layout === "grid" ? "grid grid-cols-1 md:grid-cols-3" : "space-y-4")}>
            <DonutDecisions data={decisions} />
            <SparklineHealth data={healthTimeline} />
            <BarFragileProjects projects={fragileProjects} />
        </div>
    );
}

export { DonutDecisions, SparklineHealth, BarFragileProjects };
