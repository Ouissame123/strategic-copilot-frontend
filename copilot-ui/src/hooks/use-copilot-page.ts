import { useEffect, useRef } from "react";
import { useCopilot } from "@/providers/copilot-provider";
import type { CopilotScope } from "@/types/copilot";

export interface UseCopilotPageOptions {
    projectId?: string;
    entityLabel?: string;
}

const SCOPES = new Set<CopilotScope>(["dashboard", "projects_list", "project_detail", "staffing", "none"]);

/**
 * Mode historique : scope + libellé → contexte GET Copilot.
 * Mode chat : clé de page + données JSON → contexte POST chat (données lues via ref au moment de l’envoi).
 */
export function useCopilotPage(
    first: CopilotScope | string,
    second: string | Record<string, unknown>,
    third?: UseCopilotPageOptions,
): void {
    const { setPageContext, setCopilotChatContext } = useCopilot();
    const isLegacy = typeof second === "string";
    const dataRef = useRef<Record<string, unknown>>(isLegacy ? {} : (second as Record<string, unknown>));

    useEffect(() => {
        if (!isLegacy && second && typeof second === "object" && !Array.isArray(second)) {
            dataRef.current = second as Record<string, unknown>;
        }
    }, [isLegacy, second]);

    useEffect(() => {
        if (isLegacy && typeof second === "string") {
            const scope = first as CopilotScope;
            if (!SCOPES.has(scope)) {
                return;
            }
            setPageContext({
                scope,
                pageLabel: second,
                projectId: third?.projectId,
                entityLabel: third?.entityLabel,
            });
            return () => setPageContext(null);
        }
    }, [isLegacy, first, second, third?.projectId, third?.entityLabel, setPageContext]);

    useEffect(() => {
        if (!isLegacy) {
            setCopilotChatContext(String(first), dataRef);
            return () => setCopilotChatContext("", null);
        }
    }, [isLegacy, first, setCopilotChatContext]);
}
