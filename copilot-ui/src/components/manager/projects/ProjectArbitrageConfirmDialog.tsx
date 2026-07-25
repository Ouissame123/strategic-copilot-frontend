import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useExecuteArbitrage } from "@/hooks/useProjects";
import { useToast } from "@/providers/toast-provider";
import { confidencePct, optionTypePillClass, pillBase } from "./projects-list-ui";

export type PendingArbitrageOption = {
    id: string;
    option_type: string;
    rationale?: string | null;
    confidence?: number | null;
    trade_off_label?: string | null;
};

type ProjectArbitrageConfirmDialogProps = {
    option: PendingArbitrageOption | null;
    enterpriseId: string;
    onClose: () => void;
    onDone: () => void;
};

export function ProjectArbitrageConfirmDialog({ option, enterpriseId, onClose, onDone }: ProjectArbitrageConfirmDialogProps) {
    const { t } = useTranslation("common");
    const tc = (key: string) => t(`managerWorkspace.projects.listArbitrage.${key}`);
    const tt = (type: string) => t(`managerWorkspace.projects.listOptionTypes.${type}`, type);
    const { push } = useToast();
    const execute = useExecuteArbitrage();
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = () => {
        if (!option || !enterpriseId) return;
        setError(null);
        execute.mutate(
            { option_id: option.id, enterprise_id: enterpriseId, action: "execute" },
            {
                onSuccess: () => {
                    push(tc("successToast"), "success");
                    onDone();
                    onClose();
                },
                onError: () => {
                    setError(tc("errorToast"));
                    push(tc("errorToast"), "error");
                },
            },
        );
    };

    if (!option) return null;

    const typeClass = optionTypePillClass(option.option_type);

    return (
        <ConfirmDialog
            isOpen
            onOpenChange={(open) => { if (!open && !execute.isPending) onClose(); }}
            title={tc("confirmTitle")}
            body={
                <div className="space-y-3 text-sm">
                    <p className="text-slate-500">{tc("confirmBody")}</p>
                    <div className={`rounded-lg border-l-[3px] p-3 ${typeClass.replace("text-", "border-l-").split(" ")[0]} bg-slate-50 dark:bg-slate-900/40`}>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className={pillBase + " " + typeClass}>{tt(option.option_type)}</span>
                            <span className="text-[11px] text-slate-400">
                                {tc("confidence", { pct: confidencePct(option.confidence) })}
                            </span>
                        </div>
                        {option.rationale ? <p className="line-clamp-3 text-slate-600 dark:text-slate-300">{option.rationale}</p> : null}
                        {option.trade_off_label ? (
                            <p className="mt-2 text-xs font-semibold text-amber-800">⚠️ {option.trade_off_label}</p>
                        ) : null}
                    </div>
                    {error ? <p className="text-xs text-red-600">{error}</p> : null}
                </div>
            }
            confirmLabel={tc("confirmApply")}
            cancelLabel={t("common.cancel", "Annuler")}
            isConfirmLoading={execute.isPending}
            onConfirm={handleConfirm}
        />
    );
}
