import { isAxiosError } from "axios";

export function getErrorCode(err: unknown): string {
    if (isAxiosError(err)) {
        const fromBody = readErrorCode(err.response?.data);
        if (fromBody) return fromBody;
        if (err.response?.status === 404) return "CONVERSATION_NOT_FOUND";
    }
    if (err != null && typeof err === "object") {
        return readErrorCode(err);
    }
    return "";
}

function readErrorCode(data: unknown): string {
    if (data == null || typeof data !== "object") return "";
    const o = data as Record<string, unknown>;
    const code = String(o.code ?? "").trim();
    if (code) return code;
    const err = o.error;
    if (typeof err === "string") return err.trim();
    if (typeof err === "object" && err !== null) {
        return String((err as Record<string, unknown>).code ?? (err as Record<string, unknown>).message ?? "").trim();
    }
    return "";
}

/** Réponse helper ou détail conversation : conversation inexistante / hors périmètre. */
export function isConversationNotFoundError(err: unknown): boolean {
    if (isAxiosError(err)) {
        const code = readErrorCode(err.response?.data);
        if (code === "CONVERSATION_NOT_FOUND") return true;
        if (err.response?.status === 404) return true;
    }
    if (err != null && typeof err === "object") {
        const code = readErrorCode(err);
        if (code === "CONVERSATION_NOT_FOUND") return true;
    }
    return false;
}
