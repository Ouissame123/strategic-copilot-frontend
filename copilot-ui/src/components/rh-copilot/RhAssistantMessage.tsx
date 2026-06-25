import { Stars01 } from "@untitledui/icons";
import { parseRhCitation } from "@/api/rh-copilot.types";
import { AgentRoleBadge } from "./AgentRoleBadge";
import { IntentBadge } from "./IntentBadge";
import { ConfidencePill } from "./ConfidencePill";
import { ActionsRecommandeesList } from "./ActionsRecommandeesList";
import { RisquesAlertsList } from "./RisquesAlertsList";
import { QuickRepliesStrip } from "./QuickRepliesStrip";
import { SourcesPanel } from "./SourcesPanel";
import { CitationChip } from "./CitationChip";
import type { RhMessage, SendRhMessageResponse } from "@/api/rh-copilot.types";

interface Props {
    message?: RhMessage;
    freshResponse?: SendRhMessageResponse;
    onQuickReply?: (q: string) => void;
    disabled?: boolean;
}

export function RhAssistantMessage({ message, freshResponse, onQuickReply, disabled }: Props) {
    const content = freshResponse?.reply ?? message?.content ?? "";
    const analyse = freshResponse?.analyse ?? message?.analyse ?? "";
    const intent = freshResponse?.intent ?? message?.intent ?? null;
    const sources = freshResponse?.sources ?? message?.sources ?? [];
    const toolsUsed = freshResponse?.tools_used;
    const confidence = freshResponse?.confidence ?? message?.confidence ?? null;
    const confExplain = freshResponse?.confidence_explanation;
    const risques = freshResponse?.risques ?? message?.risques ?? [];
    const actions = freshResponse?.actions_recommandees ?? message?.actions_recommandees ?? [];
    const quickReplies = freshResponse?.quick_replies ?? message?.quick_replies ?? [];
    const citations = freshResponse?.citations ?? [];
    const sourceAgent = freshResponse?.source_agent ?? freshResponse?.meta?.source_agent;

    return (
        <div className="flex gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                <Stars01 className="size-4 text-white" aria-hidden />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-primary">Assistant RH IA</span>
                    <AgentRoleBadge intent={intent} sourceAgent={sourceAgent} />
                    <IntentBadge intent={intent} />
                </div>

                <div className="rounded-lg border border-secondary bg-primary p-3">
                    <p className="text-sm leading-relaxed font-medium text-primary">{content}</p>

                    {analyse ? (
                        <details className="group mt-3">
                            <summary className="cursor-pointer text-xs text-violet-600 hover:underline dark:text-violet-300">
                                Voir l&apos;analyse détaillée
                            </summary>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg-tertiary">{analyse}</p>
                        </details>
                    ) : null}
                </div>

                <RisquesAlertsList risques={risques} />
                <ActionsRecommandeesList actions={actions} />

                {onQuickReply ? (
                    <QuickRepliesStrip quickReplies={quickReplies} onSelect={onQuickReply} disabled={disabled} />
                ) : null}

                {citations.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-[10px] font-semibold uppercase text-fg-quaternary">Réf. :</span>
                        {citations.map((raw) => {
                            const parsed = parseRhCitation(raw);
                            if (!parsed) return null;
                            return <CitationChip key={`${parsed.type}-${parsed.id}`} citation={parsed} />;
                        })}
                    </div>
                ) : null}

                {sourceAgent && freshResponse?.api_version === "v3" ? (
                    <p className="mt-2 text-[10px] text-fg-quaternary">
                        Agent : <span className="font-medium text-fg-secondary">{sourceAgent}</span>
                    </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <SourcesPanel sources={sources} toolsUsed={toolsUsed} />
                    {confidence != null ? <ConfidencePill value={confidence} explanation={confExplain} /> : null}
                </div>
            </div>
        </div>
    );
}
