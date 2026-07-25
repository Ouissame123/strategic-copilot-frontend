import type { ReactNode } from "react";
import { useMissionControlT } from "../use-mission-control-i18n";
import { cx } from "@/utils/cx";

type AgentBlocShellProps = {
    agentNumber: number;
    title: string;
    subtitle?: string;
    active?: boolean;
    accentClass?: string;
    children: ReactNode;
    className?: string;
};

export function AgentBlocShell({
    agentNumber,
    title,
    subtitle,
    active = true,
    accentClass = "bg-primary-100 text-primary-800",
    children,
    className,
}: AgentBlocShellProps) {
    const { mc } = useMissionControlT();

    return (
        <section className={cx("rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900", className)}>
            <header className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <span className={cx("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", accentClass)}>
                            {mc("agentBadge", { n: agentNumber })}
                        </span>
                        {active ? (
                            <span className="size-2 rounded-full bg-emerald-500" title={mc("agentActive")} aria-label={mc("agentActive")} />
                        ) : null}
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                    {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
                </div>
            </header>
            {children}
        </section>
    );
}
