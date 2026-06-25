import { ArrowRight, Check, MoreVertical, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import type { ManagerRequestsDensity } from "@/components/rh-requests/manager-requests/use-manager-requests-density";
import type { RhRequestRow } from "@/components/rh-requests/manager-requests/RequestCard";
import { AgentBadge } from "@/components/rh/inbox/AgentBadge";
import { AiReasoningBlock } from "@/components/rh/inbox/AiReasoningBlock";
import { PriorityBorder, PriorityPill } from "@/components/rh/inbox/PriorityPill";
import { StaleBadge } from "@/components/rh/inbox/StaleBadge";
import { StatusDot } from "@/components/rh/inbox/StatusDot";
import { classifySource } from "@/lib/classifySource";
import {
    formatProjectDisplay,
    formatRelativeTimeFr,
    getRequestTitle,
    getRequestTypeLabel,
} from "@/lib/rh-request-display";
import { readRhRequestField, readRhRequestProjectName, rhRequestStatusToBucket } from "@/utils/rh-requests-decision";
import { cx } from "@/utils/cx";

type ActionCardProps = {
    request: RhRequestRow;
    density: ManagerRequestsDensity;
    selected?: boolean;
    focused?: boolean;
    onSelectToggle?: (id: string) => void;
    onOpenDrawer: (request: RhRequestRow, tab?: "detail" | "history") => void;
    onQuickTreat: (request: RhRequestRow) => void;
    onQuickAccept?: (request: RhRequestRow) => void;
    onQuickReject?: (request: RhRequestRow) => void;
    onDelete: (request: RhRequestRow) => void;
};

function isDeletableStatus(status: unknown): boolean {
    const raw = String(status ?? "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_");
    return raw === "pending" || raw === "rejected" || raw === "cancelled" || raw === "canceled";
}

function readPayload(request: RhRequestRow): Record<string, unknown> | null {
    const p = request.payload;
    if (p && typeof p === "object" && !Array.isArray(p)) return p as Record<string, unknown>;
    return null;
}

function readAiConfidence(payload: Record<string, unknown> | null): number | null {
    if (!payload) return null;
    const v = payload.ai_confidence;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export function ActionCard({
    request,
    density,
    selected,
    focused,
    onSelectToggle,
    onOpenDrawer,
    onQuickTreat,
    onQuickAccept,
    onQuickReject,
    onDelete,
}: ActionCardProps) {
    const isCompact = density === "compact";
    const source = classifySource(request);
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
    const payload = readPayload(request);
    const confidence = source !== "manager" ? readAiConfidence(payload) : null;
    const daysSince =
        typeof request.days_since_creation === "number" ? request.days_since_creation : null;
    const showStale = isPending && daysSince != null && daysSince >= 14;

    return (
        <motion.article
            layout
            data-source={source}
            data-priority={priority}
            data-selected={selected || focused ? "true" : undefined}
            onClick={() => onOpenDrawer(request, "detail")}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenDrawer(request, "detail");
                }
            }}
            role="button"
            tabIndex={focused ? 0 : -1}
            aria-labelledby={`req-${request.id}-title`}
            className={cx(
                "group relative cursor-pointer overflow-hidden rounded-md border border-ws-border-subtle bg-ws-card transition-all duration-[var(--inbox-duration-fast)]",
                "hover:border-ws-border hover:shadow-sm",
                selected && "ring-2 ring-ws-accent/40",
                focused && "ring-2 ring-ws-accent ring-offset-1 ring-offset-ws-canvas",
            )}
        >
            <PriorityBorder priority={priority} />

            <div className={cx("pl-4 pr-3", isCompact ? "py-2.5" : "py-3.5")}>
                <div className="flex items-center gap-1.5 text-xs">
                    {onSelectToggle ? (
                        <input
                            type="checkbox"
                            checked={Boolean(selected)}
                            onChange={(e) => {
                                e.stopPropagation();
                                onSelectToggle(String(request.id));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Sélectionner ${title}`}
                            className="mr-0.5 size-3.5 shrink-0 accent-ws-accent"
                        />
                    ) : null}
                    <AgentBadge source={source} />
                    <span className="text-ws-faint" aria-hidden>
                        ·
                    </span>
                    <span className="rounded border border-ws-border-subtle bg-ws-muted-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ws-secondary">
                        {typeLabel}
                    </span>
                    <PriorityPill priority={priority} />
                    <span className="text-ws-faint" aria-hidden>
                        ·
                    </span>
                    <StatusDot status={request.status ?? request.state} statusLabel={request.status_label ?? request.statusLabel} />
                    {showStale ? (
                        <>
                            <span className="text-ws-faint" aria-hidden>
                                ·
                            </span>
                            <StaleBadge days={daysSince!} />
                        </>
                    ) : null}

                    <div
                        className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isPending && onQuickAccept ? (
                            <button
                                type="button"
                                aria-label="Accepter (A)"
                                onClick={() => onQuickAccept(request)}
                                className="rounded p-1 text-ws-muted hover:bg-ws-subtle hover:text-emerald-600"
                            >
                                <Check className="size-3.5" />
                            </button>
                        ) : null}
                        {isPending && onQuickReject ? (
                            <button
                                type="button"
                                aria-label="Rejeter (R)"
                                onClick={() => onQuickReject(request)}
                                className="rounded p-1 text-ws-muted hover:bg-ws-subtle hover:text-red-600"
                            >
                                <X className="size-3.5" />
                            </button>
                        ) : null}
                        <Dropdown.Root>
                            <Button color="tertiary" size="sm" data-icon-only aria-label="Plus d'actions">
                                <MoreVertical size={14} aria-hidden />
                            </Button>
                            <Dropdown.Popover className="min-w-[12rem]">
                                <Dropdown.Menu
                                    onAction={(key) => {
                                        if (key === "history") onOpenDrawer(request, "history");
                                        else if (key === "delete") onDelete(request);
                                        else if (key === "detail") onOpenDrawer(request, "detail");
                                    }}
                                >
                                    <Dropdown.Item id="detail" label="Voir le détail" />
                                    <Dropdown.Item id="history" label="Historique" />
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
                </div>

                <h3
                    id={`req-${request.id}-title`}
                    className={cx("mt-2 font-medium leading-snug text-ws-primary", isCompact ? "text-sm" : "text-sm")}
                >
                    {title}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ws-secondary">
                    {projectName !== "—" ? (
                        <>
                            <span className="font-medium text-ws-primary">{projectName}</span>
                            <span className="text-ws-faint">·</span>
                        </>
                    ) : null}
                    {confidence != null ? (
                        <>
                            <span>Confiance {Math.round(confidence * 100)}%</span>
                            <span className="text-ws-faint">·</span>
                        </>
                    ) : null}
                    <time dateTime={created}>{formatRelativeTimeFr(created)}</time>
                </div>

                <AiReasoningBlock source={source} payload={payload} compact={isCompact} />

                {isPending ? (
                    <div
                        className="mt-3 flex items-center justify-between border-t border-ws-border-subtle pt-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button color="tertiary" size="sm" onPress={() => onOpenDrawer(request, "detail")}>
                            Voir détail
                        </Button>
                        <Button color="primary" size="sm" onPress={() => onQuickTreat(request)}>
                            Traiter
                            <ArrowRight size={14} className="ml-1" aria-hidden />
                        </Button>
                    </div>
                ) : null}
            </div>
        </motion.article>
    );
}
