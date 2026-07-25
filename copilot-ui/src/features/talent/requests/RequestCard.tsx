import { ChevronRight, Sparkles } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { TalentRequest } from "@/types/talent-requests";
import { cx } from "@/utils/cx";
import { formatRelativeCreated } from "./utils/formatRelativeCreated";
import {
    TYPE_TONES,
    badgeToneClass,
    isOpportunityInterestRequest,
    statusBadgeLabel,
    statusBadgeTone,
    typeBadgeLabel,
} from "./talent-requests-ui";

type RequestCardProps = {
    request: TalentRequest;
    onClick?: (request: TalentRequest) => void;
};

function shouldShowDescription(request: TalentRequest): boolean {
    const description = request.description?.trim() ?? "";
    if (!description) return false;
    return description.toLowerCase() !== request.title.trim().toLowerCase();
}

export function RequestCard({ request, onClick }: RequestCardProps) {
    const clickable = typeof onClick === "function";
    const fromOpportunity = isOpportunityInterestRequest(request);
    const showDescription = shouldShowDescription(request);
    const created = formatRelativeCreated(request.created_at);
    const typeLabel = typeBadgeLabel(request);
    const statusLabel = statusBadgeLabel(request);
    const typeTone = TYPE_TONES[request.request_type] ?? "slate";
    const statusTone = statusBadgeTone(request.status);

    const handleActivate = () => {
        if (clickable) onClick(request);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (!clickable) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick(request);
        }
    };

    return (
        <article
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={handleActivate}
            onKeyDown={handleKeyDown}
            className={cx(
                "flex h-full w-full flex-col gap-2 rounded-lg border border-secondary/60 bg-primary p-4 text-left shadow-sm transition dark:border-secondary/80",
                clickable &&
                    "cursor-pointer hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-solid",
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <span className={cx("shrink-0", badgeToneClass(typeTone))}>{typeLabel}</span>
                <span className={cx("shrink-0", badgeToneClass(statusTone))}>{statusLabel}</span>
            </div>

            <div className="min-w-0 flex-1">
                <p className="flex items-start gap-1.5 font-medium text-primary">
                    {fromOpportunity ? (
                        <Sparkles
                            className="mt-0.5 size-3.5 shrink-0 text-primary-500 dark:text-primary-300"
                            aria-hidden
                        />
                    ) : null}
                    <span className="line-clamp-1">{request.title}</span>
                </p>
                {showDescription ? (
                    <p className="mt-1 line-clamp-2 text-sm text-tertiary">{request.description}</p>
                ) : null}
            </div>

            <footer className="mt-auto flex items-center justify-between gap-2 pt-0.5 text-xs text-tertiary">
                {created ? (
                    <time dateTime={request.created_at} title={created.absolute}>
                        {created.relative}
                    </time>
                ) : (
                    <span>—</span>
                )}
                {clickable ? <ChevronRight className="size-4 shrink-0 text-quaternary" aria-hidden /> : null}
            </footer>
        </article>
    );
}
