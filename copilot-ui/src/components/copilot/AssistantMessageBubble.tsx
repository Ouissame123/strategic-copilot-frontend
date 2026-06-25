import { Stars02 } from "@untitledui/icons";
import type { HelperChatV3Response } from "@/api/helper-chat-v3.types";
import { ChipsSourcesConsulted } from "@/components/copilot/ChipsSourcesConsulted";
import { CitationChip } from "@/components/copilot/CitationChip";
import { KpiHighlightStrip } from "@/components/copilot/KpiHighlightStrip";
import { SuggestedActionsButtons } from "@/components/copilot/SuggestedActionsButtons";
import { cx } from "@/utils/cx";

type AssistantMessageBubbleProps = {
    message: HelperChatV3Response;
    projectId?: string | null;
    compact?: boolean;
};

function humanizeIntent(intent: string): string {
    return intent.replaceAll("_", " ");
}

export function AssistantMessageBubble({ message, projectId, compact = false }: AssistantMessageBubbleProps) {
    return (
        <article className="group flex gap-2 sm:gap-2.5">
            <div
                className={cx(
                    "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm",
                    compact ? "size-7" : "size-8",
                )}
                aria-hidden
            >
                <Stars02 className={cx("text-white", compact ? "size-3.5" : "size-4")} />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-fg-primary">Helper</span>
                    <span className="text-fg-quaternary">·</span>
                    <span className="capitalize text-fg-tertiary">{humanizeIntent(message.intent)}</span>
                </div>

                {message.kpi_highlight ? <KpiHighlightStrip kpi={message.kpi_highlight} /> : null}

                <div className="rounded-lg border border-secondary/60 bg-primary p-3 shadow-sm">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-primary">{message.reply}</p>

                    {message.details?.length > 0 ? (
                        <ul className="mt-3 space-y-1.5">
                            {message.details.map((detail, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-fg-secondary">
                                    <span className="mt-1 shrink-0 text-violet-500" aria-hidden>
                                        •
                                    </span>
                                    <span>{detail}</span>
                                </li>
                            ))}
                        </ul>
                    ) : null}

                    {message.citations?.length > 0 ? (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="mr-1 text-[10px] font-semibold uppercase text-fg-tertiary">Réf. :</span>
                            {message.citations.map((citation) => (
                                <CitationChip key={`${citation.type}-${citation.id}`} citation={citation} projectId={projectId} />
                            ))}
                        </div>
                    ) : null}
                </div>

                <SuggestedActionsButtons actions={message.suggested_actions} projectId={projectId} />

                <ChipsSourcesConsulted toolsUsed={message.tools_used} confidence={message.confidence} />
            </div>
        </article>
    );
}
