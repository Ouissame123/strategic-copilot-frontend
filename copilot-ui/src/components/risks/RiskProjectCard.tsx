import { Link } from "react-router";
import { ExternalLink, Radar, Shield } from "lucide-react";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";
import type { RiskLeaderboardRow } from "./risks-shared";
import { RISK_CARD, scoreColorClass } from "./risks-shared";

const DRIVER_LABELS: Record<string, string> = {
    fragility_score: "Fragilité",
    anxiety_pulse: "Anxiété",
    chronic_overload_score: "Surcharge",
    chronic_overload: "Surcharge",
    critical_skills_gap_score: "Skill gap",
    key_talent_dependency_score: "Dépendance",
    skills_fit: "Compétences",
};

function MiniRadarSvg({ drivers }: { drivers: Record<string, number> }) {
    const entries = Object.entries(drivers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
    const labels =
        entries.length >= 4
            ? entries.map(([k]) => DRIVER_LABELS[k] ?? k)
            : ["Charge", "Skills", "Dépend.", "Fragilité"];
    const values =
        entries.length >= 1
            ? entries.map(([, v]) => Math.min(1, Math.max(0, v / 10)))
            : [0.5, 0.4, 0.35, 0.3];

    const cx = 36;
    const cy = 36;
    const R = 28;
    const angleStep = (Math.PI * 2) / 4;

    const point = (i: number, scale: number) => {
        const a = -Math.PI / 2 + i * angleStep;
        return { x: cx + Math.cos(a) * R * scale, y: cy + Math.sin(a) * R * scale };
    };

    const grid = [0.35, 0.65, 1].map((s) => {
        const pts = [0, 1, 2, 3].map((i) => point(i, s));
        return `${pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")} Z`;
    });

    const dataPts = values.map((v, i) => point(i, v));
    const dataD = `${dataPts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")} Z`;

    return (
        <svg viewBox="0 0 72 72" className="size-16 shrink-0" aria-hidden>
            {grid.map((d, i) => (
                <path key={i} d={d} fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={0.75} />
            ))}
            {[0, 1, 2, 3].map((i) => {
                const p = point(i, 1);
                return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={0.75} />;
            })}
            <path d={dataD} fill="rgba(124,58,237,0.2)" className="stroke-violet-500" strokeWidth={1.5} />
        </svg>
    );
}

type RiskProjectCardProps = {
    row: RiskLeaderboardRow;
    index: number;
    scanPending?: boolean;
    onScan: (projectId: string) => void;
};

export function RiskProjectCard({ row, index, scanPending, onScan }: RiskProjectCardProps) {
    const pid = row.project_id ?? "";
    const drivers = row.drivers ?? {};
    const topDrivers = Object.entries(drivers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([k]) => DRIVER_LABELS[k] ?? k);
    const rl = (row.risk_level ?? "").toLowerCase();
    const levelBadge =
        rl === "critical" || rl === "stop"
            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
            : rl === "high" || rl === "adjust"
              ? "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200";

    return (
        <article className={cx(RISK_CARD, "flex flex-col gap-3 p-4 hover:shadow-md")}>
            <div className="flex items-start gap-3">
                <MiniRadarSvg drivers={drivers} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-900 dark:text-slate-50">{row.project_name ?? "Projet"}</h3>
                        {row.risk_score != null ? (
                            <span className={cx("text-sm font-bold tabular-nums", scoreColorClass(row.risk_score))}>
                                {Number(row.risk_score).toFixed(1)}/10
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                        <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", levelBadge)}>{row.risk_level ?? "—"}</span>
                        {topDrivers.map((d) => (
                            <span
                                key={d}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                                {d}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {pid ? (
                    <Link
                        to={managerProjectsOpenModalPath(pid)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <ExternalLink className="size-3.5" aria-hidden />
                        Ouvrir
                    </Link>
                ) : null}
                <button
                    type="button"
                    disabled={!pid || scanPending}
                    onClick={() => pid && onScan(pid)}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
                >
                    <Shield className="size-3.5" aria-hidden />
                    Scan Watchdog
                </button>
            </div>
            <span className="sr-only">Projet {index + 1}</span>
        </article>
    );
}

export function RiskProjectGrid({
    rows,
    scanPending,
    onScan,
}: {
    rows: RiskLeaderboardRow[];
    scanPending?: boolean;
    onScan: (projectId: string) => void;
}) {
    if (!rows.length) return null;
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2">
                <Radar className="size-4 text-violet-600 dark:text-violet-400" aria-hidden />
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Top projets à risque</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                {rows.map((row, idx) => (
                    <RiskProjectCard key={row.project_id ?? `row-${idx}`} row={row} index={idx} scanPending={scanPending} onScan={onScan} />
                ))}
            </div>
        </section>
    );
}
