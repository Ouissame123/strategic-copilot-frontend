import { Stars01 } from "@untitledui/icons";
import { CitationChip } from "./CitationChip";
import { SuggestedActionsButtons } from "./SuggestedActionsButtons";
import { SourcesStrip } from "./SourcesStrip";
import { parseCitation } from "@/api/manager-copilot.types";
import type { HelperMessage } from "@/api/manager-copilot.types";

interface Props {
    message: HelperMessage;
    projectId?: string;
}

export function AssistantMessage({ message, projectId }: Props) {
    const citations = (message.sources?.citations ?? [])
        .map(parseCitation)
        .filter((c): c is NonNullable<typeof c> => c !== null);

    const toolsUsed = message.sources?.tools_used ?? [];
    const suggestedActions = message.suggested_actions ?? [];

    return (
        <div className="flex gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                <Stars01 className="size-4 text-white" aria-hidden />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-primary">Helper IA</span>
                    {message.intent ? (
                        <>
                            <span className="text-fg-quaternary">·</span>
                            <span className="capitalize text-fg-tertiary">{message.intent.replace(/_/g, " ")}</span>
                        </>
                    ) : null}
                </div>

                <div className="rounded-lg border border-secondary bg-primary p-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-primary">{message.content}</p>

                    {citations.length > 0 ? (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="mr-1 text-[10px] font-semibold uppercase text-fg-quaternary">Réf. :</span>
                            {citations.map((c) => (
                                <CitationChip key={`${c.type}-${c.id}`} citation={c} projectId={projectId} />
                            ))}
                        </div>
                    ) : null}
                </div>

                <SuggestedActionsButtons actions={suggestedActions} projectId={projectId} />

                {message.confidence != null ? (
                    <SourcesStrip toolsUsed={toolsUsed} confidence={message.confidence} />
                ) : null}
            </div>
        </div>
    );
}
