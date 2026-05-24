import { Users, AlertTriangle, ShieldCheck, CalendarClock, Shield } from "lucide-react";
import { TALENT_CARD, TALENT_LABEL, TALENT_TITLE } from "@/components/talent/talent-detail-shared";

export interface TeamHeroKpis {
    total: number;
    overloaded: number;
    healthy: number;
    contractEndingSoon: number;
}

function TeamKpiCard({
    icon: Icon,
    label,
    value,
    hint,
    tone = "default",
}: {
    icon: typeof Users;
    label: string;
    value: number;
    hint?: string;
    tone?: "default" | "warn" | "danger";
}) {
    const toneClass =
        tone === "danger"
            ? "text-rose-600 dark:text-rose-400"
            : tone === "warn"
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-900 dark:text-slate-100";

    return (
        <article className={`${TALENT_CARD} p-4`}>
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                    <p className={TALENT_LABEL}>{label}</p>
                    <p className={`mt-1 text-lg font-bold tabular-nums tracking-tight ${toneClass}`}>{value}</p>
                    {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
                </div>
            </div>
        </article>
    );
}

export interface TeamHeroProps {
    title: string;
    subtitle: string;
    kpis: TeamHeroKpis;
    onGlobalWatchdog: () => void;
    watchdogPending?: boolean;
}

export function TeamHero({ title, subtitle, kpis, onGlobalWatchdog, watchdogPending }: TeamHeroProps) {
    return (
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-700 dark:bg-slate-950/80">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className={TALENT_TITLE}>{title}</h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onGlobalWatchdog}
                        disabled={watchdogPending}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-950/60"
                    >
                        <Shield className="h-4 w-4" aria-hidden />
                        {watchdogPending ? "Scan en cours…" : "Lancer scan Watchdog global"}
                    </button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <TeamKpiCard icon={Users} label="Total équipe" value={kpis.total} />
                    <TeamKpiCard
                        icon={AlertTriangle}
                        label="Surchargés"
                        value={kpis.overloaded}
                        hint={kpis.overloaded > 0 ? "Allocation > 100%" : undefined}
                        tone={kpis.overloaded > 0 ? "danger" : "default"}
                    />
                    <TeamKpiCard
                        icon={ShieldCheck}
                        label="Sains"
                        value={kpis.healthy}
                        hint="Statut vert"
                        tone="default"
                    />
                    <TeamKpiCard
                        icon={CalendarClock}
                        label="Contrats < 90 j"
                        value={kpis.contractEndingSoon}
                        hint="Échéance proche"
                        tone={kpis.contractEndingSoon > 0 ? "warn" : "default"}
                    />
                </div>
            </div>
        </header>
    );
}
