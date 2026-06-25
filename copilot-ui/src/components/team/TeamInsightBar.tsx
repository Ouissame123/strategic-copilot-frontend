import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import type { ManagerTeamListCounts } from "@/types/api.types";
import type { TeamSegmentFilter } from "@/lib/manager-team-list-utils";

type TeamInsightBarProps = {
    counts: ManagerTeamListCounts | undefined;
    onFilterClick: (filter: TeamSegmentFilter) => void;
};

const TONE_CLASS: Record<string, string> = {
    amber: "text-amber-700 hover:text-amber-800 dark:text-amber-300",
    orange: "text-orange-700 hover:text-orange-800 dark:text-orange-300",
    emerald: "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300",
};

export function TeamInsightBar({ counts, onFilterClick }: TeamInsightBarProps) {
    if (!counts) return null;

    const hints: { icon: typeof AlertTriangle; tone: keyof typeof TONE_CLASS; label: string; onClick: () => void }[] =
        [];

    if (typeof counts.overloaded === "number" && counts.overloaded > 0) {
        hints.push({
            icon: AlertTriangle,
            tone: "amber",
            label: `${counts.overloaded} talent${counts.overloaded > 1 ? "s" : ""} en surcharge`,
            onClick: () => onFilterClick("overloaded"),
        });
    }

    const contractsEnding = counts.contracts_ending_soon ?? counts.contract_ending;
    if (typeof contractsEnding === "number" && contractsEnding > 0) {
        hints.push({
            icon: Clock,
            tone: "orange",
            label: `${contractsEnding} contrat${contractsEnding > 1 ? "s" : ""} < 90j`,
            onClick: () => onFilterClick("contract_ending"),
        });
    }

    if (typeof counts.healthy === "number" && counts.healthy > 0) {
        hints.push({
            icon: CheckCircle,
            tone: "emerald",
            label: `${counts.healthy} sain${counts.healthy > 1 ? "s" : ""}`,
            onClick: () => onFilterClick("healthy"),
        });
    }

    if (hints.length === 0) {
        return <p className="text-sm text-slate-500 dark:text-slate-400">✓ Aucune action urgente sur l&apos;équipe.</p>;
    }

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900/40">
            {hints.map((hint) => {
                const Icon = hint.icon;
                return (
                    <button
                        key={hint.label}
                        type="button"
                        onClick={hint.onClick}
                        className={`inline-flex items-center gap-1.5 hover:underline ${TONE_CLASS[hint.tone] ?? TONE_CLASS.amber}`}
                    >
                        <Icon size={14} aria-hidden />
                        {hint.label}
                    </button>
                );
            })}
        </div>
    );
}
