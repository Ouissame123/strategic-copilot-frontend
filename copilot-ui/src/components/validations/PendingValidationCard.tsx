import { Loader2 } from "lucide-react";
import type { PendingValidation, ValidationTier } from "@/services/validations.api";
import { cx } from "@/utils/cx";

const BORDER_LEFT: Record<ValidationTier, string> = {
    conflict: "#dc2626",
    missing_justification: "#d97706",
    standard: "#9ca3af",
};

const BADGE: Record<ValidationTier, { bg: string; text: string; label: string }> = {
    conflict: { bg: "#fee2e2", text: "#991b1b", label: "CONFLIT" },
    missing_justification: { bg: "#fef3c7", text: "#92400e", label: "JUSTIFICATION MANQUANTE" },
    standard: { bg: "#f3f4f6", text: "#374151", label: "STANDARD" },
};

const REASON_COLOR: Record<ValidationTier, string> = {
    conflict: "#7f1d1d",
    missing_justification: "#78350f",
    standard: "#6b7280",
};

function requestTypeTitle(item: PendingValidation): string {
    if (item.request_type.toLowerCase() === "leave") return "Demande de congé";
    return item.title || item.request_type || "Demande";
}

type PendingValidationCardProps = {
    item: PendingValidation;
    actioning: boolean;
    disabled: boolean;
    onApprove: () => void;
    onReject: () => void;
};

export function PendingValidationCard({
    item,
    actioning,
    disabled,
    onApprove,
    onReject,
}: PendingValidationCardProps) {
    const badge = BADGE[item.tier];
    const typeTitle = requestTypeTitle(item);

    return (
        <article
            className="rounded-xl border border-secondary/70 bg-primary px-4 py-3.5 shadow-sm dark:border-slate-700"
            style={{ borderLeftWidth: 4, borderLeftColor: BORDER_LEFT[item.tier] }}
        >
            {/* Ligne 1 */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                        className="inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                        {badge.label}
                    </span>
                    <p className="min-w-0 text-sm font-medium text-primary">
                        {item.talent_name} — {typeTitle}
                    </p>
                </div>
                <p className="shrink-0 text-[11px] text-tertiary">
                    en attente depuis {item.days_pending} j
                </p>
            </div>

            {/* Ligne 2 — reason intégral, jamais tronqué */}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: REASON_COLOR[item.tier] }}>
                {item.reason}
            </p>

            {/* Ligne 3 — Rejeter puis Approuver */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={onReject}
                    className={cx(
                        "inline-flex items-center justify-center rounded-lg border border-secondary bg-transparent px-3.5 py-1.5 text-sm font-medium text-secondary transition",
                        "hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-60",
                        "dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800",
                    )}
                >
                    {actioning ? <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden /> : null}
                    Rejeter
                </button>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={onApprove}
                    className={cx(
                        "inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-sm font-medium text-white transition",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                    style={{ backgroundColor: "#1a1d23" }}
                >
                    {actioning ? <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden /> : null}
                    Approuver
                </button>
            </div>
        </article>
    );
}
