import { badgeToneClass } from "./talent-projects-ui";
import { formatName } from "./utils/formatName";
import { cx } from "@/utils/cx";

type TeamMemberRowProps = {
    name: string;
    role: string | null | undefined;
    jobTitle: string | null | undefined;
    allocationPct: number;
    isMe: boolean;
};

function avatarInitial(displayName: string): string {
    const part = displayName.trim().split(/\s+/)[0];
    return part ? part[0]!.toUpperCase() : "?";
}

function roleLabel(role: string | null | undefined, jobTitle: string | null | undefined): string {
    const fromRole = role?.trim();
    if (fromRole) return fromRole;
    const fromJob = jobTitle?.trim();
    if (fromJob) return fromJob;
    return "Membre";
}

export function TeamMemberRow({ name, role, jobTitle, allocationPct, isMe }: TeamMemberRowProps) {
    const displayName = formatName(name) || name;
    const roleText = roleLabel(role, jobTitle);

    return (
        <li
            className={cx(
                "flex items-center gap-3 rounded-xl border px-3 py-2",
                isMe ? "border-brand-secondary/40 bg-brand-primary/10" : "border-secondary/70 bg-secondary_subtle/30",
            )}
        >
            <span
                className={cx(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isMe ? "bg-brand-solid text-white" : "bg-secondary text-secondary",
                )}
                aria-hidden
            >
                {avatarInitial(displayName)}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <p className="truncate text-sm font-medium text-primary">{displayName}</p>
                {isMe ? <span className={cx("shrink-0", badgeToneClass("violet"))}>Moi</span> : null}
                <p className="ml-auto shrink-0 truncate text-xs text-tertiary">
                    {roleText} · {allocationPct}%
                </p>
            </div>
        </li>
    );
}
