import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { decisionLogCardClass } from "./decision-log-ui";

type ConfidenceTrendPoint = {
    idx: number;
    label: string;
    conf: number;
};

type ConfidenceChartProps = {
    data: ConfidenceTrendPoint[];
    title: string;
    emptyLabel: string;
};

export function ConfidenceChart({ data, title, emptyLabel }: ConfidenceChartProps) {
    return (
        <div className={decisionLogCardClass + " p-4"}>
            <h3 className="text-sm font-semibold text-primary">{title}</h3>
            <div className="mt-3 h-44 w-full min-w-0">
                {data.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-secondary/50" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10, fill: "currentColor" }}
                                className="text-tertiary"
                                interval="preserveStartEnd"
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, 100]}
                                width={28}
                                tick={{ fontSize: 10, fill: "currentColor" }}
                                className="text-tertiary"
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 8,
                                    fontSize: 12,
                                    border: "1px solid var(--color-border-secondary)",
                                }}
                                formatter={(value: number) => [`${value}%`, "Confiance"]}
                            />
                            <Line
                                type="monotone"
                                dataKey="conf"
                                stroke="hsl(var(--color-brand-secondary, 262 83% 58%))"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-tertiary">{emptyLabel}</div>
                )}
            </div>
        </div>
    );
}
