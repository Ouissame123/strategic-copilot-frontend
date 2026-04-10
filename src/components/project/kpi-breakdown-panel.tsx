import type { ProjectKpi } from "@/hooks/use-project";
import { cx } from "@/utils/cx";

export interface KpiBreakdownPanelProps {
    kpi: ProjectKpi | null;
    className?: string;
}

const rows: { key: keyof ProjectKpi; label: string; unit?: string }[] = [
    { key: "progress_pct", label: "Avancement reel", unit: "%" },
    { key: "delay_days", label: "Retard planning", unit: " jours" },
    { key: "capacity_load_pct", label: "Charge vs capacite", unit: "%" },
    { key: "skills_fit_score", label: "Skills fit score", unit: "/10" },
];

export function KpiBreakdownPanel({ kpi, className }: KpiBreakdownPanelProps) {
    if (!kpi) return null;

    return (
        <section className={cx("rounded-xl border border-secondary bg-primary p-5 shadow-xs md:p-6", className)}>
            <h2 className="text-lg font-semibold text-primary">KPI detailles</h2>
            <p className="mt-1 text-sm text-tertiary">Indicateurs operationnels par agent.</p>
            <ul className="mt-6 space-y-3">
                {rows.map(({ key, label, unit }) => {
                    const value = kpi[key];
                    const num = typeof value === "number" ? value : 0;
                    const isWarning =
                        (key === "delay_days" && num > 0) ||
                        (key === "capacity_load_pct" && num > 110) ||
                        (key === "progress_pct" && num < 30);
                    return (
                        <li key={key} className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
                            <span className="text-sm font-medium text-secondary">{label}</span>
                            <span className={cx("text-sm font-semibold", isWarning ? "text-warning-primary" : "text-primary")}>
                                {num}
                                {unit ?? ""}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
