import type { LucideIcon } from "lucide-react";
import { Activity, ArrowLeftRight, GraduationCap, Layers, UserPlus } from "lucide-react";
import { triageBadgeClass, type TriageBadgeTone } from "@/components/manager/inbox-triage/triage-ui";
import { labelRhActionStatus, labelRhActionType } from "@/lib/manager-rh-actions-labels";
import { cx } from "@/utils/cx";

const TYPE_META: Record<string, { tone: TriageBadgeTone; Icon: LucideIcon }> = {
    skill_gap: { tone: "violet", Icon: Layers },
    reallocation: { tone: "fuchsia", Icon: ArrowLeftRight },
    training: { tone: "cyan", Icon: GraduationCap },
    overload: { tone: "orange", Icon: Activity },
    recruitment: { tone: "blue", Icon: UserPlus },
};

function typeMeta(type: string): { tone: TriageBadgeTone; Icon: LucideIcon } {
    return TYPE_META[type] ?? { tone: "slate", Icon: Layers };
}

export function RhTypeBadge({ type, className }: { type: string; className?: string }) {
    const { tone, Icon } = typeMeta(type);
    return (
        <span className={cx(triageBadgeClass(tone), className)}>
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {labelRhActionType(type)}
        </span>
    );
}

export function RhStatusBadge({ status }: { status: string }) {
    const s = status.toLowerCase();
    let tone: TriageBadgeTone = "amber";
    if (s.includes("accept")) tone = "emerald";
    else if (s.includes("progress") || s.includes("cours")) tone = "blue";
    else if (s.includes("done") || s.includes("termin") || s.includes("closed") || s.includes("clotur")) {
        tone = "violet";
    } else if (s.includes("reject") || s.includes("refus")) tone = "red";
    else if (s.includes("cancel") || s.includes("annul")) tone = "slate";
    return <span className={triageBadgeClass(tone)}>{labelRhActionStatus(status)}</span>;
}
