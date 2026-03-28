const KEY = "strategic-copilot-context-memory";

export interface CopilotMemoryPayload {
    routeKey: string | null;
    entityId: string | null;
    suggestionId: string | null;
    insightTitle: string | null;
    at: number;
}

export function readCopilotMemory(): CopilotMemoryPayload | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as CopilotMemoryPayload;
        if (!data || typeof data.at !== "number") return null;
        return data;
    } catch {
        return null;
    }
}

export function writeCopilotMemory(payload: Omit<CopilotMemoryPayload, "at"> & { at?: number }) {
    try {
        const next: CopilotMemoryPayload = {
            ...payload,
            at: payload.at ?? Date.now(),
        };
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        /* ignore */
    }
}

export function clearCopilotMemory() {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* ignore */
    }
}
