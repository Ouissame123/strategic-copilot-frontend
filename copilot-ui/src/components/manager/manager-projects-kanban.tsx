import type { TFunction } from "i18next";
import type { ProjectListItem } from "@/types/api.types";

function normalizeDecisionRaw(project: ProjectListItem): string {
    return String(project.latest_decision ?? "").trim();
}

export type KanbanColumnKey = "Continue" | "Adjust" | "Stop" | "unscored";

export function projectKanbanColumn(project: ProjectListItem): KanbanColumnKey {
    const raw = normalizeDecisionRaw(project).toLowerCase();
    if (raw === "continue" || raw === "proceed") return "Continue";
    if (raw === "adjust") return "Adjust";
    if (raw === "stop" || raw === "reject") return "Stop";
    return "unscored";
}

function coerceFiniteNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function activeAlertsCountStrict(project: ProjectListItem): number {
    return Math.round(coerceFiniteNumber(project.active_alerts_count) ?? 0);
}

function KanbanCard({
    project,
    onOpen,
    t,
}: {
    project: ProjectListItem;
    onOpen: () => void;
    t: TFunction<"common", undefined>;
}) {
    const milestone = project.milestone_at ? new Date(project.milestone_at) : null;
    const validMilestone = milestone && !Number.isNaN(milestone.getTime()) ? milestone : null;
    const daysToMilestone = validMilestone ? Math.floor((validMilestone.getTime() - Date.now()) / 86_400_000) : null;
    const progress = project.progress_pct;
    const progressNum =
        progress != null && String(progress).trim() !== "" && !Number.isNaN(Number(progress)) ? Number(progress) : null;
    const viability = coerceFiniteNumber(project.latest_viability_score);
    const team = Math.round(coerceFiniteNumber(project.team_size) ?? 0);
    const alerts = activeAlertsCountStrict(project);

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen();
                }
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md"
        >
            <h4 className="mb-1 line-clamp-2 text-sm font-medium text-primary">{project.name}</h4>
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-secondary">
                <span>P{Math.round(coerceFiniteNumber(project.priority) ?? 0)}</span>
                {viability != null ? (
                    <span className="font-semibold tabular-nums text-fg-primary">{viability.toFixed(1)}/10</span>
                ) : null}
            </div>
            {progressNum != null ? (
                <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-secondary_subtle">
                    <div className="h-full bg-brand-solid" style={{ width: `${Math.min(100, Math.max(0, progressNum))}%` }} />
                </div>
            ) : null}
            <div className="flex items-center justify-between text-[10px] text-secondary">
                {daysToMilestone != null ? (
                    <span
                        className={`tabular-nums ${
                            daysToMilestone < 0
                                ? "font-medium text-red-600 dark:text-red-400"
                                : daysToMilestone < 30
                                  ? "text-amber-700 dark:text-amber-300"
                                  : ""
                        }`}
                    >
                        {daysToMilestone < 0
                            ? t("managerWorkspace.projects.kanbanDaysLate", { count: Math.abs(daysToMilestone) })
                            : t("managerWorkspace.projects.kanbanJMinus", { days: daysToMilestone })}
                    </span>
                ) : (
                    <span />
                )}
                <div className="flex items-center gap-2">
                    {alerts > 0 ? <span className="font-medium text-red-600 dark:text-red-400">⚠ {alerts}</span> : null}
                    <span>👥 {team}</span>
                </div>
            </div>
        </article>
    );
}

export function ManagerProjectsKanbanView({
    projects,
    onOpenProject,
    t,
}: {
    projects: ProjectListItem[];
    onOpenProject: (projectId: string) => void;
    t: TFunction<"common", undefined>;
}) {
    const columns: {
        key: KanbanColumnKey;
        labelKey: "kanbanColContinue" | "kanbanColAdjust" | "kanbanColStop" | "kanbanColUnscored";
        panelBg: string;
        badge: string;
    }[] = [
        {
            key: "Continue",
            labelKey: "kanbanColContinue",
            panelBg: "bg-emerald-50/60 dark:bg-emerald-950/20",
            badge: "border border-emerald-200/80 bg-white/90 text-emerald-800 tabular-nums dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200",
        },
        {
            key: "Adjust",
            labelKey: "kanbanColAdjust",
            panelBg: "bg-amber-50/55 dark:bg-amber-950/20",
            badge: "border border-amber-200/80 bg-white/90 text-amber-900 tabular-nums dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100",
        },
        {
            key: "Stop",
            labelKey: "kanbanColStop",
            panelBg: "bg-rose-50/55 dark:bg-rose-950/20",
            badge: "border border-rose-200/80 bg-white/90 text-rose-800 tabular-nums dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-100",
        },
        {
            key: "unscored",
            labelKey: "kanbanColUnscored",
            panelBg: "bg-slate-50/80 dark:bg-slate-900/30",
            badge: "border border-slate-200 bg-white/90 text-slate-600 tabular-nums dark:border-slate-600/50 dark:bg-slate-900/50 dark:text-slate-300",
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3 lg:h-[70vh] lg:max-h-[70vh] lg:min-h-0 lg:grid-cols-4">
            {columns.map((col) => {
                const items = projects.filter((p) => projectKanbanColumn(p) === col.key);
                return (
                    <section
                        key={col.key}
                        className={`flex h-full min-h-0 max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-slate-200 ${col.panelBg} lg:max-h-none`}
                    >
                        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/70 px-3 py-2.5 dark:border-slate-700/60">
                            <h3 className="text-sm font-semibold text-primary">{t(`managerWorkspace.projects.${col.labelKey}`)}</h3>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${col.badge}`}>{items.length}</span>
                        </header>
                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
                            {items.length === 0 ? (
                                <p className="py-3 text-center text-xs italic text-tertiary">{t("managerWorkspace.projects.kanbanEmptyColumn")}</p>
                            ) : (
                                items.map((p) => (
                                    <KanbanCard key={p.id} project={p} onOpen={() => onOpenProject(p.id)} t={t} />
                                ))
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
