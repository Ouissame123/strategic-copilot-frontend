import { useTranslation } from "react-i18next";
import { Download02, Stars01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

export type ProjectsTabId = "all" | "active" | "at-risk" | "completed" | "paused" | "cancelled";

export type ProjectsDecisionFilter = "all" | "adjust" | "stop" | "risky";

type TabItem = { id: ProjectsTabId; label: string; count: number };

export type ProjectsKpi = {
    id: "tracked" | "active" | "attention" | "stop" | "progress";
    label: string;
    value: string | number;
    hint: string;
    progressPct: number;
    barClass: string;
};

type ProjectsPageHeaderProps = {
    tab: ProjectsTabId;
    onTabChange: (id: ProjectsTabId) => void;
    tabs: TabItem[];
    linesCount: number;
    stopDecisionCount: number;
    heroSubtitle: string;
    kpis: ProjectsKpi[];
    searchQuery: string;
    onSearchChange: (value: string) => void;
    decisionFilter: ProjectsDecisionFilter;
    onDecisionFilterChange: (value: ProjectsDecisionFilter) => void;
    onExport: () => void;
    onWhatIfGlobal: () => void;
};

function formatKpiValue(value: string | number): string {
    if (typeof value === "number") {
        if (!Number.isFinite(value)) return "—";
        return Number.isInteger(value) ? String(value) : value.toFixed(1);
    }
    return value;
}

function KpiCard({ label, value, hint, progressPct, barClass }: ProjectsKpi) {
    const pct = Math.min(100, Math.max(0, progressPct));
    return (
        <div className="flex flex-col rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80">
            <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{label}</p>
            <p className="mt-2 text-display-xs font-semibold tabular-nums text-primary">{formatKpiValue(value)}</p>
            <p className="mt-1 text-xs text-tertiary">{hint}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className={cx("h-full rounded-full transition-all", barClass)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export function ProjectsPageHeader({
    tab,
    onTabChange,
    tabs,
    linesCount: _linesCount,
    stopDecisionCount: _stopDecisionCount,
    heroSubtitle,
    kpis,
    searchQuery,
    onSearchChange,
    decisionFilter,
    onDecisionFilterChange,
    onExport,
    onWhatIfGlobal,
}: ProjectsPageHeaderProps) {
    const { t } = useTranslation(["projects", "copilot", "dataCrud"]);

    return (
        <div className="space-y-6">
            {/* Hero */}
            <header className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">
                            {t("projects:eyebrow")}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h1 className="font-display text-display-xs font-semibold tracking-tight text-primary md:text-display-sm">
                                {t("projects:title")}
                            </h1>
                            <span className="rounded-full bg-utility-brand-100 px-2.5 py-0.5 text-xs font-semibold text-utility-brand-800 ring-1 ring-utility-brand-200 dark:bg-utility-brand-950/40 dark:text-utility-brand-100">
                                Manager
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-secondary">{heroSubtitle}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                        <Button color="secondary" size="md" iconLeading={Download02} onClick={onExport}>
                            Exporter
                        </Button>
                        <Button color="primary" size="md" iconLeading={Stars01} onClick={onWhatIfGlobal}>
                            What-if global
                        </Button>
                    </div>
                </div>
            </header>

            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {kpis.map((card) => (
                    <KpiCard key={card.id} {...card} />
                ))}
            </div>

            {/* Tabs */}
            <div
                className="flex flex-wrap gap-1 rounded-xl border border-secondary bg-secondary/40 p-1"
                role="tablist"
                aria-label={t("projects:table.title")}
            >
                {tabs.map((item) => {
                    const selected = tab === item.id;
                    const countTone =
                        item.id === "all"
                            ? selected
                                ? "bg-utility-brand-100 text-utility-brand-900 ring-1 ring-utility-brand-300 dark:bg-utility-brand-950/50 dark:text-utility-brand-100"
                                : "bg-utility-brand-50/80 text-utility-brand-800 dark:bg-utility-brand-950/30"
                            : item.id === "active"
                              ? selected
                                  ? "bg-success-secondary text-success-primary ring-1 ring-success-secondary"
                                  : "bg-success-primary/10 text-success-primary"
                              : item.id === "at-risk"
                                ? selected
                                    ? "bg-warning-secondary text-warning-primary ring-1 ring-warning-secondary"
                                    : "bg-warning-primary/15 text-warning-primary"
                                : item.id === "completed"
                                  ? selected
                                      ? "bg-emerald-500/20 text-emerald-800 ring-1 ring-emerald-500/40 dark:text-emerald-200"
                                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : item.id === "paused"
                                    ? selected
                                        ? "bg-amber-500/20 text-amber-800 ring-1 ring-amber-500/40 dark:text-amber-200"
                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                    : selected
                                      ? "bg-fg-quaternary/15 text-fg-secondary ring-1 ring-secondary"
                                      : "bg-secondary/80 text-tertiary";
                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={cx(
                                "flex min-w-[7rem] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                                selected
                                    ? "bg-primary text-primary shadow-xs ring-1 ring-secondary"
                                    : "text-tertiary hover:bg-primary/60 hover:text-secondary",
                            )}
                            onClick={() => onTabChange(item.id)}
                        >
                            <span>{item.label}</span>
                            <span className={cx("rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", countTone)}>
                                {item.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filter bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-3 shadow-xs ring-1 ring-secondary/80 md:flex-row md:items-center md:justify-between">
                <label className="w-full md:max-w-xs">
                    <span className="sr-only">Rechercher un projet</span>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Rechercher un projet"
                        className="block w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-tertiary shadow-xs focus:outline-none focus:ring-2 focus:ring-focus-ring"
                    />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-tertiary">Filtrer :</span>
                    {(
                        [
                            { id: "all", label: "Tous statuts" },
                            { id: "adjust", label: "Adjust" },
                            { id: "stop", label: "Stop" },
                            { id: "risky", label: "IA & risques" },
                        ] as const
                    ).map((f) => {
                        const selected = decisionFilter === f.id;
                        const tone =
                            f.id === "adjust"
                                ? selected
                                    ? "bg-warning-primary/20 text-warning-primary ring-1 ring-warning-primary/40"
                                    : "bg-warning-primary/10 text-warning-primary hover:bg-warning-primary/15"
                                : f.id === "stop"
                                  ? selected
                                      ? "bg-error-primary/20 text-error-primary ring-1 ring-error-primary/40"
                                      : "bg-error-primary/10 text-error-primary hover:bg-error-primary/15"
                                  : f.id === "risky"
                                    ? selected
                                        ? "bg-utility-brand-100 text-utility-brand-900 ring-1 ring-utility-brand-300 dark:bg-utility-brand-950/50 dark:text-utility-brand-100"
                                        : "bg-utility-brand-50 text-utility-brand-800 hover:bg-utility-brand-100 dark:bg-utility-brand-950/30 dark:text-utility-brand-200"
                                    : selected
                                      ? "bg-primary_alt text-primary ring-1 ring-secondary"
                                      : "bg-secondary/60 text-tertiary hover:bg-secondary";
                        return (
                            <button
                                key={f.id}
                                type="button"
                                className={cx(
                                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                                    tone,
                                )}
                                onClick={() => onDecisionFilterChange(f.id)}
                                aria-pressed={selected}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
