import { useMemo } from "react";
import {
    ArrowLeftRight,
    Clock,
    MoreVertical,
    Sparkles,
    StopCircle,
    UserPlus,
    type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { SimulationTab as ProjectSimulationTab } from "@/components/projects/simulation/SimulationTab";
import { useStrategistExecute } from "@/hooks/useStrategistExecute";
import { useWatchdogScan } from "@/hooks/useTeam";
import type { ArbitrageOption, ArbitrageOptionStatus, ProjectDetailResponse } from "@/types/api.types";
import { cx } from "@/utils/cx";

type SimulationTabProps = {
    projectId: string;
    projectStatus?: string | null;
    detail?: ProjectDetailResponse;
};

const ARBITRAGE_TYPE_META: Record<string, { labelKey: string; className: string; icon: LucideIcon }> = {
    reallocation: { labelKey: "arbitrageTypeReallocation", className: "border-violet-200 bg-violet-50/50", icon: ArrowLeftRight },
    reinforce: { labelKey: "arbitrageTypeReinforce", className: "border-emerald-200 bg-emerald-50/50", icon: UserPlus },
    delay: { labelKey: "arbitrageTypeDelay", className: "border-amber-200 bg-amber-50/50", icon: Clock },
    stop_scope: { labelKey: "arbitrageTypeStop", className: "border-rose-200 bg-rose-50/50", icon: StopCircle },
    stop: { labelKey: "arbitrageTypeStop", className: "border-rose-200 bg-rose-50/50", icon: StopCircle },
};

const TERMINAL_ARBITRAGE_STATUSES = new Set<ArbitrageOptionStatus>(["executed", "rejected", "expired"]);

function isActiveArbitrageOption(opt: ArbitrageOption): boolean {
    const status = (opt.status ?? "proposed") as ArbitrageOptionStatus;
    return !TERMINAL_ARBITRAGE_STATUSES.has(status);
}

function arbitrageStatusBadge(
    status: ArbitrageOptionStatus | undefined,
    tm: (key: string) => string,
): { label: string; className: string } | null {
    switch (status) {
        case "selected":
            return { label: tm("arbitrageStatusSelected"), className: "border-emerald-200 bg-emerald-50 text-emerald-800" };
        case "executed":
            return { label: tm("arbitrageStatusExecutedBadge"), className: "border-sky-200 bg-sky-50 text-sky-800" };
        case "rejected":
            return { label: tm("arbitrageStatusRejectedBadge"), className: "border-rose-200 bg-rose-50 text-rose-800" };
        case "expired":
            return { label: tm("arbitrageStatusExpired"), className: "border-slate-200 bg-slate-100 text-slate-600" };
        default:
            return null;
    }
}

function arbitrageActionLabel(status: ArbitrageOptionStatus | undefined, tm: (key: string) => string): string {
    switch (status) {
        case "selected":
            return tm("arbitrageStatusSelected");
        case "executed":
            return tm("arbitrageStatusExecutedBadge");
        case "rejected":
            return tm("arbitrageStatusRejectedBadge");
        case "expired":
            return tm("arbitrageStatusExpired");
        default:
            return tm("arbitrageAccept");
    }
}

function ArbitrageOptionsSection({ options, projectId }: { options: ArbitrageOption[]; projectId: string }) {
    const { t } = useTranslation("common");
    const tm = (key: string, opts?: Record<string, string | number>) =>
        String(opts ? t(`managerWorkspace.missionControl.${key}`, opts as never) : t(`managerWorkspace.missionControl.${key}`));
    const scan = useWatchdogScan();
    const strategistExecute = useStrategistExecute(projectId);

    const activeOptions = useMemo(() => options.filter(isActiveArbitrageOption), [options]);

    if (activeOptions.length === 0) {
        return (
            <section className="rounded-xl border border-secondary bg-primary p-4 shadow-sm sm:p-6">
                <h2 className="text-lg font-semibold text-fg-primary">{tm("arbitrageOptionsTitle")}</h2>
                <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
                    <Sparkles className="size-10 text-violet-400" aria-hidden />
                    <p className="text-sm font-medium text-fg-primary">{tm("arbitrageEmptyActiveTitle")}</p>
                    <p className="max-w-md text-sm text-fg-tertiary">{tm("arbitrageEmptyActiveDesc")}</p>
                    <Button
                        type="button"
                        color="secondary"
                        size="sm"
                        isLoading={scan.isPending}
                        onClick={() => scan.mutate({ project_id: projectId, use_ai: true })}
                    >
                        {tm("arbitrageRecalculate")}
                    </Button>
                </div>
            </section>
        );
    }

    return (
        <section className="rounded-xl border border-secondary bg-primary p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-fg-primary">{tm("arbitrageOptionsTitle")}</h2>
                    <p className="mt-1 text-xs text-fg-tertiary">{tm("arbitrageOptionsCount", { count: activeOptions.length })}</p>
                </div>
                <Button
                    type="button"
                    color="tertiary"
                    size="sm"
                    isLoading={scan.isPending}
                    onClick={() => scan.mutate({ project_id: projectId, use_ai: true })}
                >
                    {scan.isPending ? tm("arbitrageRecalculating") : tm("arbitrageRecalculate")}
                </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {activeOptions.map((opt) => {
                    const typeKey = String(opt.option_type ?? "").toLowerCase();
                    const meta = ARBITRAGE_TYPE_META[typeKey] ?? {
                        labelKey: "",
                        className: "border-secondary bg-secondary/20",
                        icon: Sparkles,
                    };
                    const Icon = meta.icon;
                    const label = meta.labelKey ? tm(meta.labelKey) : opt.label || typeKey || "—";
                    const status = (opt.status ?? "proposed") as ArbitrageOptionStatus;
                    const statusBadge = arbitrageStatusBadge(status, tm);
                    const confidencePct =
                        opt.confidence != null && Number.isFinite(Number(opt.confidence))
                            ? Math.round(Number(opt.confidence) * 100)
                            : null;
                    const isThisPending =
                        strategistExecute.isPending && strategistExecute.variables?.optionId === opt.id;
                    const canExecute = status === "proposed";

                    return (
                        <div key={opt.id} className={cx("space-y-2 rounded-lg border p-3", meta.className)}>
                            <div className="flex flex-wrap items-center gap-2">
                                <Icon className="size-4 shrink-0 text-fg-secondary" aria-hidden />
                                <span className="text-sm font-semibold text-fg-primary">{label}</span>
                                {confidencePct != null ? (
                                    <span className="rounded-full border border-secondary bg-primary px-2 py-0.5 text-[10px] font-bold text-fg-secondary">
                                        {confidencePct}%
                                    </span>
                                ) : null}
                                {statusBadge ? (
                                    <span
                                        className={cx(
                                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                            statusBadge.className,
                                        )}
                                    >
                                        {statusBadge.label}
                                    </span>
                                ) : null}
                            </div>
                            <p className="text-sm text-fg-secondary">{opt.rationale || opt.label || "—"}</p>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    color="primary"
                                    size="sm"
                                    className="min-w-0 flex-1"
                                    isLoading={isThisPending && strategistExecute.variables?.action !== "reject"}
                                    isDisabled={!canExecute || strategistExecute.isPending}
                                    onClick={() => strategistExecute.mutate({ optionId: opt.id, action: "execute" })}
                                >
                                    {arbitrageActionLabel(status, tm)}
                                </Button>
                                {canExecute ? (
                                    <Dropdown.Root>
                                        <Button
                                            type="button"
                                            color="tertiary"
                                            size="sm"
                                            iconLeading={MoreVertical}
                                            aria-label={tm("arbitrageMoreActionsAria")}
                                            aria-haspopup="menu"
                                            isDisabled={strategistExecute.isPending}
                                        />
                                        <Dropdown.Popover className="min-w-[12rem]">
                                            <Dropdown.Menu
                                                onAction={(key) => {
                                                    if (key === "reject") {
                                                        strategistExecute.mutate({ optionId: opt.id, action: "reject" });
                                                    }
                                                }}
                                            >
                                                <Dropdown.Item id="reject" label={tm("arbitrageRejectOption")} />
                                            </Dropdown.Menu>
                                        </Dropdown.Popover>
                                    </Dropdown.Root>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

/** Onglet Mission Control — simulation What-If + options d'arbitrage Strategist. */
export function SimulationTab(props: SimulationTabProps) {
    return (
        <div className="space-y-6">
            <ProjectSimulationTab {...props} />
            <ArbitrageOptionsSection options={props.detail?.arbitrage_options ?? []} projectId={props.projectId} />
        </div>
    );
}
