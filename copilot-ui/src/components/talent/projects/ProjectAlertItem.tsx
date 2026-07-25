import { AlertTriangle, Gauge, GitBranch, Zap } from "lucide-react";
import { cx } from "@/utils/cx";

export type ProjectAlertItemData = {
    id: string;
    risk_type: string;
    severity: "critical" | "high" | "medium" | "low";
    severity_label: string;
    message: string;
    impact_area: string | null;
};

type ProjectAlertItemProps = {
    alert: ProjectAlertItemData;
};

const IMPACT_AREA_LABELS: Record<string, string> = {
    capacity: "Capacité",
    conflict: "Conflit",
};

function translateImpactArea(raw: string | null): string | null {
    if (!raw) return null;
    const key = raw.trim().toLowerCase();
    return IMPACT_AREA_LABELS[key] ?? raw;
}

function AlertIcon({ riskType }: { riskType: string }) {
    const key = riskType.trim().toLowerCase();
    const className = "size-4 shrink-0 text-amber-600 dark:text-amber-400";
    if (key.includes("capacity") || key.includes("capacite") || key.includes("capacité")) {
        return <Gauge className={className} aria-hidden />;
    }
    if (key.includes("conflict") || key.includes("conflit") || key.includes("branch")) {
        return <GitBranch className={className} aria-hidden />;
    }
    if (
        key.includes("zap") ||
        key.includes("overload") ||
        key.includes("surcharge") ||
        key.includes("collision")
    ) {
        return <Zap className={className} aria-hidden />;
    }
    return <AlertTriangle className={className} aria-hidden />;
}

function severityBadgeClass(severity: ProjectAlertItemData["severity"]): string {
    switch (severity) {
        case "critical":
        case "high":
            return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/50";
        case "medium":
            return "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/60";
        default:
            return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-800";
    }
}

export function ProjectAlertItem({ alert }: ProjectAlertItemProps) {
    const impactLabel = translateImpactArea(alert.impact_area) ?? translateImpactArea(alert.risk_type);

    return (
        <li
            className={cx(
                "flex items-start gap-3 border-l-[3px] border-amber-400 bg-amber-50 px-3 py-2.5",
                "dark:border-amber-500 dark:bg-amber-950/30",
            )}
        >
            <span className="mt-0.5">
                <AlertIcon riskType={alert.risk_type || alert.impact_area || ""} />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-primary">{alert.message}</p>
                        {impactLabel ? <p className="mt-0.5 text-xs text-tertiary">{impactLabel}</p> : null}
                    </div>
                    <span
                        className={cx(
                            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                            severityBadgeClass(alert.severity),
                        )}
                    >
                        {alert.severity_label}
                    </span>
                </div>
            </div>
        </li>
    );
}
