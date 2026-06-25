import { rhRequestStatusToBucket } from "@/utils/rh-requests-decision";
import { cx } from "@/utils/cx";

const STATUS_DOT: Record<string, { dot: string; labelFallback: string }> = {
    pending: { dot: "bg-inbox-status-pending", labelFallback: "En attente" },
    in_progress: { dot: "bg-inbox-status-in-progress", labelFallback: "En cours" },
    accepted: { dot: "bg-inbox-status-accepted", labelFallback: "Acceptée" },
    rejected: { dot: "bg-inbox-status-rejected", labelFallback: "Rejetée" },
    done: { dot: "bg-inbox-status-accepted", labelFallback: "Terminée" },
    closed: { dot: "bg-ws-faint", labelFallback: "Clôturée" },
    cancelled: { dot: "bg-ws-faint", labelFallback: "Annulée" },
};

type StatusDotProps = {
    status: unknown;
    statusLabel?: unknown;
    className?: string;
};

export function StatusDot({ status, statusLabel, className }: StatusDotProps) {
    const bucket = rhRequestStatusToBucket(status) ?? "pending";
    const cfg = STATUS_DOT[bucket] ?? STATUS_DOT.pending;
    const label =
        typeof statusLabel === "string" && statusLabel.trim()
            ? statusLabel.trim()
            : cfg.labelFallback;

    return (
        <span className={cx("inline-flex items-center gap-1.5 text-xs text-ws-secondary", className)}>
            <span className={cx("size-1.5 shrink-0 rounded-full", cfg.dot)} aria-hidden />
            {label}
        </span>
    );
}
