import { useMemo, useState } from "react";
import { Link } from "react-router";
import { X, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
    filterNineBoxTalentsByBoxLabel,
    nineBoxCellBackgroundStyle,
    parseNineBoxTalentEntries,
    type NineBoxGridCell,
} from "@/lib/nine-box-dashboard";
import { cx } from "@/utils/cx";

type NineBoxInteractiveProps = {
    grid: NineBoxGridCell[][] | null;
    nineBoxMatrix: unknown;
    className?: string;
};

type DrawerState = { selectedBoxLabel: string; title: string } | null;

export function NineBoxInteractive({ grid, nineBoxMatrix, className }: NineBoxInteractiveProps) {
    const { t } = useTranslation("common");
    const [drawer, setDrawer] = useState<DrawerState>(null);

    const allTalentEntries = useMemo(() => parseNineBoxTalentEntries(nineBoxMatrix), [nineBoxMatrix]);

    const drawerTalents = useMemo(() => {
        if (!drawer) return [];
        const selectedBoxLabel = drawer.selectedBoxLabel;
        const talents = filterNineBoxTalentsByBoxLabel(nineBoxMatrix, selectedBoxLabel);

        return talents;
    }, [drawer, nineBoxMatrix, allTalentEntries]);

    if (!grid) return null;

    const flat = grid.flat();
    const maxCount = Math.max(1, ...flat.map((c) => (c.count == null ? 0 : c.count)));

    return (
        <>
            <div className={cx("grid grid-cols-3 gap-2 sm:gap-2.5", className)}>
                {grid.map((row, ri) =>
                    row.map((cell, ci) => {
                        const n = cell.count ?? 0;
                        const ratio = maxCount > 0 ? n / maxCount : 0;
                        const isStructural = cell.isStructuralSlot === true;
                        const selectedBoxLabel = cell.backendBoxLabel ?? null;
                        const canOpen = !isStructural && selectedBoxLabel != null && selectedBoxLabel.length > 0;
                        const countDisplay = cell.count == null ? "—" : String(cell.count);

                        const inner = (
                            <>
                                {!isStructural ? (
                                    <span className="text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-600 dark:text-slate-400">
                                        {cell.label}
                                    </span>
                                ) : null}
                                <span className="flex flex-1 items-center justify-center text-xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
                                    {isStructural ? "—" : countDisplay}
                                </span>
                            </>
                        );

                        return (
                            <div
                                key={`${ri}-${ci}`}
                                className={cx(
                                    "flex min-h-[72px] flex-col rounded-xl border border-slate-200 p-1.5 shadow-sm ring-1 ring-black/[0.03] dark:border-slate-700 dark:ring-white/[0.05]",
                                    canOpen && "transition hover:ring-2 hover:ring-indigo-400/40 dark:hover:ring-indigo-500/30",
                                )}
                                style={nineBoxCellBackgroundStyle(cell.tone, ratio)}
                            >
                                {canOpen ? (
                                    <button
                                        type="button"
                                        className="flex h-full min-h-0 w-full flex-1 flex-col gap-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:focus-visible:ring-indigo-400/50"
                                        onClick={() => {
                                            setDrawer({ selectedBoxLabel: selectedBoxLabel!, title: cell.label });
                                        }}
                                        aria-label={cell.label}
                                    >
                                        {inner}
                                    </button>
                                ) : (
                                    <div className="flex flex-1 flex-col gap-1">{inner}</div>
                                )}
                            </div>
                        );
                    }),
                )}
            </div>

            {drawer ? (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] dark:bg-black/50"
                        aria-label={t("managerWorkspace.dashboard.analystNineBoxModalClose")}
                        onClick={() => setDrawer(null)}
                    />
                    <aside
                        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="nine-box-drawer-title"
                    >
                        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    9-Box
                                </p>
                                <h2 id="nine-box-drawer-title" className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">
                                    {drawer.title}
                                </h2>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {t("managerWorkspace.dashboard.analystNineBoxDrawerCount", {
                                        count: drawerTalents.length,
                                    })}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDrawer(null)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                aria-label={t("managerWorkspace.dashboard.analystNineBoxModalClose")}
                            >
                                <X className="size-5" />
                            </button>
                        </header>
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                            {drawerTalents.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {t("managerWorkspace.dashboard.analystNineBoxTalentEmpty")}
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {drawerTalents.map((entry) => (
                                        <li
                                            key={`${entry.box_label}-${entry.talent_name}`}
                                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950/50"
                                        >
                                            <User className="size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {entry.talent_name}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <footer className="border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                            <Link
                                to="/workspace/manager/team"
                                className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                            >
                                {t("managerWorkspace.dashboard.analystNineBoxViewTeam")}
                            </Link>
                        </footer>
                    </aside>
                </>
            ) : null}
        </>
    );
}
