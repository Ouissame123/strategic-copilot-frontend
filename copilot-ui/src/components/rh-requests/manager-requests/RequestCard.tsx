import { ArrowRight, MoreVertical } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import type { ManagerRequestsDensity } from "@/components/rh-requests/manager-requests/use-manager-requests-density";
import {
    formatProjectDisplay,
    formatRelativeTimeFr,
    getRequestTitle,
    getRequestTypeLabel,
    humanizeMessagePreview,
} from "@/lib/rh-request-display";
import { readRhRequestField, readRhRequestProjectName, rhRequestStatusToBucket } from "@/utils/rh-requests-decision";
import { cx } from "@/utils/cx";
import { RequestStatusBadge } from "./RequestStatusBadge";

const PRIORITY_BORDER: Record<string, string> = {
    urgent: "border-l-red-500",
    high: "border-l-orange-500",
    normal: "border-l-transparent",
    medium: "border-l-transparent",
    low: "border-l-transparent",
};

export type RhRequestRow = Record<string, unknown> & { id: string };

type RequestCardProps = {
    request: RhRequestRow;
    density: ManagerRequestsDensity;
    onOpenDrawer: (request: RhRequestRow, tab?: "detail" | "history") => void;
    onQuickTreat: (request: RhRequestRow) => void;
    onDelete: (request: RhRequestRow) => void;
};

function isDeletableStatus(status: unknown): boolean {
    const raw = String(status ?? "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_");
    return raw === "pending" || raw === "rejected" || raw === "cancelled" || raw === "canceled";
}

function formatManagerLabel(row: RhRequestRow): string {
    const name = readRhRequestField(row, ["manager_name", "managerName"]);
    if (name) return name;
    const id = readRhRequestField(row, ["manager_user_id", "manager_id"]);
    return id ? "Manager" : "Manager inconnu";
}

export function RequestCard({ request, density, onOpenDrawer, onQuickTreat, onDelete }: RequestCardProps) {
    const isCompact = density === "compact";
    const priority = String(request.priority ?? "normal").toLowerCase();
    const bucket = rhRequestStatusToBucket(request.status ?? request.state);
    const isPending = bucket === "pending";
    const title = getRequestTitle(request);
    const typeLabel = getRequestTypeLabel(
        String(request.type ?? ""),
        readRhRequestField(request, ["type_label", "typeLabel"]) || null,
    );
    const projectName = formatProjectDisplay(readRhRequestProjectName(request) || null);
    const created = String(request.created_at ?? request.createdAt ?? "");
    const message = humanizeMessagePreview(String(request.message ?? request.description ?? ""));
    const daysSince =
        typeof request.days_since_creation === "number" ? request.days_since_creation : null;
    const showStale = isPending && daysSince != null && daysSince >= 14;

    return (
        <article
            onClick={() => onOpenDrawer(request, "detail")}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenDrawer(request, "detail");
                }
            }}
            role="button"
            tabIndex={0}
            aria-labelledby={`req-${request.id}-title`}
            className={cx(
                "group cursor-pointer rounded-lg border border-border bg-card transition hover:border-primary/40 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 border-l-4",
                PRIORITY_BORDER[priority] ?? "border-l-transparent",
                isCompact ? "p-3" : "p-4",
            )}
        >
            <div className="flex flex-wrap items-center gap-2">
                {priority === "urgent" ? (
                    <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                        URGENT
                    </span>
                ) : null}
                <span className="rounded border border-secondary/80 bg-secondary_subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                    {typeLabel}
                </span>
                <RequestStatusBadge
                    status={request.status ?? request.state}
                    statusLabel={request.status_label ?? request.statusLabel}
                />
                {showStale ? (
                    <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        ⏳ Stale {daysSince}j
                    </span>
                ) : null}
            </div>

            <h3
                id={`req-${request.id}-title`}
                className={cx("mt-2 font-medium text-foreground", isCompact ? "text-sm" : "text-base")}
            >
                {title}
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
                {projectName !== "—" ? (
                    <>
                        <span className="font-medium text-secondary">{projectName}</span>
                        <span className="mx-1.5">•</span>
                    </>
                ) : null}
                <span>{formatManagerLabel(request)}</span>
                <span className="mx-1.5">•</span>
                <time dateTime={created}>{formatRelativeTimeFr(created)}</time>
            </p>

            {!isCompact && message && message !== title ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{message}</p>
            ) : null}

            {isPending ? (
                <div className="mt-3 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button color="tertiary" size="sm" onPress={() => onOpenDrawer(request, "detail")}>
                        Voir détail
                    </Button>
                    <Button color="primary" size="sm" onPress={() => onQuickTreat(request)}>
                        Traiter
                        <ArrowRight size={14} className="ml-1" aria-hidden />
                    </Button>
                    <Dropdown.Root>
                        <Button color="tertiary" size="sm" data-icon-only aria-label="Plus d'actions">
                            <MoreVertical size={16} aria-hidden />
                        </Button>
                        <Dropdown.Popover className="min-w-[12rem]">
                            <Dropdown.Menu
                                onAction={(key) => {
                                    if (key === "history") onOpenDrawer(request, "history");
                                    else if (key === "delete") onDelete(request);
                                }}
                            >
                                <Dropdown.Item id="history" label="Historique des décisions" />
                                {isDeletableStatus(request.status ?? request.state) ? (
                                    <>
                                        <Dropdown.Separator />
                                        <Dropdown.Item id="delete" label="Supprimer" />
                                    </>
                                ) : null}
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown.Root>
                </div>
            ) : (
                <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <Dropdown.Root>
                        <Button color="tertiary" size="sm" data-icon-only aria-label="Plus d'actions">
                            <MoreVertical size={16} aria-hidden />
                        </Button>
                        <Dropdown.Popover className="min-w-[12rem]">
                            <Dropdown.Menu
                                onAction={(key) => {
                                    if (key === "detail") onOpenDrawer(request, "detail");
                                    else if (key === "history") onOpenDrawer(request, "history");
                                    else if (key === "delete") onDelete(request);
                                }}
                            >
                                <Dropdown.Item id="detail" label="Voir le détail" />
                                <Dropdown.Item id="history" label="Historique des décisions" />
                                {isDeletableStatus(request.status ?? request.state) ? (
                                    <>
                                        <Dropdown.Separator />
                                        <Dropdown.Item id="delete" label="Supprimer" />
                                    </>
                                ) : null}
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown.Root>
                </div>
            )}
        </article>
    );
}
