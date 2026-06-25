import { useTranslation } from "react-i18next";
import type { DashboardResponse } from "@/features/manager/types/dashboard";
import {
    COPILOT_ENGINE_CODENAMES,
    COPILOT_ENGINE_KEYS,
    COPILOT_ENGINE_SECTION,
    scrollToManagerDashboardSection,
    resolveEngineStatus,
    type CopilotEngineKey,
} from "@/features/manager/lib/copilot-engines";
import { cx } from "@/utils/cx";

const STATUS_DOT: Record<string, string> = {
    active: "bg-emerald-500",
    empty: "bg-amber-400",
    inactive: "bg-gray-300 dark:bg-gray-600",
    unknown: "bg-gray-300 dark:bg-gray-600",
};

function engineTitleKey(key: CopilotEngineKey): string {
    return `managerWorkspace.dashboard.engine${key.charAt(0).toUpperCase()}${key.slice(1)}Title`;
}

type Props = {
    agentsStatus: DashboardResponse["agents_status"];
    agents: DashboardResponse["agents"];
    agentsActiveCount: number;
    agentsTotal: number;
};

export function CopilotEnginesStrip({ agentsStatus, agents, agentsActiveCount, agentsTotal }: Props) {
    const { t } = useTranslation("common");

    return (
        <section
            className="rounded-xl border border-secondary bg-primary p-3 shadow-sm"
            aria-label={t("managerWorkspace.dashboard.enginesStripAria")}
        >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                    {t("managerWorkspace.dashboard.enginesStripLabel")}
                </p>
                <span className="text-[11px] tabular-nums text-quaternary">
                    {agentsActiveCount}/{agentsTotal} {t("managerWorkspace.dashboard.enginesActive")}
                </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {COPILOT_ENGINE_KEYS.map((key) => {
                    const status = resolveEngineStatus(key, agentsStatus, agents);
                    const codename = COPILOT_ENGINE_CODENAMES[key];
                    const title = t(engineTitleKey(key));
                    const section = COPILOT_ENGINE_SECTION[key];

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => scrollToManagerDashboardSection(section)}
                            className={cx(
                                "inline-flex shrink-0 flex-col items-start gap-0.5 rounded-lg border border-secondary px-2.5 py-2 text-left transition hover:border-brand-secondary/40 hover:bg-brand-primary/5",
                                status === "active" && "border-brand-secondary/25 bg-brand-primary/5",
                            )}
                            title={`${title} · ${codename}`}
                        >
                            <span className="flex items-center gap-1.5">
                                <span
                                    className={cx("size-1.5 shrink-0 rounded-full", STATUS_DOT[status] ?? STATUS_DOT.unknown)}
                                    aria-hidden
                                />
                                <span className="max-w-[9rem] truncate text-xs font-medium text-primary">{title}</span>
                            </span>
                            <span className="pl-3 font-mono text-[10px] text-quaternary">{codename}</span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
