import { AlertTriangle, Calendar, CheckCircle2, ChevronRight, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router";
import type { TalentDashboard, PriorityIcon } from "@/types/talent-dashboard";
import { TALENT_SURFACE } from "@/components/talent/ui/talent-workspace-ui";
import { PRIORITY_TONES, toneClasses } from "./talent-dashboard-tones";
import { cx } from "@/utils/cx";

const ICONS: Record<PriorityIcon, typeof Calendar> = {
    contract: Calendar,
    alert: AlertTriangle,
    opportunity: Sparkles,
    pending: Clock,
    check: CheckCircle2,
};

type PrioritiesPanelProps = {
    priorities?: TalentDashboard["priorities"];
};

export function PrioritiesPanel({ priorities }: PrioritiesPanelProps) {
    if (!priorities || priorities.length === 0) return null;

    const items = priorities.slice(0, 3);

    return (
        <section className={cx(TALENT_SURFACE, "border-l-[3px] border-l-brand-secondary p-4")}>
            <h2 className="text-sm font-semibold text-primary">Actions prioritaires</h2>
            <ul className="mt-2.5 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
                {items.map((item, index) => {
                    const Icon = ICONS[item.icon] ?? AlertTriangle;
                    const tone = PRIORITY_TONES[item.priority] ?? "slate";
                    const toneCls = toneClasses(tone);
                    const content = (
                        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-secondary/50 bg-secondary_subtle/40 px-3 py-2 text-sm transition hover:border-brand-secondary/40 hover:bg-brand-primary/5">
                            <span className={cx("flex size-7 shrink-0 items-center justify-center rounded-md border", toneCls.badge)}>
                                <Icon className="size-3.5" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1 font-medium text-primary">{item.label}</span>
                            <ChevronRight className="size-3.5 shrink-0 text-tertiary" aria-hidden />
                        </span>
                    );

                    return (
                        <li key={`priority-${index}`} className="min-w-[12rem] flex-1 sm:max-w-[calc(33.333%-0.5rem)]">
                            {item.link ? (
                                <Link to={item.link} className="block outline-hidden focus-visible:ring-2 focus-visible:ring-brand-secondary">
                                    {content}
                                </Link>
                            ) : (
                                content
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
