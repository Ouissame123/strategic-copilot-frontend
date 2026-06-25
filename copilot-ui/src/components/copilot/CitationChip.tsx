import { AlertTriangle, Briefcase01, FileCheck02, GitBranch01, Star01, User01 } from "@untitledui/icons";
import { useNavigate } from "react-router";
import type { Citation, CitationType } from "@/api/helper-chat-v3.types";
import { helperV3CitationPath } from "@/lib/helper-chat-v3-navigation";
import { cx } from "@/utils/cx";

const CITATION_CONFIG: Record<CitationType, { Icon: typeof User01; color: string }> = {
    talent: { Icon: User01, color: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200" },
    alert: { Icon: AlertTriangle, color: "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200" },
    decision: { Icon: FileCheck02, color: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200" },
    project: { Icon: Briefcase01, color: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200" },
    skill: { Icon: Star01, color: "border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100 dark:border-pink-800 dark:bg-pink-950/40 dark:text-pink-200" },
    arbitrage: { Icon: GitBranch01, color: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200" },
};

type CitationChipProps = {
    citation: Citation;
    projectId?: string | null;
};

export function CitationChip({ citation, projectId }: CitationChipProps) {
    const navigate = useNavigate();
    const cfg = CITATION_CONFIG[citation.type];
    if (!cfg) return null;

    const href = helperV3CitationPath(citation, projectId);
    const { Icon } = cfg;

    return (
        <button
            type="button"
            disabled={!href}
            onClick={() => href && navigate(href)}
            className={cx(
                "inline-flex max-w-[10rem] items-center gap-1 rounded border px-2 py-0.5 text-xs transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                cfg.color,
                !href && "cursor-default opacity-60",
            )}
            aria-label={`Référence ${citation.type}: ${citation.label}`}
        >
            <Icon className="size-3 shrink-0" aria-hidden />
            <span className="truncate font-medium">{citation.label}</span>
        </button>
    );
}
