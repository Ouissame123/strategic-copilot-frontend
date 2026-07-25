import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
    getManagerAnalystIPI,
    getManagerAnalystMobility,
    getManagerAnalystNineBox,
} from "@/api/manager-analyst.api";
import { AgentBlocShell } from "./agent-bloc-shell";
import { useMissionControlT } from "../use-mission-control-i18n";

type AgentAnalystPanelProps = { enterpriseId: string };

export function AgentAnalystPanel({ enterpriseId }: AgentAnalystPanelProps) {
    const { mc, common } = useMissionControlT();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [ipiAvg, setIpiAvg] = useState<number | null>(null);
    const [stars, setStars] = useState(0);
    const [mobility, setMobility] = useState<{ stable: number; watch: number; at_risk: number } | null>(null);

    const managerId = user?.id ?? "";

    const load = async () => {
        if (!enterpriseId || !managerId) return;
        setLoading(true);
        setError(false);
        try {
            const [ipi, nine, mob] = await Promise.all([
                getManagerAnalystIPI(enterpriseId, managerId),
                getManagerAnalystNineBox(enterpriseId, managerId),
                getManagerAnalystMobility(enterpriseId, managerId),
            ]);
            setIpiAvg(ipi.avg_ipi ?? null);
            const dist = nine.grid?.distribution ?? {};
            const starCount = Object.entries(dist).reduce((acc, [k, v]) => {
                if (/star|9|high/i.test(k) && typeof v === "number") return acc + v;
                return acc;
            }, 0);
            setStars(starCount);
            const md = mob.distribution ?? {};
            setMobility({
                stable: Number(md.anchored ?? md.stable ?? 0),
                watch: Number(md.mobile ?? md.watch ?? 0),
                at_risk: Number(md.ready_to_move ?? md.at_risk ?? 0),
            });
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, [enterpriseId, managerId]);

    const mobTotal = mobility ? mobility.stable + mobility.watch + mobility.at_risk : 0;

    return (
        <AgentBlocShell agentNumber={5} title={mc("agents.analyst")} accentClass="bg-amber-100 text-amber-800" className="p-3">
            {loading ? <p className="text-xs text-slate-500">…</p> : null}
            {error ? (
                <button type="button" className="text-xs text-primary-600 underline dark:text-primary-400" onClick={() => void load()}>
                    {common("retry")}
                </button>
            ) : null}
            {!loading && !error ? (
                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <p>
                        {mc("analyst.ipiAvg")} : <strong className="tabular-nums">{ipiAvg != null ? ipiAvg.toFixed(1) : "—"}</strong>
                    </p>
                    <p>
                        {mc("analyst.starsNineBox")} : <strong className="tabular-nums">{stars}</strong>
                    </p>
                    {mobTotal > 0 && mobility ? (
                        <div className="flex h-2 overflow-hidden rounded-full">
                            <div className="bg-emerald-500" style={{ width: `${(mobility.stable / mobTotal) * 100}%` }} title="Stable" />
                            <div className="bg-amber-400" style={{ width: `${(mobility.watch / mobTotal) * 100}%` }} title="Watch" />
                            <div className="bg-rose-500" style={{ width: `${(mobility.at_risk / mobTotal) * 100}%` }} title="At risk" />
                        </div>
                    ) : null}
                </div>
            ) : null}
        </AgentBlocShell>
    );
}
