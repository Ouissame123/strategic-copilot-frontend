import { Button } from "@/components/base/buttons/button";
import type { RhActionCardModel } from "../types";
import { formatRelativeFrIntl } from "../utils/formatRelativeFr";
import { ActionCardFallback } from "./ActionCardFallback";
import { ReallocationBody } from "./ReallocationBody";
import { cx } from "@/utils/cx";

type ActionCardProps = {
    action: RhActionCardModel;
    onTreat: (id: string) => void;
};

function typeBadgeLabel(type: string): string {
    const t = type.toLowerCase().trim();
    const map: Record<string, string> = {
        skill_gap: "ÉCART COMPÉTENCES",
        reallocation: "RÉAFFECTATION",
        training: "FORMATION",
        overload: "SURCHARGE",
        recruitment: "RECRUTEMENT",
    };
    if (map[t]) return map[t];
    return type ? type.replace(/_/g, " ").toUpperCase() : "DEMANDE";
}

function statusPillClass(bucket: string | null): string {
    const map: Record<string, string> = {
        pending: "border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
        accepted: "border-primary-200/90 bg-primary-50 text-primary-950 dark:border-primary-800 dark:bg-primary-950/35 dark:text-primary-100",
        in_progress:
            "border-primary-200/90 bg-primary-50 text-primary-950 dark:border-primary-800 dark:bg-primary-950/35 dark:text-primary-100",
        done: "border-emerald-200/90 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100",
        rejected: "border-rose-200/90 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/35 dark:text-rose-100",
    };
    if (bucket && map[bucket]) return map[bucket];
    return "border-secondary/80 bg-secondary_subtle/60 text-secondary";
}

export function ActionCard({ action, onTreat }: ActionCardProps) {
    const urgent = action.priority.toLowerCase() === "urgent";
    const parsed = action.proposals != null && action.proposals.length > 0;

    return (
        <li
            className={cx(
                "rounded-xl border border-secondary/80 bg-primary p-3 shadow-sm ring-1 ring-secondary/35 transition sm:p-4",
                urgent && "border-l-[3px] border-l-red-500",
            )}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-secondary/80 bg-secondary_subtle/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary">
                            {typeBadgeLabel(action.type)}
                        </span>
                        <span className={cx("rounded-md border px-2 py-0.5 text-[10px] font-semibold", statusPillClass(action.statusBucket))}>
                            {action.statusLabel}
                        </span>
                        <span className="text-[11px] text-tertiary">{formatRelativeFrIntl(action.createdAt)}</span>
                        {action.duplicateCount > 1 ? (
                            <span
                                className="rounded-md border border-secondary/80 bg-secondary_subtle px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-secondary"
                                title={`${action.duplicateCount} demandes similaires regroupées`}
                            >
                                ×{action.duplicateCount}
                            </span>
                        ) : null}
                    </div>

                    {parsed && action.proposals ? (
                        <ReallocationBody proposals={action.proposals} projectName={action.projectName} />
                    ) : (
                        <ActionCardFallback title={action.fallbackTitle} description={action.fallbackDescription} />
                    )}

                    {!parsed && action.projectName ? (
                        <p className="text-xs text-secondary">
                            <span className="font-medium text-tertiary">Projet :</span>{" "}
                            <span className="text-primary">{action.projectName}</span>
                        </p>
                    ) : null}

                    <p className="text-sm text-tertiary">
                        <span className="font-medium text-secondary">Action recommandée :</span> {action.recommendedAction}
                    </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                    <Button size="sm" color="primary" onPress={() => onTreat(action.id)}>
                        Traiter
                    </Button>
                </div>
            </div>
        </li>
    );
}
