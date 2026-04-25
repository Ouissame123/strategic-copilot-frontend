import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchLg } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { getDecisionConfig } from "@/utils/decisionConfig";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useDecisionLog, type DecisionLogEntry, type DecisionType } from "@/hooks/use-decision-log";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { useAuth } from "@/providers/auth-provider";
import { DECISION_LOG_PREVIEW_ENTRIES } from "@/constants/decision-log-preview-data";
import { NativeSelect } from "@/components/base/select/select-native";
import { cx } from "@/utils/cx";

type DecisionTab = "all" | DecisionType;

function formatPct01(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return "—";
    if (n >= 0 && n <= 1) return `${Math.round(n * 100)}%`;
    return n.toFixed(1);
}

function formatScore(n: number): string {
    return Number.isFinite(n) ? n.toFixed(1) : "—";
}

function downloadCsv(filename: string, rows: DecisionLogEntry[]) {
    const headers = ["date", "project", "decision", "viability", "confidence", "health", "author", "explanation"];
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [headers.join(",")];
    for (const e of rows) {
        lines.push(
            [
                esc(e.date),
                esc(e.project_name?.trim() || e.project_id || ""),
                esc(e.decision),
                esc(String(e.score)),
                esc(e.confidence != null ? String(e.confidence) : ""),
                esc(e.health_score != null ? String(e.health_score) : ""),
                esc(e.author?.trim() || ""),
                esc(e.justification || ""),
            ].join(","),
        );
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function KpiBar({ pct, className }: { pct: number; className: string }) {
    const w = Math.min(100, Math.max(0, pct));
    return (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-utility-gray-100 dark:bg-secondary">
            <div className={cx("h-full rounded-full transition-[width]", className)} style={{ width: `${w}%` }} />
        </div>
    );
}

function DecisionLogGhostPreview() {
    const { t } = useTranslation("decisionLog");
    return (
        <div className="mt-8 border-t border-secondary pt-8">
            <p className="text-center text-sm italic text-quaternary">{t("ui.ghostSectionTitle")}</p>
            <div className="relative mt-6 pl-8">
                <div className="absolute bottom-2 left-[11px] top-2 w-px bg-secondary" aria-hidden />
                {[0, 1].map((i) => (
                    <div key={i} className="relative pb-8 last:pb-0">
                        <span
                            className="absolute left-0 top-1 flex size-[22px] items-center justify-center rounded-full border-2 border-primary bg-primary ring-2 ring-secondary"
                            aria-hidden
                        >
                            <span className={cx("size-2.5 rounded-full", i === 0 ? "bg-utility-warning-500" : "bg-utility-success-500")} />
                        </span>
                        <div
                            className={cx(
                                "ml-2 rounded-xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/60",
                                i === 0 ? "border-l-[3px] border-l-utility-warning-500" : "border-l-[3px] border-l-utility-success-500",
                            )}
                        >
                            <div className="h-4 w-40 max-w-[70%] animate-pulse rounded bg-secondary" />
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="h-6 w-16 rounded-full bg-secondary" />
                                <span className="h-6 w-20 rounded-full bg-secondary" />
                            </div>
                            <div className="mt-3 space-y-2">
                                <div className="h-3 w-full rounded bg-secondary/80" />
                                <div className="h-3 w-[80%] rounded bg-secondary/60" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DecisionLogPage() {
    const { t, i18n } = useTranslation(["decisionLog", "projects"]);
    const paths = useWorkspacePaths();
    const { user } = useAuth();
    const { entries, isLoading, error, errorStatus, retry } = useDecisionLog();
    useCopilotPage("none", t("decisionLog:title"));

    const locale =
        i18n.language.startsWith("ar") ? "ar-EG" : i18n.language.startsWith("en") ? "en-US" : "fr-FR";

    const isManager = user?.role === "manager";
    const [previewFilled, setPreviewFilled] = useState(false);
    const [tab, setTab] = useState<DecisionTab>("all");
    const [search, setSearch] = useState("");
    const [projectFilter, setProjectFilter] = useState<string>("all");
    const [stopConfirmId, setStopConfirmId] = useState<string | null>(null);

    const hasApiData = entries.length > 0;
    const sourceEntries: DecisionLogEntry[] = useMemo(() => {
        if (hasApiData) return entries;
        if (previewFilled) return DECISION_LOG_PREVIEW_ENTRIES;
        return [];
    }, [entries, hasApiData, previewFilled]);

    const isUiPreviewDataset = !hasApiData && previewFilled;

    const projectOptions = useMemo(() => {
        const m = new Map<string, string>();
        for (const e of sourceEntries) {
            const id = e.project_id?.trim();
            if (!id) continue;
            const label = e.project_name?.trim() || id;
            if (!m.has(id)) m.set(id, label);
        }
        return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], locale));
    }, [sourceEntries, locale]);

    const filteredTimeline = useMemo(() => {
        let list = [...sourceEntries];
        if (tab !== "all") list = list.filter((e) => e.decision === tab);
        if (projectFilter !== "all") list = list.filter((e) => (e.project_id ?? "").trim() === projectFilter);
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (e) =>
                    (e.project_name ?? "").toLowerCase().includes(q) ||
                    (e.justification ?? "").toLowerCase().includes(q) ||
                    (e.project_id ?? "").toLowerCase().includes(q),
            );
        }
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sourceEntries, tab, projectFilter, search]);

    const kpi = useMemo(() => {
        const list = sourceEntries;
        const total = list.length;
        const c = list.filter((x) => x.decision === "Continue").length;
        const a = list.filter((x) => x.decision === "Adjust").length;
        const s = list.filter((x) => x.decision === "Stop").length;
        return { total, c, a, s };
    }, [sourceEntries]);

    const exportCsv = useCallback(() => {
        const stamp = new Date().toISOString().slice(0, 10);
        downloadCsv(`decision-log-${stamp}.csv`, filteredTimeline);
    }, [filteredTimeline]);


    if (isLoading) {
        return <LoadingState label={t("decisionLog:loading")} size="md" />;
    }

    if (error) {
        if (errorStatus === 404) {
            return (
                <div className="space-y-6">
                    <header className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                        <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("decisionLog:eyebrow")}</p>
                        <h1 className="mt-1 text-display-xs font-semibold text-primary md:text-display-sm">{t("decisionLog:title")}</h1>
                        <p className="mt-2 text-sm text-tertiary">{t("decisionLog:subtitle")}</p>
                    </header>
                    <div className="rounded-2xl border border-secondary bg-primary p-6 shadow-xs ring-1 ring-secondary/80 md:p-8">
                        <EmptyState size="md">
                            <EmptyState.Content>
                                <EmptyState.Title>Journal indisponible</EmptyState.Title>
                                <EmptyState.Description>
                                    Le journal des décisions n’est pas accessible pour le moment (service non trouvé ou non
                                    déployé). Réessayez plus tard ou contactez l’administrateur.
                                </EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button color="secondary" size="sm" onClick={() => retry()}>
                                    {t("decisionLog:errorRetry")}
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                <header className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("decisionLog:eyebrow")}</p>
                    <h1 className="mt-1 text-display-xs font-semibold text-primary md:text-display-sm">{t("decisionLog:title")}</h1>
                </header>
                <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                    <ErrorState title={t("decisionLog:errorTitle")} message={error} onRetry={retry} retryLabel={t("decisionLog:errorRetry")} />
                </div>
            </div>
        );
    }

    const showFilledExperience = sourceEntries.length > 0;
    const showEmptyExperience = !hasApiData && !previewFilled;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <header className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">{t("decisionLog:ui.managerEyebrow")}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 gap-y-1">
                        <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">{t("decisionLog:title")}</h1>
                        {isManager ? (
                            <Badge type="pill-color" size="sm" color="brand">
                                {t("decisionLog:ui.managerBadge")}
                            </Badge>
                        ) : null}
                    </div>
                    <p className="mt-2 max-w-3xl text-sm text-tertiary">{t("decisionLog:ui.subtitleRich")}</p>
                </header>
                <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
                    {!hasApiData ? (
                        <Button
                            color="secondary"
                            size="sm"
                            onClick={() => setPreviewFilled((v) => !v)}
                            aria-pressed={previewFilled}
                        >
                            {previewFilled ? t("decisionLog:ui.toggleShowEmpty") : t("decisionLog:ui.toggleShowFilled")}
                        </Button>
                    ) : null}
                    {showFilledExperience ? (
                        <>
                            <Button color="secondary" size="sm" onClick={exportCsv}>
                                {t("decisionLog:ui.exportCsv")}
                            </Button>
                            <Button color="primary" size="sm" href={paths.projects}>
                                {t("decisionLog:ui.launchAnalysis")}
                            </Button>
                        </>
                    ) : (
                        <Button color="primary" size="sm" href={paths.projects}>
                            {t("decisionLog:ui.launchAnalysisPlus")}
                        </Button>
                    )}
                </div>
            </div>

            {isUiPreviewDataset ? (
                <div
                    className="rounded-xl border border-dashed border-brand-secondary/40 bg-brand-secondary/[0.06] px-4 py-3 text-center text-sm text-secondary"
                    role="status"
                >
                    {t("decisionLog:ui.previewBanner")}
                </div>
            ) : null}

            {/* KPI */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                    <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("decisionLog:ui.kpiTotal")}</p>
                    <p className="mt-2 text-display-xs font-semibold tabular-nums text-primary">{kpi.total}</p>
                    <KpiBar
                        pct={kpi.total ? 100 : 0}
                        className={kpi.total ? "bg-utility-gray-400" : "bg-transparent"}
                    />
                    <p className="mt-2 text-xs text-tertiary">{kpi.total === 0 ? t("decisionLog:ui.kpiEmptyFooter") : "—"}</p>
                </div>
                <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                    <p className="text-xs font-semibold uppercase tracking-wide text-success-primary">{t("decisionLog:ui.kpiContinue")}</p>
                    <p className="mt-2 text-display-xs font-semibold tabular-nums text-primary">{kpi.c}</p>
                    <KpiBar pct={kpi.total ? (kpi.c / kpi.total) * 100 : 0} className="bg-utility-success-500" />
                    <p className="mt-2 text-xs text-tertiary">{kpi.total ? `${Math.round((kpi.c / kpi.total) * 100)}%` : "—"}</p>
                </div>
                <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                    <p className="text-xs font-semibold uppercase tracking-wide text-warning-primary">{t("decisionLog:ui.kpiAdjust")}</p>
                    <p className="mt-2 text-display-xs font-semibold tabular-nums text-primary">{kpi.a}</p>
                    <KpiBar pct={kpi.total ? (kpi.a / kpi.total) * 100 : 0} className="bg-utility-warning-500" />
                    <p className="mt-2 text-xs text-tertiary">{kpi.total ? `${Math.round((kpi.a / kpi.total) * 100)}%` : "—"}</p>
                </div>
                <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                    <p className="text-xs font-semibold uppercase tracking-wide text-error-primary">{t("decisionLog:ui.kpiStop")}</p>
                    <p className="mt-2 text-display-xs font-semibold tabular-nums text-primary">{kpi.s}</p>
                    <KpiBar pct={kpi.total ? (kpi.s / kpi.total) * 100 : 0} className="bg-utility-error-500" />
                    <p className="mt-2 text-xs text-tertiary">{kpi.total ? `${Math.round((kpi.s / kpi.total) * 100)}%` : "—"}</p>
                </div>
            </div>

            {showEmptyExperience ? (
                <>
                    <div className="rounded-2xl border border-secondary bg-primary p-6 shadow-xs ring-1 ring-secondary/80 md:p-8">
                        <EmptyState size="md">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon color="gray" icon={SearchLg} />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>{t("decisionLog:emptyTitle")}</EmptyState.Title>
                                <EmptyState.Description>{t("decisionLog:emptyDescription")}</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button color="primary" size="sm" href={paths.projects}>
                                    {t("decisionLog:emptyCta")}
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                    <DecisionLogGhostPreview />
                </>
            ) : null}

            {showFilledExperience ? (
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80 md:flex-row md:flex-wrap md:items-end md:gap-3">
                        <div className="flex flex-wrap gap-1 rounded-lg bg-secondary/50 p-1 dark:bg-secondary/30">
                            {(
                                [
                                    ["all", t("decisionLog:ui.tabAll")] as const,
                                    ["Continue", t("decisionLog:decision.Continue")] as const,
                                    ["Adjust", t("decisionLog:decision.Adjust")] as const,
                                    ["Stop", t("decisionLog:decision.Stop")] as const,
                                ] as const
                            ).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setTab(key as DecisionTab)}
                                    className={cx(
                                        "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                                        tab === key
                                            ? "bg-primary text-primary shadow-xs ring-1 ring-secondary"
                                            : "text-tertiary hover:text-secondary",
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <label className="min-w-[12rem] flex-1 text-sm">
                            <span className="mb-1 block text-quaternary">{t("decisionLog:ui.searchPlaceholder")}</span>
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-primary outline-none ring-0"
                                placeholder={t("decisionLog:ui.searchPlaceholder")}
                            />
                        </label>
                        <div className="min-w-[12rem] flex-1">
                            <NativeSelect
                                label={t("decisionLog:ui.filterProject")}
                                value={projectFilter}
                                onChange={(e) => setProjectFilter(e.target.value)}
                                options={[
                                    { value: "all", label: t("decisionLog:ui.filterAllProjects") },
                                    ...projectOptions.map(([id, lab]) => ({ value: id, label: lab })),
                                ]}
                            />
                        </div>
                    </div>

                    {filteredTimeline.length === 0 ? (
                        <p className="rounded-xl border border-secondary bg-primary px-4 py-8 text-center text-sm text-tertiary">
                            {t("decisionLog:ui.noFilterResults")}
                        </p>
                    ) : (
                        <div className="relative pl-2 md:pl-4">
                            <div className="absolute bottom-4 left-[19px] top-4 w-px bg-secondary md:left-[23px]" aria-hidden />
                            <ul className="space-y-6">
                                {filteredTimeline.map((entry) => {
                                    const config = getDecisionConfig(entry.decision);
                                    const projectLabel =
                                        entry.project_name?.trim() ||
                                        (entry.project_id ? `${entry.project_id.slice(0, 8)}…` : "—");
                                    const href = entry.project_id?.trim() ? paths.project(entry.project_id.trim()) : null;
                                    const whatIfHref = href ? `${href}#project-what-if` : null;
                                    const dotClass =
                                        entry.decision === "Continue"
                                            ? "bg-utility-success-500 ring-utility-success-200"
                                            : entry.decision === "Stop"
                                              ? "bg-utility-error-500 ring-utility-error-200"
                                              : "bg-utility-warning-500 ring-utility-warning-200";
                                    const borderClass =
                                        entry.decision === "Continue"
                                            ? "border-l-utility-success-500"
                                            : entry.decision === "Stop"
                                              ? "border-l-utility-error-500"
                                              : "border-l-utility-warning-500";

                                    return (
                                        <li key={entry.id} className="relative flex gap-4 pl-8 md:pl-10">
                                            <span
                                                className={cx(
                                                    "absolute left-0 top-5 size-3 rounded-full ring-2 md:top-6 md:size-3.5",
                                                    dotClass,
                                                )}
                                                aria-hidden
                                            />
                                            <article
                                                className={cx(
                                                    "min-w-0 flex-1 rounded-2xl border border-secondary border-l-[3px] bg-primary p-5 shadow-xs ring-1 ring-secondary/80",
                                                    borderClass,
                                                )}
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <h2 className="text-base font-semibold text-primary">{projectLabel}</h2>
                                                        <p className="mt-1 text-xs text-quaternary">
                                                            {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                                                                new Date(entry.date),
                                                            )}
                                                        </p>
                                                    </div>
                                                    <Badge type="pill-color" size="sm" color={config.badgeColor}>
                                                        {t(`decisionLog:decision.${entry.decision}`)}
                                                    </Badge>
                                                </div>
                                                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                                    <div>
                                                        <dt className="text-xs text-quaternary">{t("decisionLog:ui.fieldViability")}</dt>
                                                        <dd className="font-medium tabular-nums text-primary">{formatScore(entry.score)}</dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-xs text-quaternary">{t("decisionLog:ui.fieldConfidence")}</dt>
                                                        <dd className="font-medium tabular-nums text-primary">{formatPct01(entry.confidence)}</dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-xs text-quaternary">{t("decisionLog:ui.fieldHealth")}</dt>
                                                        <dd className="font-medium tabular-nums text-primary">
                                                            {entry.health_score != null ? formatScore(entry.health_score) : "—"}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-xs text-quaternary">{t("decisionLog:ui.fieldAuthor")}</dt>
                                                        <dd className="truncate font-medium text-primary">{entry.author?.trim() || "—"}</dd>
                                                    </div>
                                                </dl>
                                                <div className="mt-4">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">
                                                        {t("decisionLog:ui.fieldExplanation")}
                                                    </p>
                                                    <p className="mt-1 text-sm text-secondary">{entry.justification?.trim() || "—"}</p>
                                                </div>
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {href ? (
                                                        <Button size="sm" color="secondary" href={href}>
                                                            {t("decisionLog:ui.actionOpenProject")}
                                                        </Button>
                                                    ) : null}
                                                    {whatIfHref ? (
                                                        <Button size="sm" color="secondary" href={whatIfHref}>
                                                            {t("decisionLog:ui.actionWhatIf")}
                                                        </Button>
                                                    ) : null}
                                                    {entry.decision === "Stop" && href ? (
                                                        <Button
                                                            size="sm"
                                                            color="primary"
                                                            onClick={() => {
                                                                if (stopConfirmId === entry.id) {
                                                                    setStopConfirmId(null);
                                                                    window.location.href = href;
                                                                    return;
                                                                }
                                                                setStopConfirmId(entry.id);
                                                            }}
                                                        >
                                                            {stopConfirmId === entry.id
                                                                ? t("decisionLog:ui.actionConfirmStopValidate")
                                                                : t("decisionLog:ui.actionConfirmStop")}
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </article>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
