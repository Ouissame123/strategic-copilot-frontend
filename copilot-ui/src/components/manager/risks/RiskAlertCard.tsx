import { MoreVertical } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import type { DisplayAlert, RiskAlertPatchRequest } from "@/components/risks/risks-shared";
import { resolveRiskAlertPatchId, severityBadgeClass } from "@/components/risks/risks-shared";
import {
    riskTypeLabel,
    severityLeftBorderClass,
    type RiskAlertDedupEntry,
    type RisksDensity,
} from "@/lib/manager-risks-list-utils";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";

type RiskAlertCardProps = {
    entry: RiskAlertDedupEntry;
    density: RisksDensity;
    patchPending?: boolean;
    onOpenDrawer: (alert: DisplayAlert) => void;
    onPatch: (request: RiskAlertPatchRequest) => void;
    onShowDuplicates?: (entry: RiskAlertDedupEntry) => void;
};

export function RiskAlertCard({
    entry,
    density,
    patchPending,
    onOpenDrawer,
    onPatch,
    onShowDuplicates,
}: RiskAlertCardProps) {
    const navigate = useNavigate();
    const { alert, count } = entry;
    const compact = density === "compact";
    const patchId = resolveRiskAlertPatchId(alert);
    const canPatch = Boolean(patchId);

    return (
        <article
            onClick={() => onOpenDrawer(alert)}
            className={cx(
                "cursor-pointer rounded-md border border-slate-200 bg-white transition hover:border-violet-300 dark:border-slate-700 dark:bg-slate-950",
                severityLeftBorderClass(alert.severity),
                compact ? "px-3 py-2" : "px-4 py-3",
            )}
        >
            <div className="flex items-center gap-3">
                <span
                    className={cx(
                        "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                        severityBadgeClass(alert.severity),
                    )}
                >
                    {alert.severity || "—"}
                </span>
                <span className="shrink-0 text-xs uppercase text-slate-500">{riskTypeLabel(alert.riskType ?? alert.category)}</span>
                {count > 1 ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowDuplicates?.(entry);
                        }}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                    >
                        × {count}
                    </button>
                ) : null}

                <div className="min-w-0 flex-1">
                    <p className={cx("truncate font-medium text-slate-900 dark:text-slate-100", compact ? "text-sm" : "text-base")}>
                        {alert.projectName}
                    </p>
                    {!compact ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{alert.message}</p>
                    ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <Button
                        type="button"
                        color="tertiary"
                        size="sm"
                        isDisabled={!canPatch || patchPending}
                        onClick={() => onPatch({ alert, action: "ignore" })}
                    >
                        Ignorer
                    </Button>
                    <Button
                        type="button"
                        color="primary"
                        size="sm"
                        isDisabled={!canPatch || patchPending}
                        onClick={() => onPatch({ alert, action: "resolve" })}
                    >
                        Résoudre
                    </Button>
                    <Dropdown.Root>
                        <Button
                            type="button"
                            color="tertiary"
                            size="sm"
                            className="min-h-8 min-w-8"
                            iconLeading={MoreVertical}
                            aria-label="Actions alerte"
                            aria-haspopup="menu"
                        />
                        <Dropdown.Popover className="min-w-[12rem]">
                            <Dropdown.Menu
                                onAction={(key) => {
                                    const k = String(key);
                                    if (k === "drawer") onOpenDrawer(alert);
                                    if (k === "project" && alert.projectId) {
                                        navigate(managerProjectMissionControlPath(alert.projectId, "overview"));
                                    }
                                    if (k === "why") onOpenDrawer(alert);
                                }}
                            >
                                <Dropdown.Item id="drawer" label="Voir détail" />
                                {alert.projectId ? (
                                    <Dropdown.Item id="project" label="Voir projet" />
                                ) : null}
                                <Dropdown.Separator />
                                <Dropdown.Item id="why" label="Pourquoi cette alerte" />
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown.Root>
                </div>
            </div>
        </article>
    );
}

export function RiskAlertDuplicateRow({
    alert,
    onOpenDrawer,
}: {
    alert: DisplayAlert;
    onOpenDrawer: (alert: DisplayAlert) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onOpenDrawer(alert)}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900/60"
        >
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{alert.projectName}</p>
            {alert.message ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{alert.message}</p> : null}
            <p className="mt-1 text-[10px] text-slate-400">
                {alert.severity} · {alert.detectedAt ? new Date(alert.detectedAt).toLocaleString("fr-FR") : "—"}
            </p>
        </button>
    );
}
