export interface CopilotMemoryPayload {
    routeKey: string | null;
    entityId: string | null;
    suggestionId: string | null;
    insightTitle: string | null;
    at: number;
}

let memory: CopilotMemoryPayload | null = null;

export function readCopilotMemory(): CopilotMemoryPayload | null {
    if (!memory || typeof memory.at !== "number") return null;
    return memory;
}

export function writeCopilotMemory(payload: Omit<CopilotMemoryPayload, "at"> & { at?: number }) {
    memory = {
        ...payload,
        at: payload.at ?? Date.now(),
    };
}

export function clearCopilotMemory() {
    memory = null;
}
