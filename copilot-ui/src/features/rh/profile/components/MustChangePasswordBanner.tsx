import { AlertTriangle } from "lucide-react";
import { RH_ALERT_WARN } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

type MustChangePasswordBannerProps = {
    onActivate: () => void;
};

export function MustChangePasswordBanner({ onActivate }: MustChangePasswordBannerProps) {
    return (
        <button
            type="button"
            onClick={onActivate}
            className={cx(
                "mb-5 flex w-full gap-3 px-4 py-3 text-left transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:hover:brightness-110",
                RH_ALERT_WARN,
            )}
        >
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span className="text-sm font-medium">
                Vous devez changer votre mot de passe — cliquer pour y accéder
            </span>
        </button>
    );
}
