import { Mail, MoreVertical } from "lucide-react";
import { formatTalentDate, talentInitials } from "@/components/talent/talent-detail-shared";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import {
    chargeLeftBorderClass,
    chargeToneBg,
    chargeToneClass,
    contractUrgencyDotClass,
    ipiBandBadgeClass,
    readTalentChargePct,
    type TeamTableSortKey,
} from "@/lib/manager-team-list-utils";
import { displayProjectName, displayRole, talentActionId } from "@/components/team/team-list-utils";
import type { TalentListItem } from "@/types/api.types";
import { cx } from "@/utils/cx";

const TH_CELL =
    "bg-slate-50 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-800/80 dark:text-slate-400";
const TD_BASE = "px-2 align-middle";
const ROW_PADDING = "py-2.5";

function SortableTh({
    label,
    active,
    dir,
    onClick,
    align = "left",
}: {
    label: string;
    active: boolean;
    dir: "asc" | "desc";
    onClick: () => void;
    align?: "left" | "right";
}) {
    return (
        <th className={cx(TH_CELL, align === "right" && "text-right")}>
            <button
                type="button"
                onClick={onClick}
                className={cx(
                    "group inline-flex w-full min-w-0 items-center gap-1 truncate transition hover:text-slate-600 dark:hover:text-slate-200",
                    align === "right" && "justify-end",
                )}
            >
                <span className="truncate">{label}</span>
                <span
                    className={cx(
                        "shrink-0 font-mono text-[10px]",
                        active ? "text-violet-600 dark:text-violet-400" : "opacity-0 group-hover:opacity-60",
                    )}
                >
                    {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
                </span>
            </button>
        </th>
    );
}

export interface TalentIntelligenceTableProps {
    rows: TalentListItem[];
    sort: { key: TeamTableSortKey; dir: "asc" | "desc" };
    onSort: (key: TeamTableSortKey) => void;
    onOpenDrawer: (talentId: string) => void;
    onGoDetail: (talentId: string) => void;
    onSendMessage?: (talent: TalentListItem) => void;
    isLoading?: boolean;
}

export function TalentIntelligenceTable({
    rows,
    sort,
    onSort,
    onOpenDrawer,
    onGoDetail,
    onSendMessage,
    isLoading,
}: TalentIntelligenceTableProps) {
    return (
        <section className="hidden w-full lg:block">
            <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                        <tr>
                            <SortableTh label="Talent" active={sort.key === "name"} dir={sort.dir} onClick={() => onSort("name")} />
                            <th className={cx(TH_CELL, "text-left")}>
                                <span className="block truncate">Projet principal</span>
                            </th>
                            <SortableTh
                                label="Charge"
                                active={sort.key === "charge_pct"}
                                dir={sort.dir}
                                onClick={() => onSort("charge_pct")}
                            />
                            <SortableTh label="IPI" active={sort.key === "ipi_score"} dir={sort.dir} onClick={() => onSort("ipi_score")} />
                            <SortableTh
                                label="Contrat"
                                active={sort.key === "contract_end_date"}
                                dir={sort.dir}
                                onClick={() => onSort("contract_end_date")}
                            />
                            <th className={cx(TH_CELL, "w-10 text-right")}>
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((talent) => {
                            const actionId = talentActionId(talent);
                            const charge = readTalentChargePct(talent);
                            const projectName = displayProjectName(talent);
                            const roleLabel = displayRole(talent);
                            const ipiScore = talent.insights?.ipi_score;
                            const ipiBand = talent.insights?.ipi_band?.trim();

                            return (
                                <tr
                                    key={talent.talent_id ?? talent.id ?? talent.full_name}
                                    onClick={() => {
                                        if (actionId) onOpenDrawer(actionId);
                                    }}
                                    className={cx(
                                        "border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40",
                                        chargeLeftBorderClass(charge),
                                        actionId && "cursor-pointer",
                                    )}
                                >
                                    <td className={cx(TD_BASE, ROW_PADDING, "pl-3")}>
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span
                                                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white ring-2 ring-white dark:ring-slate-900"
                                                aria-hidden
                                            >
                                                {talentInitials(talent.full_name)}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                                                    {talent.full_name}
                                                </div>
                                                {talent.role ? (
                                                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{roleLabel}</div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </td>
                                    <td className={cx(TD_BASE, ROW_PADDING)}>
                                        {projectName ? (
                                            <span className="block truncate text-sm text-slate-800 dark:text-slate-200">{projectName}</span>
                                        ) : (
                                            <span className="text-sm italic text-slate-400">aucun</span>
                                        )}
                                    </td>
                                    <td className={cx(TD_BASE, ROW_PADDING)}>
                                        <div className="flex min-w-[7rem] items-center gap-2">
                                            <span className={cx("text-sm font-semibold tabular-nums", chargeToneClass(charge))}>
                                                {charge}%
                                            </span>
                                            <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
                                                <div
                                                    className={cx("h-full rounded-full", chargeToneBg(charge))}
                                                    style={{ width: `${Math.min(100, charge / 2)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className={cx(TD_BASE, ROW_PADDING)}>
                                        {typeof ipiScore === "number" && Number.isFinite(ipiScore) ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold tabular-nums">{ipiScore.toFixed(1)}</span>
                                                {ipiBand ? (
                                                    <span
                                                        className={cx(
                                                            "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ring-1 ring-inset",
                                                            ipiBandBadgeClass(ipiBand),
                                                        )}
                                                    >
                                                        {ipiBand}
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <span className="text-sm italic text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className={cx(TD_BASE, ROW_PADDING, "text-sm tabular-nums")}>
                                        {talent.contract_end_date ? (
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={cx("size-1.5 shrink-0 rounded-full", contractUrgencyDotClass(talent.contract_end_date))}
                                                    aria-hidden
                                                />
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    {formatTalentDate(talent.contract_end_date) || talent.contract_end_date}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="italic text-slate-400">CDI</span>
                                        )}
                                    </td>
                                    <td
                                        className={cx(TD_BASE, ROW_PADDING, "pr-3 text-right")}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    >
                                        <Dropdown.Root>
                                            <Button
                                                type="button"
                                                color="tertiary"
                                                size="sm"
                                                className="min-h-8 min-w-8"
                                                iconLeading={MoreVertical}
                                                aria-label="Actions talent"
                                                aria-haspopup="menu"
                                            />
                                            <Dropdown.Popover className="min-w-[12rem]">
                                                <Dropdown.Menu
                                                    onAction={(key) => {
                                                        const k = String(key);
                                                        if (!actionId) return;
                                                        if (k === "drawer") onOpenDrawer(actionId);
                                                        if (k === "detail") onGoDetail(actionId);
                                                        if (k === "message") onSendMessage?.(talent);
                                                    }}
                                                >
                                                    <Dropdown.Item id="drawer" label="Voir détail" />
                                                    <Dropdown.Item id="detail" label="Fiche complète" />
                                                    <Dropdown.Separator />
                                                    <Dropdown.Item
                                                        id="message"
                                                        label="Envoyer un message"
                                                        icon={Mail}
                                                        isDisabled={!talent.email?.trim()}
                                                    />
                                                </Dropdown.Menu>
                                            </Dropdown.Popover>
                                        </Dropdown.Root>
                                    </td>
                                </tr>
                            );
                        })}
                        {!isLoading && rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                    Aucun talent trouvé avec ces filtres.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
