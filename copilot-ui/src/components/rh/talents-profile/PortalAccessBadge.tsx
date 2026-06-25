import { Key, KeyRound } from "lucide-react";
import { cx } from "@/utils/cx";

type PortalAccessBadgeProps = {
    hasAccess: boolean;
};

export function PortalAccessBadge({ hasAccess }: PortalAccessBadgeProps) {
    return (
        <span
            className={cx(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                hasAccess
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
            )}
        >
            {hasAccess ? <KeyRound className="size-2.5" aria-hidden /> : <Key className="size-2.5 opacity-60" aria-hidden />}
            {hasAccess ? "Portail actif" : "Sans accès"}
        </span>
    );
}
