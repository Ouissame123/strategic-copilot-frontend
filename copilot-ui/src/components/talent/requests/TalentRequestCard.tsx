import { formatRelativeTimeFr } from "@/lib/rh-request-display";
import type { TalentRequest } from "@/types/talent-requests";
import { cx } from "@/utils/cx";
import {
    PRIORITY_TONES,
    STATUS_TONES,
    TYPE_TONES,
    badgeToneClass,
    type TalentRequestsDensity,
} from "./talent-request-ui";

type TalentRequestCardProps = {
    request: TalentRequest;
    density: TalentRequestsDensity;
    onClick: (request: TalentRequest) => void;
};

export function TalentRequestCard({ request, density, onClick }: TalentRequestCardProps) {
    const isCompact = density === "compact";
    const showPriorityChip = request.priority === "urgent" || request.priority === "high";
    const relativeCreated = formatRelativeTimeFr(request.created_at);

    return (
        <button
            type="button"
            onClick={() => onClick(request)}
            className={cx(
                "flex w-full flex-col rounded-2xl border border-secondary bg-primary text-left shadow-xs ring-1 ring-secondary/60 transition hover:border-brand-secondary/40 hover:shadow-sm",
                isCompact ? "gap-2 p-3" : "gap-3 p-4 sm:p-5",
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {request.request_type_label ? (
                        <span className={badgeToneClass(TYPE_TONES[request.request_type])}>{request.request_type_label}</span>
                    ) : null}
                    {showPriorityChip ? (
                        <span className={badgeToneClass(PRIORITY_TONES[request.priority])}>
                            {request.priority === "urgent" ? "Urgent" : "Haute"}
                        </span>
                    ) : null}
                </div>
                {request.status_label ? (
                    <span className={badgeToneClass(STATUS_TONES[request.status])}>{request.status_label}</span>
                ) : null}
            </div>

            <div className="min-w-0">
                <p className={cx("font-semibold text-primary", isCompact ? "text-sm line-clamp-1" : "text-base line-clamp-2")}>
                    {request.title}
                </p>
                {!isCompact && request.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-secondary">{request.description}</p>
                ) : null}
            </div>

            <div className={cx("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tertiary", isCompact && "text-[11px]")}>
                {request.talent_name ? <span className="font-medium text-secondary">{request.talent_name}</span> : null}
                {relativeCreated ? <span>{relativeCreated}</span> : null}
                {request.manager_name ? <span>Manager · {request.manager_name}</span> : null}
            </div>
        </button>
    );
}
