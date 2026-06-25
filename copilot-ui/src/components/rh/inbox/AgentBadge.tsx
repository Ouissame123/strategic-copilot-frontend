import {
    BarChart3,
    HeartHandshake,
    ShieldAlert,
    Target,
    User,
    type LucideIcon,
} from "lucide-react";
import type { RhActionSource } from "@/lib/classifySource";
import { cx } from "@/utils/cx";

const AGENT_CONFIG: Record<
    RhActionSource,
    { icon: LucideIcon; label: string; cls: string }
> = {
    manager: {
        icon: User,
        label: "Manager",
        cls: "bg-ws-muted-surface text-ws-secondary border-ws-border-subtle",
    },
    watchdog: {
        icon: ShieldAlert,
        label: "Watchdog",
        cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/50",
    },
    strategist: {
        icon: Target,
        label: "Strategist",
        cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900/50",
    },
    analyst: {
        icon: BarChart3,
        label: "Analyst",
        cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900/50",
    },
    matchmaker: {
        icon: HeartHandshake,
        label: "Matchmaker",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50",
    },
};

type AgentBadgeProps = {
    source: RhActionSource;
    className?: string;
};

export function AgentBadge({ source, className }: AgentBadgeProps) {
    const cfg = AGENT_CONFIG[source];
    const Icon = cfg.icon;
    return (
        <span
            className={cx(
                "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                cfg.cls,
                className,
            )}
        >
            <Icon className="size-2.5 shrink-0" aria-hidden />
            {cfg.label}
        </span>
    );
}

export { AGENT_CONFIG };
