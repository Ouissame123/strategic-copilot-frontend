import { Loader2 } from "lucide-react";
import type { MissionControlArbitrageOption } from "@/types/api.types";
import { useMissionControlT } from "../use-mission-control-i18n";
import { cx } from "@/utils/cx";

type ConfirmArbitrageDialogProps = {
    option: MissionControlArbitrageOption;
    enterpriseId: string;
    optionLabel: string;
    loading?: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onReject: () => void;
};

export function ConfirmArbitrageDialog({
    option,
    optionLabel,
    loading,
    onClose,
    onConfirm,
    onReject,
}: ConfirmArbitrageDialogProps) {
    const { mc } = useMissionControlT();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <button
                type="button"
                className="absolute inset-0 bg-black/50"
                aria-label={mc("actions.close")}
                onClick={onClose}
            />
            <div className="relative max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{mc("arbitrage.confirmTitle")}</h3>
                <p className="mt-1 text-sm text-slate-500">{mc("arbitrage.confirmBody")}</p>
                <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold uppercase text-primary-700 dark:text-primary-300">{optionLabel}</span>
                    <p className="mt-2 leading-relaxed text-slate-700 dark:text-slate-300">{option.rationale}</p>
                    {option.trade_off_label ? (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                            {mc("arbitrage.tradeOff")}: {option.trade_off_label}
                        </p>
                    ) : null}
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                    >
                        {mc("arbitrage.cancelBtn")}
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={onReject}
                        className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900"
                    >
                        {mc("arbitrage.rejectBtn")}
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={onConfirm}
                        className={cx(
                            "inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white",
                            loading && "opacity-70",
                        )}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                        {mc("arbitrage.applyBtn")}
                    </button>
                </div>
            </div>
        </div>
    );
}
