import type { MissionControlRiskAlert } from "@/types/api.types";
import { AgentBlocShell } from "./agent-bloc-shell";
import { useMissionControlT } from "../use-mission-control-i18n";
import { cx } from "@/utils/cx";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const DOT: Record<string, string> = {
    critical: "bg-rose-500",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-slate-400",
};

function hoursSince(iso: string): string {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return "—";
    const h = Math.max(0, Math.round((Date.now() - t) / 3_600_000));
    return `${h}h`;
}

type AgentWatchdogPanelProps = { alerts: MissionControlRiskAlert[] };

export function AgentWatchdogPanel({ alerts }: AgentWatchdogPanelProps) {
    const { mc } = useMissionControlT();
    const sorted = [...alerts].sort(
        (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
    );

    return (
        <AgentBlocShell agentNumber={2} title={mc("agents.watchdog")} accentClass="bg-rose-100 text-rose-800" className="p-3">
            {sorted.length === 0 ? (
                <p className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    {mc("watchdog.clear")}
                </p>
            ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                    {sorted.map((a) => (
                        <li key={a.id} className="rounded border border-slate-100 p-2 text-xs dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className={cx("size-2 shrink-0 rounded-full", DOT[a.severity] ?? DOT.low)} />
                                {a.pdf_rule ? (
                                    <span className="rounded bg-slate-100 px-1 text-[9px] font-semibold uppercase dark:bg-slate-800">
                                        {a.pdf_rule}
                                    </span>
                                ) : null}
                                <span className="ml-auto tabular-nums text-slate-400">{hoursSince(a.detected_at)}</span>
                            </div>
                            <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">{a.message}</p>
                        </li>
                    ))}
                </ul>
            )}
        </AgentBlocShell>
    );
}
