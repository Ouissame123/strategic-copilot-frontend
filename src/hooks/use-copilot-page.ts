import { useEffect } from "react";
import { useCopilot } from "@/providers/copilot-provider";

/**
 * Registers the current screen for AI Copilot context. Clears on unmount.
 */
export function useCopilotPage(
    routeKey: string,
    pageLabel: string,
    entityLabel?: string,
    entityId?: string,
) {
    const { setPageContext } = useCopilot();

    useEffect(() => {
        setPageContext({ routeKey, pageLabel, entityLabel, entityId });
        return () => setPageContext(null);
    }, [routeKey, pageLabel, entityLabel, entityId, setPageContext]);
}
