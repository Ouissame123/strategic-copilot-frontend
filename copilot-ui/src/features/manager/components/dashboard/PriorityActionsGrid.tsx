import type { ComponentType, SVGProps } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, BarChart01, CheckCircle, Clock, SlashCircle01, Users01 } from "@untitledui/icons";
import { resolveManagerDashboardLink } from "@/features/manager/lib/dashboard-display";
import { cx } from "@/utils/cx";

const ICON_MAP: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
    stop: SlashCircle01,
    alert: AlertTriangle,
    rh: Users01,
    contract: Clock,
    overload: BarChart01,
    check: CheckCircle,
};

export function PriorityActionsGrid({ priorities }: { priorities: Array<{ icon: string; label: string; link: string }> }) {
    const navigate = useNavigate();
    if (!priorities.length) return null;

    return (
        <section className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">Priorités</span>
            {priorities.map((priority) => {
                const Icon = ICON_MAP[priority.icon] ?? CheckCircle;
                return (
                    <button
                        key={`${priority.icon}-${priority.label}-${priority.link}`}
                        type="button"
                        onClick={() => navigate(resolveManagerDashboardLink(priority.link))}
                        className={cx(
                            "inline-flex max-w-full items-center gap-1.5 rounded-full border border-secondary bg-primary px-3 py-1.5",
                            "text-left text-xs font-medium text-primary transition hover:border-brand-secondary/40 hover:bg-brand-primary/5",
                        )}
                    >
                        <Icon className="size-3.5 shrink-0 text-brand-secondary" aria-hidden />
                        <span className="truncate">{priority.label}</span>
                    </button>
                );
            })}
        </section>
    );
}
