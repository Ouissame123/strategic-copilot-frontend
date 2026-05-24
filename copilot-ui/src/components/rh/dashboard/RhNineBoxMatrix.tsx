/**
 * Matrice 9-Box RH — grille 3×3 avec axes Performance / Potential et badges talents.
 */
import type { RhAnalystNineBoxCell } from "@/types/rh-analyst.types";
import { displayLabelForBoxLabel } from "@/lib/rh-analyst-nine-box";
import { RH_TEXT_MUTED, RH_TEXT_PRIMARY, RH_TEXT_SECONDARY } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

const PERFORMANCE_ROWS = ["High", "Medium", "Low"] as const;
const POTENTIAL_COLS = ["Low", "Medium", "High"] as const;

const CELL_TONE: Record<number, string> = {
    0: "bg-violet-50/90 border-violet-100 dark:bg-violet-950/25 dark:border-violet-900/50",
    1: "bg-sky-50/90 border-sky-100 dark:bg-sky-950/25 dark:border-sky-900/50",
    2: "bg-emerald-50/90 border-emerald-100 dark:bg-emerald-950/25 dark:border-emerald-900/50",
};

type RhNineBoxMatrixProps = {
    matrix: RhAnalystNineBoxCell[][];
    className?: string;
};

function cellTitle(cell: RhAnalystNineBoxCell): string {
    if (cell.box_label) return displayLabelForBoxLabel(cell.box_label);
    const parts = [cell.performance, cell.potential].filter(Boolean);
    if (parts.length) return parts.join(" · ");
    return `Case ${cell.box_index}`;
}

export function RhNineBoxMatrix({ matrix, className }: RhNineBoxMatrixProps) {
    return (
        <div className={cx("flex flex-col gap-2", className)}>
            <div className="flex gap-2">
                {/* Axe Performance ↑ */}
                <div className="flex w-10 shrink-0 flex-col justify-center gap-0">
                    <span
                        className={cx(
                            "mb-1 text-center text-[9px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400",
                        )}
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    >
                        Performance ↑
                    </span>
                    <div className="flex flex-1 flex-col justify-around py-1">
                        {PERFORMANCE_ROWS.map((label) => (
                            <span
                                key={label}
                                className={cx(
                                    "text-center text-[9px] font-semibold uppercase leading-tight text-slate-500 dark:text-slate-400",
                                )}
                                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Grille 3×3 */}
                <div className="min-w-0 flex-1">
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {matrix.map((row, ri) =>
                            row.map((cell) => {
                                const tone = CELL_TONE[ri] ?? CELL_TONE[1];
                                const title = cellTitle(cell);

                                return (
                                    <div
                                        key={cell.box_index}
                                        className={cx(
                                            "flex min-h-[100px] flex-col rounded-xl border p-2 shadow-sm",
                                            tone,
                                        )}
                                    >
                                        <div className="mb-1.5 flex items-start justify-between gap-1">
                                            <span
                                                className={cx(
                                                    "line-clamp-2 text-[9px] font-semibold uppercase leading-tight tracking-wide",
                                                    RH_TEXT_SECONDARY,
                                                )}
                                                title={title}
                                            >
                                                {title}
                                            </span>
                                            <span
                                                className={cx(
                                                    "shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums dark:bg-slate-900/60",
                                                    RH_TEXT_PRIMARY,
                                                )}
                                            >
                                                {cell.talents.length}
                                            </span>
                                        </div>
                                        <div className="flex flex-1 flex-wrap content-start gap-1 overflow-y-auto max-h-[120px]">
                                            {cell.talents.length === 0 ? (
                                                <span className={cx("text-[10px] italic", RH_TEXT_MUTED)}>—</span>
                                            ) : (
                                                cell.talents.map((t) => (
                                                    <span
                                                        key={t.talent_id ?? `${t.talent_name}-${t.box_index}`}
                                                        className={cx(
                                                            "inline-flex max-w-full truncate rounded-md border border-white/60 bg-white/90 px-1.5 py-0.5 text-[10px] font-medium shadow-sm dark:border-slate-700 dark:bg-slate-900/80",
                                                            RH_TEXT_PRIMARY,
                                                        )}
                                                        title={t.talent_name}
                                                    >
                                                        {t.talent_name}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            }),
                        )}
                    </div>

                    {/* Axe Potential → */}
                    <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2">
                        {POTENTIAL_COLS.map((label) => (
                            <span
                                key={label}
                                className={cx("text-center text-[9px] font-semibold uppercase", RH_TEXT_MUTED)}
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                    <p className={cx("mt-1 text-center text-[9px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400")}>
                        Potential →
                    </p>
                </div>
            </div>
        </div>
    );
}
