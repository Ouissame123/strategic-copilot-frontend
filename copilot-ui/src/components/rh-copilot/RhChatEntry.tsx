import { useAuth } from "@/hooks/useAuth";
import { shouldUseRhCopilotEntry } from "@/lib/feature-flags";
import { RhChatPanel } from "@/components/rh-chat/RhChatPanel";
import { RhCopilotPanel } from "@/components/rh-copilot/RhCopilotPanel";

export type RhChatEntryProps = {
    embedded?: boolean;
    onClose?: () => void;
};

/** Point d'entrée unique — v3 Senior Partner si flag actif, sinon legacy. */
export function RhChatEntry({ embedded = false, onClose }: RhChatEntryProps) {
    const { user } = useAuth();
    if (shouldUseRhCopilotEntry(user?.id)) {
        return <RhCopilotPanel embedded={embedded} onClose={onClose} />;
    }
    return <RhChatPanel embedded={embedded} />;
}
