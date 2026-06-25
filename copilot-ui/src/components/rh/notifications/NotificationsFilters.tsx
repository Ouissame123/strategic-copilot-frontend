import { Button } from "@/components/base/buttons/button";
import type { NotificationSeverity, NotificationType } from "@/types/rh-notifications.types";
import { cx } from "@/utils/cx";

const SEVERITY_OPTIONS: { value: NotificationSeverity | "all"; label: string }[] = [
    { value: "all", label: "Toutes sévérités" },
    { value: "critical", label: "Critique" },
    { value: "high", label: "Élevée" },
    { value: "medium", label: "Moyenne" },
    { value: "low", label: "Basse" },
];

const TYPE_OPTIONS: { value: NotificationType | "all"; label: string }[] = [
    { value: "all", label: "Tous types" },
    { value: "urgent_request", label: "Demande urgente" },
    { value: "talent_at_risk", label: "Talent à risque" },
    { value: "contract_ending", label: "Fin de mission" },
    { value: "skill_gap_critical", label: "Écart compétences" },
    { value: "budget_overrun", label: "Dépassement budget" },
];

type NotificationsFiltersProps = {
    search: string;
    onSearchChange: (v: string) => void;
    severity: NotificationSeverity | "all";
    onSeverityChange: (v: NotificationSeverity | "all") => void;
    type: NotificationType | "all";
    onTypeChange: (v: NotificationType | "all") => void;
    onlyUnread: boolean;
    onOnlyUnreadChange: (v: boolean) => void;
    onReset: () => void;
};

const INPUT_CLASS =
    "h-9 w-full max-w-xs rounded-lg border border-secondary bg-primary px-2.5 text-sm text-primary outline-none placeholder:text-tertiary focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/25";

const SELECT_CLASS =
    "h-9 rounded-lg border border-secondary bg-primary px-2.5 text-sm text-primary outline-none focus:border-brand-secondary/50";

export function NotificationsFiltersBar({
    search,
    onSearchChange,
    severity,
    onSeverityChange,
    type,
    onTypeChange,
    onlyUnread,
    onOnlyUnreadChange,
    onReset,
}: NotificationsFiltersProps) {
    const hasFilters =
        Boolean(search.trim()) || severity !== "all" || type !== "all" || onlyUnread;

    return (
        <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-secondary px-3 py-1.5 text-sm">
                <input
                    type="checkbox"
                    checked={onlyUnread}
                    onChange={(e) => onOnlyUnreadChange(e.target.checked)}
                    className="accent-brand-solid"
                />
                Non-lues seulement
            </label>
            <select
                value={severity}
                onChange={(e) => onSeverityChange(e.target.value as NotificationSeverity | "all")}
                aria-label="Sévérité"
                className={SELECT_CLASS}
            >
                {SEVERITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            <select
                value={type}
                onChange={(e) => onTypeChange(e.target.value as NotificationType | "all")}
                aria-label="Type"
                className={SELECT_CLASS}
            >
                {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher…"
                aria-label="Rechercher dans les notifications"
                data-inbox-search="true"
                className={INPUT_CLASS}
            />
            {hasFilters ? (
                <Button color="tertiary" size="sm" className="ml-auto" onPress={onReset}>
                    Réinitialiser
                </Button>
            ) : null}
        </div>
    );
}
