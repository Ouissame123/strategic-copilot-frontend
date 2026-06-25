import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ManagerProjectsListCounts } from "@/types/api.types";
import type { ProjectsSegmentFilter } from "./ProjectsInsightBar";

type Segment = {
    id: ProjectsSegmentFilter;
    label: string;
    count: number;
    tone: "slate" | "red" | "amber" | "emerald";
};

const TONE_ACTIVE: Record<Segment["tone"], string> = {
    slate: "border-slate-900 bg-slate-900 text-white",
    red: "border-red-600 bg-red-600 text-white",
    amber: "border-amber-600 bg-amber-600 text-white",
    emerald: "border-emerald-600 bg-emerald-600 text-white",
};

type ProjectsSegmentsProps = {
    counts: ManagerProjectsListCounts | undefined;
    totalFallback: number;
    active: ProjectsSegmentFilter;
    onChange: (filter: ProjectsSegmentFilter) => void;
};

export function ProjectsSegments({ counts, totalFallback, active, onChange }: ProjectsSegmentsProps) {
    const { t } = useTranslation("common");

    const segments = useMemo((): Segment[] => {
        const out: Segment[] = [
            {
                id: "all",
                label: t("managerWorkspace.projects.chipAll"),
                count: counts?.total ?? totalFallback,
                tone: "slate",
            },
        ];

        if (typeof counts?.action_required === "number") {
            out.push({
                id: "action_required",
                label: t("managerWorkspace.projects.segmentActionRequired"),
                count: counts.action_required,
                tone: "red",
            });
        }
        if (typeof counts?.surveillance === "number") {
            out.push({
                id: "surveillance",
                label: t("managerWorkspace.projects.segmentSurveillance"),
                count: counts.surveillance,
                tone: "amber",
            });
        }
        if (typeof counts?.stable === "number") {
            out.push({
                id: "stable",
                label: t("managerWorkspace.projects.segmentStable"),
                count: counts.stable,
                tone: "emerald",
            });
        }
        return out;
    }, [counts, totalFallback, t]);

    if (segments.length <= 1) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label={t("managerWorkspace.projects.segmentsAria")}>
            {segments.map((segment) => {
                const isActive = active === segment.id;
                return (
                    <button
                        key={segment.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(segment.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                            isActive
                                ? `${TONE_ACTIVE[segment.tone]} shadow-sm`
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                    >
                        <span>{segment.label}</span>
                        <span
                            className={`tabular-nums rounded-full px-1.5 py-px text-[10px] font-semibold leading-none ${
                                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                            }`}
                        >
                            {segment.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
