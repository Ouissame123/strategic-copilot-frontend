import { Edit, Plus, PowerOff, UserX } from "lucide-react";
import type { AuditEventType } from "@/types/rh-accounts-audit.types";
import { cx } from "@/utils/cx";

const EVENT_CONFIG: Record<
    AuditEventType,
    { label: string; icon: typeof Plus; cls: string }
> = {
    created: {
        label: "Créé",
        icon: Plus,
        cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    updated: {
        label: "Modifié",
        icon: Edit,
        cls: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300",
    },
    disabled: {
        label: "Désactivé",
        icon: PowerOff,
        cls: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
    },
    deactivated: {
        label: "Inactif",
        icon: UserX,
        cls: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
    },
};

export function EventBadge({ eventType }: { eventType: string }) {
    const cfg =
        EVENT_CONFIG[eventType as AuditEventType] ??
        ({ label: eventType, icon: Edit, cls: "border-secondary bg-secondary_subtle text-secondary" } as const);
    const Icon = cfg.icon;

    return (
        <span
            className={cx(
                "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                cfg.cls,
            )}
        >
            <Icon className="size-2.5" aria-hidden />
            {cfg.label}
        </span>
    );
}
