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
} from "@/lib/manager-team-list-utils";
import { displayProjectName, displayRole, talentActionId } from "@/components/team/team-list-utils";
import type { TalentListItem } from "@/types/api.types";
import { cx } from "@/utils/cx";

export interface TalentMobileCardsProps {
    rows: TalentListItem[];
    isLoading?: boolean;
    onOpenDrawer: (talentId: string) => void;
    onGoDetail: (talentId: string) => void;
    onSendMessage?: (talent: TalentListItem) => void;
}

export function TalentMobileCards({
    rows,
    isLoading,
    onOpenDrawer,
    onGoDetail,
    onSendMessage,
}: TalentMobileCardsProps) {
    if (!isLoading && rows.length === 0) {
        return (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 lg:hidden">
                Aucun talent trouvé avec ces filtres.
            </p>
        );
    }

    return (
        <ul className="space-y-2 lg:hidden">
            {rows.map((talent) => {
                const actionId = talentActionId(talent);
                const charge = readTalentChargePct(talent);
                const projectName = displayProjectName(talent);
                const ipiScore = talent.insights?.ipi_score;
                const ipiBand = talent.insights?.ipi_band?.trim();

                return (
                    <li key={talent.talent_id ?? talent.id ?? talent.full_name}>
                        <article
                            className={cx(
                                "rounded-md border border-slate-200 bg-white px-3 py-3 transition hover:border-violet-300 dark:border-slate-700 dark:bg-slate-950",
                                chargeLeftBorderClass(charge),
                                actionId && "cursor-pointer",
                            )}
                            role={actionId ? "button" : undefined}
                            tabIndex={actionId ? 0 : undefined}
                            onClick={() => {
                                if (actionId) onOpenDrawer(actionId);
                            }}
                            onKeyDown={(e) => {
                                if (!actionId) return;
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onOpenDrawer(actionId);
                                }
                            }}
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white"
                                    aria-hidden
                                >
                                    {talentInitials(talent.full_name)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                                                {talent.full_name}
                                            </p>
                                            {talent.role ? (
                                                <p className="truncate text-xs text-slate-500">{displayRole(talent)}</p>
                                            ) : null}
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                            <Dropdown.Root>
                                                <Button
                                                    type="button"
                                                    color="tertiary"
                                                    size="sm"
                                                    className="min-h-8 min-w-8"
                                                    iconLeading={MoreVertical}
                                                    aria-label="Actions talent"
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
                                        </div>
                                    </div>
                                    <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-400">
                                        {projectName ?? "aucun projet"} ·{" "}
                                        <span className={chargeToneClass(charge)}>{charge}%</span>
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                                        {typeof ipiScore === "number" ? (
                                            <>
                                                <span className="font-semibold tabular-nums">IPI {ipiScore.toFixed(1)}</span>
                                                {ipiBand ? (
                                                    <span className={cx("rounded px-1 py-0.5 text-[10px] uppercase ring-1 ring-inset", ipiBandBadgeClass(ipiBand))}>
                                                        {ipiBand}
                                                    </span>
                                                ) : null}
                                            </>
                                        ) : null}
                                        {talent.contract_end_date ? (
                                            <span className="inline-flex items-center gap-1 text-slate-500">
                                                <span className={cx("size-1.5 rounded-full", contractUrgencyDotClass(talent.contract_end_date))} />
                                                {formatTalentDate(talent.contract_end_date)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">CDI</span>
                                        )}
                                    </div>
                                    <div className="mt-1.5 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
                                        <div className={cx("h-full rounded-full", chargeToneBg(charge))} style={{ width: `${Math.min(100, charge / 2)}%` }} />
                                    </div>
                                </div>
                            </div>
                        </article>
                    </li>
                );
            })}
        </ul>
    );
}
