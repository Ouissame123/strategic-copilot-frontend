import { Check } from "lucide-react";
import {
    SEVERITY_BAR_CLASS,
    SEVERITY_DOT_CLASS,
    SEVERITY_LABEL_FR,
    type ManagerAlertGroup,
} from "@/lib/manager-alerts-inbox";
import { formatRelativeTimeFr } from "@/lib/rh-request-display";
import { cx } from "@/utils/cx";

type AlertInboxRowProps = {
    group: ManagerAlertGroup;
    acking: boolean;
    onOpen: (group: ManagerAlertGroup) => void;
    onMarkRead: (group: ManagerAlertGroup) => void;
};

export function AlertInboxRow({ group, acking, onOpen, onMarkRead }: AlertInboxRowProps) {
    const age = group.age_label || formatRelativeTimeFr(group.latest_at);
    const severityLabel = SEVERITY_LABEL_FR[group.severity];

    return (
        <li>
            <div
                className={cx(
                    "group relative flex items-stretch gap-0 border-b border-secondary transition",
                    "hover:bg-secondary_subtle/60",
                    acking && "opacity-50",
                    !group.unread && "text-slate-500",
                )}
            >
                <span
                    className={cx("w-1 shrink-0 self-stretch", SEVERITY_BAR_CLASS[group.severity])}
                    aria-hidden
                />
                <button
                    type="button"
                    onClick={() => onOpen(group)}
                    className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400"
                    aria-label={`${group.title}, ${severityLabel}${group.unread ? ", non lue" : ""}`}
                >
                    <span
                        className={cx("mt-1.5 size-2 shrink-0 rounded-full", SEVERITY_DOT_CLASS[group.severity])}
                        aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                            <span
                                className={cx(
                                    "min-w-0 flex-1 truncate text-sm leading-snug",
                                    group.unread ? "font-medium text-primary" : "text-slate-500",
                                )}
                            >
                                {group.title}
                            </span>
                            {group.count > 1 ? (
                                <span className="shrink-0 rounded bg-secondary_subtle px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-tertiary">
                                    ×{group.count}
                                </span>
                            ) : null}
                            <span className="shrink-0 text-[11px] tabular-nums text-tertiary">{age}</span>
                            {group.unread ? (
                                <span
                                    className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500"
                                    title="Non lue"
                                    aria-label="Non lue"
                                />
                            ) : (
                                <span className="mt-1.5 size-2 shrink-0" aria-hidden />
                            )}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-tertiary">
                            <span className="truncate">{group.project_name?.trim() || "Sans projet"}</span>
                            <span aria-hidden>·</span>
                            <span>{severityLabel}</span>
                        </span>
                    </span>
                </button>
                {group.unread ? (
                    <div className="flex shrink-0 items-center pr-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button
                            type="button"
                            disabled={acking}
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkRead(group);
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-secondary px-2 py-1 text-[11px] text-secondary transition hover:bg-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Marquer comme lu"
                        >
                            <Check size={12} aria-hidden />
                            <span className="hidden sm:inline">Marquer lu</span>
                        </button>
                    </div>
                ) : null}
            </div>
        </li>
    );
}
