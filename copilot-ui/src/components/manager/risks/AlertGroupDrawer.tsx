import { useEffect, useId, useRef } from "react";
import { Check, X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { isManagerNotificationUnread } from "@/lib/manager-notifications-normalize";
import {
    SEVERITY_DOT_CLASS,
    SEVERITY_LABEL_FR,
    type ManagerAlertGroup,
} from "@/lib/manager-alerts-inbox";
import { formatRelativeTimeFr } from "@/lib/rh-request-display";
import type { ManagerNotification } from "@/types/manager-notifications.types";
import { cx } from "@/utils/cx";

type AlertGroupDrawerProps = {
    group: ManagerAlertGroup | null;
    acking: boolean;
    onClose: () => void;
    onMarkRead: (group: ManagerAlertGroup) => void;
};

function OccurrenceRow({ occurrence }: { occurrence: ManagerNotification }) {
    const unread = isManagerNotificationUnread(occurrence.status);
    const stamp = occurrence.created_at
        ? new Date(occurrence.created_at).toLocaleString("fr-FR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";
    const relative = occurrence.age_label || formatRelativeTimeFr(occurrence.created_at);

    return (
        <li
            className={cx(
                "rounded-lg border border-secondary px-3 py-2.5",
                unread ? "bg-primary" : "bg-secondary_subtle/40",
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className={cx("text-sm leading-snug", unread ? "font-medium text-primary" : "text-slate-500")}>
                        {occurrence.message?.trim() || occurrence.title}
                    </p>
                    <p className="mt-1 text-[11px] text-tertiary">
                        <time dateTime={occurrence.created_at || undefined}>{stamp}</time>
                        <span aria-hidden> · </span>
                        <span>{relative}</span>
                    </p>
                </div>
                {unread ? (
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-500" title="Non lue" aria-label="Non lue" />
                ) : (
                    <span className="mt-1 text-[10px] text-tertiary">Lue</span>
                )}
            </div>
        </li>
    );
}

export function AlertGroupDrawer({ group, acking, onClose, onMarkRead }: AlertGroupDrawerProps) {
    const open = Boolean(group);
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);
    useLockBodyScroll(open);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        closeRef.current?.focus();
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!group) return null;

    const severityLabel = SEVERITY_LABEL_FR[group.severity];

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px]"
                aria-label="Fermer"
                onClick={onClose}
            />
            <aside
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[480px] flex-col border-l border-secondary bg-primary shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span
                                className={cx("size-2 rounded-full", SEVERITY_DOT_CLASS[group.severity])}
                                aria-hidden
                            />
                            <span className="text-xs font-medium text-secondary">{severityLabel}</span>
                            {group.count > 1 ? (
                                <span className="rounded bg-secondary_subtle px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-tertiary">
                                    ×{group.count}
                                </span>
                            ) : null}
                            {group.unread ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
                                    <span className="size-1.5 rounded-full bg-blue-500" aria-hidden />
                                    Non lue
                                </span>
                            ) : null}
                        </div>
                        <h2 id={titleId} className="line-clamp-3 text-base font-semibold text-primary">
                            {group.title}
                        </h2>
                        <p className="mt-1 text-xs text-tertiary">{group.project_name?.trim() || "Sans projet"}</p>
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-tertiary transition hover:bg-secondary_subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                        aria-label="Fermer"
                    >
                        <X className="size-5" aria-hidden />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    <p className="mb-3 text-xs text-tertiary">
                        {group.count} occurrence{group.count > 1 ? "s" : ""} — horodatages individuels
                    </p>
                    <ul className="space-y-2">
                        {group.occurrences.map((occurrence) => (
                            <OccurrenceRow key={occurrence.id} occurrence={occurrence} />
                        ))}
                    </ul>
                </div>

                {group.unread ? (
                    <footer className="shrink-0 border-t border-secondary px-4 py-3">
                        <button
                            type="button"
                            disabled={acking}
                            onClick={() => onMarkRead(group)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Check size={14} aria-hidden />
                            Marquer le groupe comme lu
                        </button>
                    </footer>
                ) : null}
            </aside>
        </>
    );
}
