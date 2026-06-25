import { AlertTriangle, Bell, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { WORKSPACE_PREFIX } from "@/utils/workspace-routes";
import type { ManagerProjectsListCounts } from "@/types/api.types";

export type ProjectsSegmentFilter = "all" | "action_required" | "surveillance" | "stable" | "due_soon";

type ProjectsInsightBarProps = {
    counts: ManagerProjectsListCounts | undefined;
    onFilterClick: (filter: ProjectsSegmentFilter) => void;
};

const TONE_CLASS: Record<string, string> = {
    amber: "text-amber-700 hover:text-amber-800 dark:text-amber-300",
    slate: "text-slate-700 hover:text-slate-900 dark:text-slate-300",
    orange: "text-orange-700 hover:text-orange-800 dark:text-orange-300",
};

export function ProjectsInsightBar({ counts, onFilterClick }: ProjectsInsightBarProps) {
    const { t } = useTranslation("common");
    const navigate = useNavigate();

    if (!counts) {
        return null;
    }

    const hints: { icon: typeof AlertTriangle; tone: keyof typeof TONE_CLASS; label: string; onClick: () => void }[] =
        [];

    if (typeof counts.action_required === "number" && counts.action_required > 0) {
        hints.push({
            icon: AlertTriangle,
            tone: "amber",
            label: t(
                counts.action_required > 1
                    ? "managerWorkspace.projects.insightBarActionRequired_plural"
                    : "managerWorkspace.projects.insightBarActionRequired",
                { count: counts.action_required },
            ),
            onClick: () => onFilterClick("action_required"),
        });
    }

    if (typeof counts.alerts_total === "number" && counts.alerts_total > 0) {
        hints.push({
            icon: Bell,
            tone: "slate",
            label: t("managerWorkspace.projects.insightBarAlertsTotal", { count: counts.alerts_total }),
            onClick: () => navigate(`${WORKSPACE_PREFIX.manager}/risks`),
        });
    }

    if (typeof counts.due_soon === "number" && counts.due_soon > 0) {
        hints.push({
            icon: Clock,
            tone: "orange",
            label: t(
                counts.due_soon > 1
                    ? "managerWorkspace.projects.insightBarDueSoon_plural"
                    : "managerWorkspace.projects.insightBarDueSoon",
                { count: counts.due_soon },
            ),
            onClick: () => onFilterClick("due_soon"),
        });
    }

    if (hints.length === 0) {
        return <div className="text-sm text-slate-500">{t("managerWorkspace.projects.insightBarNoUrgent")}</div>;
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
                        className={`inline-flex items-center gap-1.5 hover:underline ${TONE_CLASS[hint.tone] ?? TONE_CLASS.slate}`}
                    >
                        <Icon size={14} aria-hidden />
                        {hint.label}
                    </button>
                );
            })}
        </div>
    );
}
