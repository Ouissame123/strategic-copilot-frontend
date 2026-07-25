import { useState } from "react";
import type { ReallocationProposal } from "../utils/parseReallocation";
import { cx } from "@/utils/cx";

const VISIBLE_MAX = 3;

type ReallocationBodyProps = {
    proposals: ReallocationProposal[];
    projectName: string;
};

function skillLabel(n: number): string {
    return n === 1 ? "1 compétence matchée" : `${n} compétences matchées`;
}

function LoadTransitionBadge({ from, to }: { from: number; to: number }) {
    return (
        <span
            className={cx(
                "inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                "border-emerald-200/90 bg-emerald-50 text-emerald-800",
                "dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200",
            )}
        >
            {from}% → {to}%
        </span>
    );
}

export function ReallocationBody({ proposals, projectName }: ReallocationBodyProps) {
    const [expanded, setExpanded] = useState(false);
    const n = proposals.length;
    const titleProject = projectName.trim() || "projet";
    const visible = expanded ? proposals : proposals.slice(0, VISIBLE_MAX);
    const hiddenCount = Math.max(0, n - VISIBLE_MAX);

    return (
        <div className="min-w-0 space-y-2">
            <h3 className="text-sm font-semibold leading-snug text-primary">
                Réaffectation proposée — {n} talent{n > 1 ? "s" : ""} → {titleProject}
            </h3>
            <ul className="space-y-1.5">
                {visible.map((p) => (
                    <li
                        key={p.talent_id || p.talent_name}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-secondary"
                    >
                        <span className="min-w-0 font-medium text-primary">{p.talent_name}</span>
                        <span className="text-tertiary">·</span>
                        <span className="text-tertiary">
                            charge {p.current_load_pct}% → {p.proposed_allocation_pct}%
                        </span>
                        <span className="text-tertiary">·</span>
                        <span className="text-tertiary">{skillLabel(p.matching_skills_count)}</span>
                        <LoadTransitionBadge from={p.current_load_pct} to={p.proposed_allocation_pct} />
                    </li>
                ))}
            </ul>
            {hiddenCount > 0 ? (
                <button
                    type="button"
                    className="text-xs font-semibold text-brand-secondary underline-offset-2 hover:underline"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((v) => !v)}
                >
                    {expanded ? "Réduire" : `+ ${hiddenCount} autre${hiddenCount > 1 ? "s" : ""}`}
                </button>
            ) : null}
        </div>
    );
}
