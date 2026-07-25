import type { TalentDashboard } from "@/types/talent-dashboard";
import { HEALTH_TONES, toneClasses } from "./talent-dashboard-tones";
import { cx } from "@/utils/cx";

type DashboardHeaderProps = {
    health?: TalentDashboard["health"];
};

export function dashboardHeaderSubtitle(header: NonNullable<TalentDashboard["header"]>): string {
    const parts = [header.job_title, header.department, header.seniority_label].filter(Boolean);
    return parts.join(" · ");
}

export function DashboardHeader({ health }: DashboardHeaderProps) {
    const healthTone = health?.label ? HEALTH_TONES[health.label] : "slate";
    const healthCls = toneClasses(healthTone);

    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            {health?.has_data && health.score != null ? (
                <span
                    className={cx(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums",
                        healthCls.badge,
                    )}
                >
                    {health.score}/10
                    <span className="font-medium">· {health.label}</span>
                </span>
            ) : null}
        </div>
    );
}
