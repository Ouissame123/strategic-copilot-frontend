import { AlertTriangle, ClipboardList, Users } from "lucide-react";
import { useNavigate } from "react-router";
import type { ManagerRisksCounts } from "@/lib/manager-risks-list-utils";
import type { RisksSegmentFilter } from "@/lib/manager-risks-list-utils";
import { WORKSPACE_PREFIX } from "@/utils/workspace-routes";

type RisksInsightBarProps = {
    counts: ManagerRisksCounts | undefined;
    onFilterClick: (filter: RisksSegmentFilter) => void;
};

const TONE_CLASS: Record<string, string> = {
    red: "text-red-700 hover:text-red-800 dark:text-red-300",
    amber: "text-amber-700 hover:text-amber-800 dark:text-amber-300",
    orange: "text-orange-700 hover:text-orange-800 dark:text-orange-300",
};

export function RisksInsightBar({ counts, onFilterClick }: RisksInsightBarProps) {
    const navigate = useNavigate();

    if (!counts) return null;

    const hints: {
        icon: typeof AlertTriangle;
        tone: keyof typeof TONE_CLASS;
        label: string;
        onClick: () => void;
    }[] = [];

    if (typeof counts.critical === "number" && counts.critical > 0) {
        hints.push({
            icon: AlertTriangle,
            tone: "red",
            label: `${counts.critical} critique${counts.critical > 1 ? "s" : ""}`,
            onClick: () => onFilterClick("critical"),
        });
    }

    if (typeof counts.overloaded_talents === "number" && counts.overloaded_talents > 0) {
        hints.push({
            icon: Users,
            tone: "amber",
            label: `${counts.overloaded_talents} talent${counts.overloaded_talents > 1 ? "s" : ""} surchargé${counts.overloaded_talents > 1 ? "s" : ""}`,
            onClick: () => navigate(`${WORKSPACE_PREFIX.manager}/team?filter=overloaded`),
        });
    }

    if (typeof counts.rh_pending === "number" && counts.rh_pending > 0) {
        hints.push({
            icon: ClipboardList,
            tone: "orange",
            label: `${counts.rh_pending} action${counts.rh_pending > 1 ? "s" : ""} RH en attente`,
            onClick: () => navigate(`${WORKSPACE_PREFIX.manager}/rh-requests`),
        });
    }

    if (hints.length === 0) {
        return <p className="text-sm text-slate-500 dark:text-slate-400">✓ Aucune alerte critique active.</p>;
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
                        className={`inline-flex items-center gap-1.5 hover:underline ${TONE_CLASS[hint.tone] ?? TONE_CLASS.red}`}
                    >
                        <Icon size={14} aria-hidden />
                        {hint.label}
                    </button>
                );
            })}
        </div>
    );
}
