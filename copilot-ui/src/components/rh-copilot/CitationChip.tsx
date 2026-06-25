import type { ComponentType, HTMLAttributes } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Briefcase01, FileCheck02, Stars01, User01 } from "@untitledui/icons";
import type { ParsedCitationV3 } from "@/api/rh-copilot.types";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";

const CONFIG: Record<
    ParsedCitationV3["type"],
    { Icon: ComponentType<HTMLAttributes<HTMLOrSVGElement>>; color: string; label: string }
> = {
    talent: {
        Icon: User01,
        color: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
        label: "Talent",
    },
    project: {
        Icon: Briefcase01,
        color: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
        label: "Projet",
    },
    alert: {
        Icon: AlertTriangle,
        color: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200",
        label: "Alerte",
    },
    decision: {
        Icon: FileCheck02,
        color: "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200",
        label: "Décision",
    },
    skill: {
        Icon: Stars01,
        color: "border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100 dark:border-pink-800 dark:bg-pink-950/40 dark:text-pink-200",
        label: "Compétence",
    },
};

export function CitationChip({ citation }: { citation: ParsedCitationV3 }) {
    const navigate = useNavigate();
    const cfg = CONFIG[citation.type];
    const Icon = cfg.Icon;

    const handleClick = () => {
        switch (citation.type) {
            case "talent":
                navigate(`/workspace/rh/employees?talentId=${encodeURIComponent(citation.id)}`);
                return;
            case "project":
                navigate(managerProjectMissionControlPath(citation.id));
                return;
            case "alert":
                navigate(`/workspace/rh/risks?alertId=${encodeURIComponent(citation.id)}`);
                return;
            default:
                break;
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={cx("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs transition-colors", cfg.color)}
        >
            <Icon className="size-3" aria-hidden />
            <span className="font-medium">{cfg.label}</span>
        </button>
    );
}
