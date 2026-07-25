import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { validationsApi } from "@/services/validations.api";
import { AgentBlocShell } from "./agent-bloc-shell";
import { useMissionControlT } from "../use-mission-control-i18n";

type AgentHelperPanelProps = { enterpriseId: string };

export function AgentHelperPanel({ enterpriseId }: AgentHelperPanelProps) {
    const { mc } = useMissionControlT();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ conflict: 0, missing: 0, standard: 0 });
    const [firstConflict, setFirstConflict] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const eid = enterpriseId.trim();
        const managerUserId = user?.id?.trim() || null;
        if (!eid) {
            setLoading(false);
            return;
        }
        void validationsApi
            .list({ enterprise_id: eid, manager_user_id: managerUserId })
            .then((res) => {
                if (cancelled) return;
                const c = res.data.counts;
                setSummary({
                    conflict: c.conflict,
                    missing: c.missing_justification,
                    standard: c.standard,
                });
                const conflict = res.data.pending_validations.find((v) => v.tier === "conflict");
                setFirstConflict(conflict?.reason ?? null);
            })
            .catch(() => {
                if (!cancelled) setSummary({ conflict: 0, missing: 0, standard: 0 });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [enterpriseId, user?.id]);

    return (
        <AgentBlocShell agentNumber={6} title={mc("agents.helper")} accentClass="bg-orange-100 text-orange-800" className="p-3">
            {loading ? (
                <p className="text-xs text-slate-500">…</p>
            ) : (
                <>
                    <div className="flex gap-2 text-center text-[10px]">
                        <div className="flex-1 rounded bg-rose-50 py-1.5 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                            <div className="text-lg font-bold tabular-nums">{summary.conflict}</div>
                            {mc("helper.conflicts")}
                        </div>
                        <div className="flex-1 rounded bg-amber-50 py-1.5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                            <div className="text-lg font-bold tabular-nums">{summary.missing}</div>
                            {mc("helper.missingJustification")}
                        </div>
                        <div className="flex-1 rounded bg-slate-50 py-1.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <div className="text-lg font-bold tabular-nums">{summary.standard}</div>
                            {mc("helper.standard")}
                        </div>
                    </div>
                    {firstConflict ? <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{firstConflict}</p> : null}
                    <Link to="/workspace/manager/validations" className="mt-2 inline-block text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400">
                        {mc("helper.viewAll")}
                    </Link>
                </>
            )}
        </AgentBlocShell>
    );
}
