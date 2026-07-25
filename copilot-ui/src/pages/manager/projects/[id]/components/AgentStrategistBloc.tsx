import { useState } from "react";
import type { MissionControlArbitrageOption } from "@/types/api.types";
import { useExecuteArbitrage, useRecompute } from "@/hooks/use-project-detail";
import { useToast } from "@/providers/toast-provider";
import { AgentBlocShell } from "./agent-bloc-shell";
import { ConfirmArbitrageDialog } from "./ConfirmArbitrageDialog";
import { useMissionControlT } from "../use-mission-control-i18n";
import { cx } from "@/utils/cx";

const TYPE_STYLES: Record<string, string> = {
    reallocation: "bg-indigo-50 text-indigo-800 border-indigo-200",
    delay: "bg-amber-50 text-amber-800 border-amber-200",
    reinforce: "bg-emerald-50 text-emerald-800 border-emerald-200",
    stop_scope: "bg-rose-50 text-rose-800 border-rose-200",
};

type AgentStrategistBlocProps = {
    options: MissionControlArbitrageOption[];
    enterpriseId: string;
    projectId: string;
};

export function AgentStrategistBloc({ options, enterpriseId, projectId }: AgentStrategistBlocProps) {
    const { mc } = useMissionControlT();
    const { push: toast } = useToast();
    const execute = useExecuteArbitrage(projectId);
    const recompute = useRecompute();
    const [pending, setPending] = useState<MissionControlArbitrageOption | null>(null);

    const proposed = options.filter((o) => o.status === "proposed");

    const optionLabel = (type: string) => mc(`optionTypes.${type}`);

    const runAction = async (action: "execute" | "reject") => {
        if (!pending) return;
        try {
            await execute.mutateAsync({ option_id: pending.id, enterprise_id: enterpriseId, action });
            toast(action === "execute" ? mc("arbitrage.applyBtn") : mc("arbitrage.rejectBtn"), "success");
            setPending(null);
            recompute.mutate({ project_id: projectId, enterprise_id: enterpriseId, force_refresh: true });
        } catch {
            toast(mc("errorLoad"), "error");
        }
    };

    if (!proposed.length) {
        return (
            <AgentBlocShell agentNumber={3} title={mc("agents.strategist")} active={false} accentClass="bg-indigo-100 text-indigo-800">
                <p className="text-sm text-slate-500">{mc("arbitrage.noOptions")}</p>
            </AgentBlocShell>
        );
    }

    const avgConf = proposed.reduce((s, o) => s + o.confidence, 0) / proposed.length;

    return (
        <>
            <AgentBlocShell
                agentNumber={3}
                title={mc("agents.strategist")}
                subtitle={`${proposed.length} · ${Math.round(avgConf * (avgConf <= 1 ? 100 : 1))}%`}
                accentClass="bg-indigo-100 text-indigo-800"
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    {proposed.map((opt) => (
                        <article key={opt.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="flex items-center justify-between gap-2">
                                <span
                                    className={cx(
                                        "rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                        TYPE_STYLES[opt.option_type] ?? TYPE_STYLES.reallocation,
                                    )}
                                >
                                    {optionLabel(opt.option_type)}
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                    {Math.round(opt.confidence * (opt.confidence <= 1 ? 100 : 1))}%
                                </span>
                            </div>
                            <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{opt.rationale}</p>
                            {opt.trade_off_label ? (
                                <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400">
                                    {mc("arbitrage.tradeOff")}: {opt.trade_off_label}
                                </p>
                            ) : null}
                            <div className="mt-3 flex gap-2">
                                <button
                                    type="button"
                                    className="rounded bg-primary-600 px-2 py-1 text-xs font-semibold text-white hover:bg-primary-700"
                                    onClick={() => setPending(opt)}
                                >
                                    {mc("arbitrage.applyBtn")}
                                </button>
                                <button
                                    type="button"
                                    className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                                    onClick={() => {
                                        setPending(opt);
                                        void (async () => {
                                            try {
                                                await execute.mutateAsync({
                                                    option_id: opt.id,
                                                    enterprise_id: enterpriseId,
                                                    action: "reject",
                                                });
                                                toast(mc("arbitrage.rejectBtn"), "success");
                                            } catch {
                                                toast(mc("errorLoad"), "error");
                                            } finally {
                                                setPending(null);
                                            }
                                        })();
                                    }}
                                >
                                    {mc("arbitrage.rejectBtn")}
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </AgentBlocShell>
            {pending ? (
                <ConfirmArbitrageDialog
                    option={pending}
                    enterpriseId={enterpriseId}
                    loading={execute.isPending}
                    onClose={() => setPending(null)}
                    onConfirm={() => void runAction("execute")}
                    onReject={() => void runAction("reject")}
                    optionLabel={optionLabel(pending.option_type)}
                />
            ) : null}
        </>
    );
}
