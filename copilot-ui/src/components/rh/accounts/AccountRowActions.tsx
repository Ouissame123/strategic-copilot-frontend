import { KeyRound, Loader2, Pencil, Trash2 } from "lucide-react";
import { Toggle } from "@/components/base/toggle/toggle";
import { cx } from "@/utils/cx";

type AccountRowActionsProps = {
    showChangePassword?: boolean;
    isActive: boolean;
    disabled?: boolean;
    toggling?: boolean;
    onChangePassword?: () => void;
    onToggleStatus: () => void;
    onDelete: () => void;
};

const actionBtnCls =
    "inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200";

export function AccountRowActions({
    showChangePassword = false,
    isActive,
    disabled = false,
    toggling = false,
    onChangePassword,
    onToggleStatus,
    onDelete,
}: AccountRowActionsProps) {
    return (
        <div className="flex items-center justify-end gap-1">
            {showChangePassword && onChangePassword ? (
                <button
                    type="button"
                    title="Changer mot de passe"
                    aria-label="Changer mot de passe"
                    className={actionBtnCls}
                    disabled={disabled}
                    onClick={onChangePassword}
                >
                    <span className="relative size-4" aria-hidden>
                        <KeyRound className="absolute inset-0 size-4 opacity-90" />
                        <Pencil className="absolute -bottom-0.5 -right-0.5 size-2.5 text-violet-600 dark:text-violet-400" />
                    </span>
                </button>
            ) : null}

            <div className="flex items-center gap-1.5 px-1" title={isActive ? "Désactiver" : "Activer"}>
                {toggling ? (
                    <Loader2 className="size-4 animate-spin text-violet-600" aria-hidden />
                ) : (
                    <Toggle
                        size="sm"
                        isSelected={isActive}
                        isDisabled={disabled || toggling}
                        onChange={() => onToggleStatus()}
                        aria-label={isActive ? "Désactiver le compte" : "Activer le compte"}
                    />
                )}
            </div>

            <button
                type="button"
                title="Supprimer"
                aria-label="Supprimer"
                className={cx(actionBtnCls, "text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30")}
                disabled={disabled}
                onClick={onDelete}
            >
                <Trash2 className="size-4" aria-hidden />
            </button>
        </div>
    );
}
