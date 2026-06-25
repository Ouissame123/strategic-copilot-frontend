import { AlertCircle, ArrowRight, CheckCircle } from "@untitledui/icons";
import type { ActionRecommandee } from "@/api/rh-copilot.types";
import { cx } from "@/utils/cx";

const PRIORITY_CONFIG = {
    urgent: {
        Icon: AlertCircle,
        color: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
        text: "text-red-700 dark:text-red-200",
        label: "Urgent",
    },
    normal: {
        Icon: ArrowRight,
        color: "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30",
        text: "text-blue-700 dark:text-blue-200",
        label: "Normal",
    },
    low: {
        Icon: CheckCircle,
        color: "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30",
        text: "text-green-700 dark:text-green-200",
        label: "Faible",
    },
};

export function ActionsRecommandeesList({ actions }: { actions: ActionRecommandee[] }) {
    if (!actions?.length) return null;

    return (
        <div className="mt-3 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-quaternary">Actions recommandées</h4>
            <ul className="space-y-1.5">
                {actions.map((a, idx) => {
                    const cfg = PRIORITY_CONFIG[a.priorite] ?? PRIORITY_CONFIG.normal;
                    const Icon = cfg.Icon;
                    return (
                        <li key={idx} className={cx("flex items-start gap-2 rounded-md border p-2.5", cfg.color)}>
                            <Icon className={cx("mt-0.5 size-4 shrink-0", cfg.text)} aria-hidden />
                            <div className="min-w-0 flex-1">
                                <div className="mb-0.5 flex items-center gap-2">
                                    <span className={cx("text-[10px] font-bold uppercase", cfg.text)}>{cfg.label}</span>
                                </div>
                                <p className="text-sm text-primary">{a.action}</p>
                                <p className="mt-0.5 text-xs text-fg-tertiary">→ {a.impact}</p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
